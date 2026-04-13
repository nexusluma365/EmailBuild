/**
 * Builds a base64url-encoded RFC 2822 MIME message and sends it via the Gmail API.
 */
export async function sendGmailMessage({ accessToken, to, subject, html, fromName, fromEmail }) {
  const raw = buildRawMessage({ to, subject, html, fromName, fromEmail });

  const response = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    const msg = data?.error?.message || `Gmail API error ${response.status}`;
    throw new Error(msg);
  }

  return data; // { id, threadId, labelIds }
}

function buildRawMessage({ to, subject, html, fromName, fromEmail }) {
  const safeFromName = fromName ? encodeHeaderValue(fromName) : "";
  const safeSubject = encodeHeaderValue(subject || "");
  const from = safeFromName ? `${safeFromName} <${sanitizeHeaderLine(fromEmail)}>` : sanitizeHeaderLine(fromEmail);

  // RFC 2822 message headers + HTML body
  const lines = [
    `From: ${from}`,
    `To: ${sanitizeHeaderLine(to)}`,
    `Subject: ${safeSubject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=utf-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
    // chunk the base64 body at 76 chars per line (RFC 2045)
    ...chunkBase64(Buffer.from(html, "utf-8").toString("base64")),
  ];

  const raw = lines.join("\r\n");

  // Gmail requires base64url encoding (not standard base64)
  return Buffer.from(raw)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function chunkBase64(b64, size = 76) {
  const chunks = [];
  for (let i = 0; i < b64.length; i += size) {
    chunks.push(b64.slice(i, i + size));
  }
  return chunks;
}

function sanitizeHeaderLine(value) {
  return String(value || "").replace(/[\r\n]+/g, " ").trim();
}

function encodeHeaderValue(value) {
  const sanitized = sanitizeHeaderLine(value);
  if (!sanitized) return "";

  // ASCII-only values can be emitted directly.
  if (/^[\x20-\x7E]*$/.test(sanitized)) {
    return sanitized;
  }

  return `=?UTF-8?B?${Buffer.from(sanitized, "utf8").toString("base64")}?=`;
}
