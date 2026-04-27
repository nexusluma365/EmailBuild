const GMAIL_SEND_TIMEOUT_MS = 20000;
const GMAIL_SEND_ATTEMPTS = 3;

/**
 * Builds a base64url-encoded RFC 2822 MIME message and sends it via the Gmail API.
 */
export async function sendGmailMessage({ accessToken, to, subject, html, fromName, fromEmail }) {
  const raw = buildRawMessage({ to, subject, html, fromName, fromEmail });

  let lastError;

  for (let attempt = 1; attempt <= GMAIL_SEND_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GMAIL_SEND_TIMEOUT_MS);

    try {
      const response = await fetch(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ raw }),
          signal: controller.signal,
        }
      );

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        return data; // { id, threadId, labelIds }
      }

      const msg = data?.error?.message || `Gmail API error ${response.status}`;
      const retryable =
        response.status === 429 ||
        response.status >= 500 ||
        /rate limit|quota|backend|timeout|temporarily/i.test(msg);

      if (!retryable || attempt === GMAIL_SEND_ATTEMPTS) {
        throw new Error(msg);
      }

      lastError = new Error(msg);
    } catch (error) {
      const message =
        error?.name === "AbortError"
          ? "Gmail request timed out. Please try again."
          : error?.message || "Failed to send email.";
      lastError = new Error(message);

      if (
        attempt === GMAIL_SEND_ATTEMPTS ||
        /insufficient authentication scopes|invalid credentials|unauthorized/i.test(message)
      ) {
        throw lastError;
      }
    } finally {
      clearTimeout(timeoutId);
    }

    await sleep(500 * attempt);
  }

  throw lastError || new Error("Failed to send email.");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
