import { getToken } from "next-auth/jwt";
import {
  FOLLOWUP_CONTACT_SOURCE,
  extractFollowupRows,
  upsertContacts,
} from "@/lib/campaigns";

const DEFAULT_FOLLOWUP_SOURCE_URL =
  "https://script.google.com/macros/s/AKfycbzu780EmExH9d7m4M6i9mSnwABe6sHRnmrlUaoX_LsIZZ_hx9iKatyF2lM0cFrHV_nu/exec";

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

async function fetchFollowupPayload() {
  const baseUrl = process.env.FOLLOWUP_SOURCE_URL || DEFAULT_FOLLOWUP_SOURCE_URL;
  const url = new URL(baseUrl);
  if (!url.searchParams.has("action")) {
    url.searchParams.set("action", "followups");
  }

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Follow-up source returned ${response.status}.`);
  }

  return response.json();
}

async function runSync(req) {
  const userEmail = await getAuthorizedUserEmail(req);
  const payload = await fetchFollowupPayload();
  const rows = extractFollowupRows(payload);

  if (!rows.length) {
    throw new Error(
      "Follow-up source returned no rows. Update the Apps Script doGet to return Name and Email rows as JSON."
    );
  }

  const { imported, all } = await upsertContacts(
    userEmail,
    rows,
    FOLLOWUP_CONTACT_SOURCE
  );

  return {
    importedCount: imported.length,
    totalSynced: all.length,
  };
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
