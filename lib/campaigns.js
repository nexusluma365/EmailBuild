import { buildEmailHtmlFromBlocks } from "@/lib/emailTemplate";
import { extractEmailFromRecord, extractNameFromRecord } from "@/lib/contactImport";
import { sendGmailMessage } from "@/lib/gmail";
import { getUsableGoogleAccessToken } from "@/lib/googleConnections";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const DEFAULT_WEEKLY_DAYS = [1];
const DEFAULT_TWICE_WEEKLY_DAYS = [1, 4];
const CAMPAIGN_SEND_BATCH_SIZE = 5;
export const FOLLOWUP_CONTACT_SOURCE = "followup_gscript";
export const FOLLOWUP_CAMPAIGN_TYPE = "subscriber_followup";

export function normalizeContactRecord(input, source = "manual") {
  const row = input || {};
  const firstName =
    row.first_name || row.firstName || row.referralFirstName || row["First Name"] || "";
  const lastName =
    row.last_name || row.lastName || row.referralLastName || row["Last Name"] || "";
  const email = extractEmailFromRecord(row);
  const businessName =
    row.business_name || row.businessName || row.company || "";
  const fullName = extractNameFromRecord(row) || [firstName, lastName].filter(Boolean).join(" ").trim();

  return {
    first_name: String(firstName).trim(),
    last_name: String(lastName).trim(),
    full_name: String(fullName).trim(),
    email: String(email).trim().toLowerCase(),
    business_name: String(businessName).trim(),
    source,
    source_ref:
      row.id ||
      row.timestamp ||
      row.Timestamp ||
      `${String(email).trim().toLowerCase()}::${String(businessName).trim()}`,
    metadata: row,
  };
}

export function extractReferralRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.referrals)) return payload.referrals;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

export function extractFollowupRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.followups)) return payload.followups;
  if (Array.isArray(payload?.contacts)) return payload.contacts;
  if (Array.isArray(payload?.leads)) return payload.leads;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

export async function upsertContacts(ownerEmail, rows = [], source = "manual") {
  const supabase = getSupabaseAdmin();
  const normalized = rows
    .map((row) => normalizeContactRecord(row, source))
    .filter((row) => row.email);

  if (!normalized.length) {
    return { imported: [], all: [] };
  }

  const emails = normalized.map((row) => row.email);
  const { data: existing, error: existingError } = await supabase
    .from("contacts")
    .select("email")
    .eq("owner_email", ownerEmail)
    .in("email", emails);

  if (existingError) throw existingError;

  const existingEmails = new Set((existing || []).map((row) => row.email));
  const payload = normalized.map((row) => ({
    owner_email: ownerEmail,
    ...row,
    status: "active",
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from("contacts").upsert(payload, {
    onConflict: "owner_email,email",
  });
  if (error) throw error;

  const imported = normalized.filter((row) => !existingEmails.has(row.email));
  return { imported, all: normalized };
}

export async function getCampaignContacts(campaign) {
  const supabase = getSupabaseAdmin();
  const selectedIds =
    campaign.recipient_mode === "selected"
      ? campaign.selected_contact_ids || []
      : [];

  let query = supabase
    .from("contacts")
    .select("id,email,first_name,last_name,full_name,business_name")
    .eq("owner_email", campaign.owner_email)
    .eq("status", "active");

  if (campaign.recipient_mode === "selected") {
    if (!selectedIds.length) return [];
    query = query.in("id", selectedIds);
  } else if (
    campaign.audience_source &&
    campaign.audience_source !== "contacts" &&
    campaign.audience_source !== FOLLOWUP_CONTACT_SOURCE &&
    campaign.schedule_config?.campaignType !== FOLLOWUP_CAMPAIGN_TYPE
  ) {
    query = query.eq("source", campaign.audience_source);
  } else {
    query = query.neq("source", FOLLOWUP_CONTACT_SOURCE);
  }

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;
  if (selectedIds.length) {
    const order = new Map(selectedIds.map((id, index) => [id, index]));
    return (data || []).sort(
      (a, b) => (order.get(a.id) ?? 999999) - (order.get(b.id) ?? 999999)
    );
  }
  return data || [];
}

export async function sendCampaignToContacts(campaign, contacts = []) {
  const supabase = getSupabaseAdmin();
  const accessToken = await getUsableGoogleAccessToken(campaign.owner_email);
  const html = buildEmailHtmlFromBlocks(
    campaign.blocks || [],
    campaign.global_styles || {}
  );

  const results = [];

  for (let i = 0; i < contacts.length; i += CAMPAIGN_SEND_BATCH_SIZE) {
    const batch = contacts.slice(i, i + CAMPAIGN_SEND_BATCH_SIZE);
    const batchResults = await Promise.all(batch.map(async (contact) => {
      try {
        await sendGmailMessage({
          accessToken,
          to: contact.email,
          subject: campaign.subject,
          html,
          fromName: campaign.owner_email,
          fromEmail: campaign.owner_email,
        });

        return { email: contact.email, status: "sent" };
      } catch (error) {
        return {
          email: contact.email,
          status: "error",
          error: error?.message || "Failed to send campaign.",
        };
      }
    }));

    results.push(...batchResults);
  }

  const deliveries = results.map((result) => ({
    campaign_id: campaign.id,
    email: result.email,
    subject: campaign.subject,
    status: result.status,
    error: result.error || null,
    sent_at: result.status === "sent" ? new Date().toISOString() : null,
  }));

  if (deliveries.length) {
    await supabase.from("campaign_deliveries").insert(deliveries);
  }

  const nextRunAt = campaign.schedule_enabled
    ? computeNextRunAt(campaign.schedule_config || {}, new Date())
    : null;
  const scheduleEnded = campaign.schedule_enabled && !nextRunAt;

  await supabase
    .from("campaigns")
    .update({
      last_sent_at: new Date().toISOString(),
      next_run_at: nextRunAt,
      schedule_enabled: scheduleEnded ? false : campaign.schedule_enabled,
      status: scheduleEnded ? "draft" : campaign.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", campaign.id);

  return results;
}

export function normalizeScheduleConfig(config = {}) {
  const frequency = config.frequency || "manual";
  const intervalDays = Math.max(
    1,
    Number(config.intervalDays || config.interval_days || 1)
  );
  const intervalHours = Math.max(
    1,
    Number(config.intervalHours || config.interval_hours || intervalDays * 24)
  );
  const weeklyDays = Array.isArray(config.weeklyDays)
    ? config.weeklyDays.map(Number).filter(Number.isInteger)
    : Array.isArray(config.weekly_days)
      ? config.weekly_days.map(Number).filter(Number.isInteger)
      : frequency === "twice_weekly"
        ? DEFAULT_TWICE_WEEKLY_DAYS
        : DEFAULT_WEEKLY_DAYS;
  const startAt = config.startAt || config.start_at || new Date().toISOString();
  const stopAt = config.stopAt || config.stop_at || "";

  return {
    frequency,
    campaignType: config.campaignType || config.campaign_type || "",
    templateId: config.templateId || config.template_id || "",
    intervalDays,
    intervalHours,
    weeklyDays: weeklyDays.length
      ? weeklyDays
      : frequency === "twice_weekly"
        ? DEFAULT_TWICE_WEEKLY_DAYS
        : DEFAULT_WEEKLY_DAYS,
    startAt,
    stopAt,
  };
}

export function computeNextRunAt(config = {}, fromDate = new Date()) {
  const schedule = normalizeScheduleConfig(config);
  const now = new Date(fromDate);
  const startAt = new Date(schedule.startAt || now.toISOString());
  const stopAt = schedule.stopAt ? new Date(schedule.stopAt) : null;

  const withinStopDate = (date) => {
    if (!stopAt || Number.isNaN(stopAt.getTime())) return true;
    return date <= stopAt;
  };

  const returnIfAllowed = (date) => {
    if (!date || !withinStopDate(date)) return null;
    return date.toISOString();
  };

  if (schedule.frequency === "manual") return null;

  if (schedule.frequency === "hourly_interval") {
    if (startAt > now) return returnIfAllowed(startAt);
    const intervalMs = schedule.intervalHours * 60 * 60 * 1000;
    const elapsed = now.getTime() - startAt.getTime();
    const intervalsElapsed = Math.floor(elapsed / intervalMs) + 1;
    const next = new Date(startAt.getTime() + intervalsElapsed * intervalMs);
    return returnIfAllowed(next);
  }

  if (schedule.frequency === "daily") {
    const next = new Date(now);
    next.setHours(
      startAt.getHours(),
      startAt.getMinutes(),
      startAt.getSeconds(),
      0
    );
    if (next <= now) next.setDate(next.getDate() + 1);
    return returnIfAllowed(next);
  }

  if (
    schedule.frequency === "weekly" ||
    schedule.frequency === "twice_weekly"
  ) {
    const days = schedule.weeklyDays;
    const currentDay = now.getDay();

    for (let offset = 0; offset < 14; offset += 1) {
      const next = new Date(now);
      next.setDate(now.getDate() + offset);
      if (!days.includes(next.getDay())) continue;
      next.setHours(
        startAt.getHours(),
        startAt.getMinutes(),
        startAt.getSeconds(),
        0
      );
      if (next > now && (offset > 0 || next.getDay() !== currentDay || next > now)) {
        return returnIfAllowed(next);
      }
    }
  }

  return null;
}

export function hasScheduleEnded(config = {}, fromDate = new Date()) {
  const schedule = normalizeScheduleConfig(config);
  if (!schedule.stopAt) return false;
  const stopAt = new Date(schedule.stopAt);
  if (Number.isNaN(stopAt.getTime())) return false;
  return new Date(fromDate) > stopAt;
}
