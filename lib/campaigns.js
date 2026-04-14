import { buildEmailHtmlFromBlocks } from "@/lib/emailTemplate";
import { sendGmailMessage } from "@/lib/gmail";
import { getUsableGoogleAccessToken } from "@/lib/googleConnections";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const DEFAULT_WEEKLY_DAYS = [1];
const DEFAULT_TWICE_WEEKLY_DAYS = [1, 4];

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function normalizeContactRecord(input, source = "manual") {
  const row = input || {};

  const firstName =
    row.first_name || row.firstName || row.referralFirstName || "";

  const lastName =
    row.last_name || row.lastName || row.referralLastName || "";

  const email = normalizeEmail(
    row.email || row.Email || row.referralEmail || row.referral_email || ""
  );

  const businessName =
    row.business_name || row.businessName || row.company || "";

  const fullName =
    row.full_name ||
    row.name ||
    [firstName, lastName].filter(Boolean).join(" ").trim();

  return {
    first_name: String(firstName).trim(),
    last_name: String(lastName).trim(),
    full_name: String(fullName).trim(),
    email,
    business_name: String(businessName).trim(),
    source,
    source_ref:
      row.id ||
      row.timestamp ||
      row.Timestamp ||
      `${email}::${String(businessName).trim()}`,
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

export async function upsertContacts(ownerEmail, rows = [], source = "manual") {
  const supabase = getSupabaseAdmin();

  const normalized = rows
    .map((row) => normalizeContactRecord(row, source))
    .filter((row) => row.email);

  if (!normalized.length) {
    return { imported: [], all: [] };
  }

  // Dedupe before upsert so Postgres doesn't try to update
  // the same (owner_email, email) row twice in one statement.
  const dedupedMap = new Map();

  for (const row of normalized) {
    const email = normalizeEmail(row.email);
    if (!email) continue;

    dedupedMap.set(email, {
      ...row,
      email,
    });
  }

  const deduped = Array.from(dedupedMap.values());

  const emails = deduped.map((row) => row.email);

  const { data: existing, error: existingError } = await supabase
    .from("contacts")
    .select("email")
    .eq("owner_email", ownerEmail)
    .in("email", emails);

  if (existingError) throw existingError;

  const existingEmails = new Set(
    (existing || []).map((row) => normalizeEmail(row.email))
  );

  const payload = deduped.map((row) => ({
    owner_email: ownerEmail,
    ...row,
    status: "active",
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from("contacts").upsert(payload, {
    onConflict: "owner_email,email",
  });

  if (error) throw error;

  const imported = deduped.filter((row) => !existingEmails.has(row.email));

  return {
    imported,
    all: deduped,
  };
}

export async function getCampaignContacts(campaign) {
  const supabase = getSupabaseAdmin();

  let query = supabase
    .from("contacts")
    .select("id,email,first_name,last_name,full_name,business_name")
    .eq("owner_email", campaign.owner_email)
    .eq("status", "active");

  if (campaign.recipient_mode === "selected") {
    const ids = campaign.selected_contact_ids || [];
    if (!ids.length) return [];
    query = query.in("id", ids);
  }

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;
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

  for (const contact of contacts) {
    try {
      await sendGmailMessage({
        accessToken,
        to: contact.email,
        subject: campaign.subject,
        html,
        fromName: campaign.owner_email,
        fromEmail: campaign.owner_email,
      });

      results.push({
        email: contact.email,
        status: "sent",
      });
    } catch (error) {
      results.push({
        email: contact.email,
        status: "error",
        error: error?.message || "Failed to send campaign.",
      });
    }
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

  await supabase
    .from("campaigns")
    .update({
      last_sent_at: new Date().toISOString(),
      next_run_at: nextRunAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", campaign.id);

  return results;
}

export function normalizeScheduleConfig(config = {}) {
  const frequency = config.frequency || "manual";

  const intervalHours = Math.max(
    1,
    Number(config.intervalHours || config.interval_hours || 24)
  );

  const weeklyDays = Array.isArray(config.weeklyDays)
    ? config.weeklyDays.map(Number).filter(Number.isInteger)
    : Array.isArray(config.weekly_days)
      ? config.weekly_days.map(Number).filter(Number.isInteger)
      : frequency === "twice_weekly"
        ? DEFAULT_TWICE_WEEKLY_DAYS
        : DEFAULT_WEEKLY_DAYS;

  const startAt = config.startAt || config.start_at || new Date().toISOString();

  return {
    frequency,
    intervalHours,
    weeklyDays: weeklyDays.length
      ? weeklyDays
      : frequency === "twice_weekly"
        ? DEFAULT_TWICE_WEEKLY_DAYS
        : DEFAULT_WEEKLY_DAYS,
    startAt,
  };
}

export function computeNextRunAt(config = {}, fromDate = new Date()) {
  const schedule = normalizeScheduleConfig(config);
  const now = new Date(fromDate);
  const startAt = new Date(schedule.startAt || now.toISOString());

  if (schedule.frequency === "manual") return null;

  if (schedule.frequency === "hourly_interval") {
    if (startAt > now) return startAt.toISOString();

    return new Date(
      now.getTime() + schedule.intervalHours * 60 * 60 * 1000
    ).toISOString();
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
    return next.toISOString();
  }

  if (schedule.frequency === "weekly" || schedule.frequency === "twice_weekly") {
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
        return next.toISOString();
      }
    }
  }

  if (schedule.frequency === "monthly") {
    const next = new Date(now);
    next.setMonth(next.getMonth() + 1);
    next.setHours(
      startAt.getHours(),
      startAt.getMinutes(),
      startAt.getSeconds(),
      0
    );
    return next.toISOString();
  }

  return null;
}
