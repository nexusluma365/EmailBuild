import { getToken } from "next-auth/jwt";
import {
  extractReferralRows,
  sendCampaignToContacts,
  upsertReferralContacts,
} from "@/lib/campaigns";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

async function getAuthorizedUserEmail(req) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization") || "";

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    const ownerEmail = process.env.AUTOMATION_OWNER_EMAIL;
    if (!ownerEmail) {
      throw new Error("AUTOMATION_OWNER_EMAIL is required for cron sync.");
    }
    return ownerEmail;
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.email) {
    throw new Error("Unauthorized");
  }

  return token.email;
}

async function fetchReferralPayload() {
  const url = process.env.REFERRAL_SOURCE_URL;
  if (!url) {
    throw new Error("REFERRAL_SOURCE_URL is not configured.");
  }

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Referral source returned ${response.status}.`);
  }

  return response.json();
}

async function runSync(req) {
  const userEmail = await getAuthorizedUserEmail(req);
  const supabase = getSupabaseAdmin();
  const payload = await fetchReferralPayload();
  const rows = extractReferralRows(payload);

  if (!rows.length) {
    throw new Error(
      "Referral source returned no rows. Your current Apps Script only writes data; it needs a read endpoint that returns rows as JSON."
    );
  }

  const { imported } = await upsertReferralContacts(userEmail, rows);

  const { data: campaigns, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("owner_email", userEmail)
    .eq("automation_enabled", true)
    .eq("auto_send_on_import", true)
    .eq("status", "active");

  if (error) throw error;

  const automation = [];
  for (const campaign of campaigns || []) {
    const results = imported.length
      ? await sendCampaignToContacts(campaign, imported)
      : [];

    await supabase
      .from("campaigns")
      .update({
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", campaign.id);

    automation.push({
      campaignId: campaign.id,
      campaignName: campaign.name,
      results,
    });
  }

  return { importedCount: imported.length, automation };
}

export async function POST(req) {
  try {
    const result = await runSync(req);
    return Response.json(result);
  } catch (error) {
    const status = error.message === "Unauthorized" ? 401 : 500;
    return Response.json({ error: error.message }, { status });
  }
}

export async function GET(req) {
  return POST(req);
}
