import { buildEmailHtmlFromBlocks } from "@/lib/emailTemplate";
import { sendGmailMessage } from "@/lib/gmail";
import { getUsableGoogleAccessToken } from "@/lib/googleConnections";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export function normalizeReferralRecord(input) {
  const row = input || {};
  const firstName =
    row.referralFirstName || row.referral_first_name || row.firstName || "";
  const lastName =
    row.referralLastName || row.referral_last_name || row.lastName || "";
  const email =
    row.referralEmail || row.referral_email || row.email || row.Email || "";
  const businessName =
    row.businessName || row.business_name || row.company || "";

  return {
    first_name: String(firstName).trim(),
    last_name: String(lastName).trim(),
    full_name: [firstName, lastName].filter(Boolean).join(" ").trim(),
    email: String(email).trim().toLowerCase(),
    business_name: String(businessName).trim(),
    source: "referral",
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

export async function upsertReferralContacts(ownerEmail, referralRows = []) {
  const supabase = getSupabaseAdmin();
  const normalized = referralRows
    .map(normalizeReferralRecord)
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

      results.push({ email: contact.email, status: "sent" });
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

  await supabase
    .from("campaigns")
    .update({
      last_sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", campaign.id);

  return results;
}
