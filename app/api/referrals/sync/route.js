import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import { extractReferralRows, upsertContacts } from "@/lib/campaigns";

export const dynamic = "force-dynamic";

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function dedupeReferralRows(rows = []) {
  const map = new Map();

  for (const row of rows) {
    const referralEmail = normalizeEmail(row?.referralEmail || "");

    // only use Referral Email
    if (!referralEmail) continue;

    if (!map.has(referralEmail)) {
      map.set(referralEmail, {
        referralFirstName: row?.referralFirstName || "",
        referralLastName: row?.referralLastName || "",
        referralEmail,
        businessName: row?.businessName || "",
      });
    }
  }

  return Array.from(map.values());
}

async function getAuthorizedOwnerEmail(request) {
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
    const ownerEmail = await getAuthorizedOwnerEmail(request);

    if (!referralSourceUrl) {
      return NextResponse.json(
        { error: "Missing REFERRAL_SOURCE_URL" },
        { status: 500 }
      );
    }

    if (!ownerEmail) {
      return NextResponse.json(
        { error: "Missing AUTOMATION_OWNER_EMAIL" },
        { status: 500 }
      );
    }

    const response = await fetch(referralSourceUrl, {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch referrals: ${response.status}` },
        { status: 500 }
      );
    }

    const payload = await response.json();
    const rawRows = extractReferralRows(payload);

    // only keep unique Referral Email rows
    const dedupedRows = dedupeReferralRows(rawRows);

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
      fetched: rawRows.length,
      dedupedReferralEmails: dedupedRows.length,
      imported: result.imported.length,
      importedCount: result.imported.length,
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
