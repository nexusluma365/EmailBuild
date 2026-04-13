import { getServerSession } from "next-auth";
import { getToken } from "next-auth/jwt";
import { authOptions } from "@/lib/auth";
import { sendGmailMessage } from "@/lib/gmail";

export async function POST(req) {
  const session = await getServerSession(authOptions);
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!session || !token?.accessToken) {
    return Response.json({ error: "Not authenticated. Please sign in." }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { to, subject, html } = body;

  if (!to || !subject || !html) {
    return Response.json({ error: "Missing required fields: to, subject, html." }, { status: 400 });
  }

  try {
    const result = await sendGmailMessage({
      accessToken: token.accessToken,
      to,
      subject,
      html,
      fromName: session.user?.name || "",
      fromEmail: session.user?.email || "",
    });

    return Response.json({ success: true, messageId: result.id });
  } catch (err) {
    console.error("Gmail send error:", err);
    return Response.json({ error: err.message || "Failed to send email." }, { status: 500 });
  }
}
