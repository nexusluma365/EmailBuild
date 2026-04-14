import { getToken } from "next-auth/jwt";
import { extractReferralRows, upsertContacts } from "@/lib/campaigns";
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
  const payload = await fetchReferralPayload();
  const rows = extractReferralRows(payload);

  if (!rows.length) {
    throw new Error(
      "Referral source returned no rows. Your current Apps Script only writes data; it needs a read endpoint that returns rows as JSON."
    );
  }

  const { imported } = await upsertContacts(userEmail, rows, "referral");
  return { importedCount: imported.length };
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
