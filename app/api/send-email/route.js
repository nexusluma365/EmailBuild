import { getToken } from "next-auth/jwt";
import { sendGmailMessage } from "@/lib/gmail";
import { refreshGoogleAccessToken } from "@/lib/googleAuth";
import { persistGoogleConnection } from "@/lib/googleConnections";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_RECIPIENTS_PER_REQUEST = 5;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req) {
  let token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (token?.accessToken && token?.expiresAt && Date.now() >= token.expiresAt * 1000) {
    token = await refreshGoogleAccessToken(token);
    if (token?.accessToken && !token?.error) {
      await persistGoogleConnection({
        userEmail: token.email,
        userName: token.name,
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        expiresAt: token.expiresAt,
      });
    }
  }

  if (!token?.accessToken) {
    return Response.json(
      { error: "No Google access token found. Please sign out and reconnect Google." },
      { status: 401 }
    );
  }

  if (token?.error === "RefreshAccessTokenError") {
    return Response.json(
      { error: "Google session expired. Please sign out and reconnect Google." },
      { status: 401 }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { to, recipients, subject, html } = body;
  const recipientEmails = normalizeRecipients(recipients || to);

  if (!recipientEmails.length || !subject || !html) {
    return Response.json(
      { error: "Missing required fields: recipients, subject, html." },
      { status: 400 }
    );
  }

  if (recipientEmails.length > MAX_RECIPIENTS_PER_REQUEST) {
    return Response.json(
      { error: `Send ${MAX_RECIPIENTS_PER_REQUEST} recipients or fewer per request.` },
      { status: 400 }
    );
  }

  const results = await Promise.all(recipientEmails.map(async (recipient) => {
    try {
      if (!EMAIL_RE.test(recipient)) {
        throw new Error("Invalid email address.");
      }

      const result = await sendGmailMessage({
        accessToken: token.accessToken,
        to: recipient,
        subject,
        html,
        fromName: token.name || "",
        fromEmail: token.email || "",
      });

      return { email: recipient, status: "sent", messageId: result.id };
    } catch (err) {
      console.error("Gmail send error:", err);

      const message = normalizeSendError(err);
      return { email: recipient, status: "error", message };
    }
  }));

  const failedAuth = results.find((row) =>
    /reconnect google|missing gmail send permission/i.test(row.message || "")
  );

  if (failedAuth && results.length === 1) {
    return Response.json({ error: failedAuth.message, results }, { status: 401 });
  }

  return Response.json({
    success: results.every((row) => row.status === "sent"),
    results,
    messageId: results[0]?.messageId,
  });
}

function normalizeRecipients(value) {
  const values = Array.isArray(value) ? value : [value];
  const seen = new Set();
  const normalized = [];

  for (const item of values) {
    const email =
      typeof item === "string"
        ? item
        : item?.email || item?.to || "";
    const clean = String(email).trim().toLowerCase();
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    normalized.push(clean);
  }

  return normalized;
}

function normalizeSendError(err) {
  const message = err?.message || "Failed to send email.";

  if (/insufficient authentication scopes/i.test(message)) {
    return "Google account is missing Gmail send permission. Please sign out and reconnect Google.";
  }

  if (/invalid credentials|unauthorized|invalid_grant/i.test(message)) {
    return "Google session expired. Please sign out and reconnect Google.";
  }

  return message;
}
