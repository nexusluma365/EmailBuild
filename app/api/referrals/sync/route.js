import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import { extractReferralRows, upsertContacts } from "@/lib/campaigns";

export const dynamic = "force-dynamic";

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function dedupeRowsByEmail(rows = []) {
  const map = new Map();

  for (const row of rows) {
    const email = normalizeEmail(
      row?.referralEmail || row?.email || row?.Email || row?.referral_email || ""
    );

    if (!email) continue;

    map.set(email, {
      ...row,
      referralEmail: email,
      email,
    });
  }

  return Array.from(map.values());
}

async function getAuthorizedUserEmail(request) {
  const authHeader = request.headers.get("authorization") || "";
  const expected = process.env.CRON_SECRET || "";

  if (expected && authHeader === `Bearer ${expected}`) {
    const ownerEmail = process.env.AUTOMATION_OWNER_EMAIL;
    if (!ownerEmail) {
      throw new Error("Missing AUTOMATION_OWNER_EMAIL");
    }
    return ownerEmail;
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token?.email) {
    throw new Error("Unauthorized");
  }

  return token.email;
}

export async function POST(request) {
  try {
    const referralSourceUrl = process.env.REFERRAL_SOURCE_URL;
    const ownerEmail = await getAuthorizedUserEmail(request);

    if (!referralSourceUrl) {
      return NextResponse.json(
        { error: "Missing REFERRAL_SOURCE_URL" },
        { status: 500 }
      );
    }

    const response = await fetch(referralSourceUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch referrals: ${response.status}` },
        { status: 500 }
      );
    }

    const payload = await response.json();
    const extractedRows = extractReferralRows(payload);
    const dedupedRows = dedupeRowsByEmail(extractedRows);

    if (!dedupedRows.length) {
      return NextResponse.json(
        {
          error:
            "Referral source returned no rows. Your current Apps Script only writes data; it needs a read endpoint that returns rows as JSON.",
        },
        { status: 500 }
      );
    }

    const result = await upsertContacts(ownerEmail, dedupedRows, "referral");

    return NextResponse.json({
      success: true,
      fetched: extractedRows.length,
      deduped: dedupedRows.length,
      imported: result.imported.length,
      totalProcessed: result.all.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || "Referral sync failed" },
      { status: error?.message === "Unauthorized" ? 401 : 500 }
    );
  }
}

export async function GET(request) {
  return POST(request);
}
