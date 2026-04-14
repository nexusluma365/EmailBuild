import { getToken } from "next-auth/jwt";
import { sendGmailMessage } from "@/lib/gmail";
import { refreshGoogleAccessToken } from "@/lib/googleAuth";

export const runtime = "nodejs";

export async function POST(req) {
  let token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (token?.accessToken && token?.expiresAt && Date.now() >= token.expiresAt * 1000) {
    token = await refreshGoogleAccessToken(token);
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

  const { to, subject, html } = body;

  if (!to || !subject || !html) {
    return Response.json(
      { error: "Missing required fields: to, subject, html." },
      { status: 400 }
    );
  }

  try {
    const result = await sendGmailMessage({
      accessToken: token.accessToken,
      to,
      subject,
      html,
      fromName: token.name || "",
      fromEmail: token.email || "",
    });

    return Response.json({ success: true, messageId: result.id });
  } catch (err) {
    console.error("Gmail send error:", err);

    const message = err?.message || "Failed to send email.";
    if (/insufficient authentication scopes/i.test(message)) {
      return Response.json(
        { error: "Google account is missing Gmail send permission. Please sign out and reconnect Google." },
        { status: 401 }
      );
    }

    return Response.json(
      { error: message },
      { status: 500 }
    );
  }
}
