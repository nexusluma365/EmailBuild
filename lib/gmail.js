const GMAIL_SEND_TIMEOUT_MS = 12000;
const GMAIL_SEND_ATTEMPTS = 2;

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
  const { html: htmlWithCids, images } = extractInlineImages(html);

  if (images.length) {
    const boundary = `email_studio_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const lines = [
      `From: ${from}`,
      `To: ${sanitizeHeaderLine(to)}`,
      `Subject: ${safeSubject}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/related; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/html; charset=utf-8`,
      `Content-Transfer-Encoding: base64`,
      ``,
      ...chunkBase64(Buffer.from(htmlWithCids, "utf-8").toString("base64")),
      ``,
      ...images.flatMap((image) => [
        `--${boundary}`,
        `Content-Type: ${image.contentType}`,
        `Content-Transfer-Encoding: base64`,
        `Content-ID: <${image.cid}>`,
        `Content-Disposition: inline; filename="${image.filename}"`,
        ``,
        ...chunkBase64(image.base64),
        ``,
      ]),
      `--${boundary}--`,
    ];

    return toBase64Url(lines.join("\r\n"));
  }

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

  return toBase64Url(lines.join("\r\n"));
}

function toBase64Url(raw) {
  // Gmail requires base64url encoding (not standard base64)
  return Buffer.from(raw)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function extractInlineImages(html) {
  const images = [];
  const updatedHtml = String(html || "").replace(
    /src=(["'])data:(image\/[a-zA-Z0-9.+-]+);base64,([^"']+)\1/g,
    (match, quote, contentType, base64) => {
      const cleanBase64 = String(base64 || "").replace(/\s/g, "");
      if (!cleanBase64) return match;
      const cid = `email-studio-image-${images.length + 1}@local`;
      images.push({
        cid,
        contentType,
        filename: `image-${images.length + 1}.${extensionForContentType(contentType)}`,
        base64: cleanBase64,
      });
      return `src=${quote}cid:${cid}${quote}`;
    }
  );

  return { html: updatedHtml, images };
}

function extensionForContentType(contentType) {
  if (/jpe?g/i.test(contentType)) return "jpg";
  if (/png/i.test(contentType)) return "png";
  if (/gif/i.test(contentType)) return "gif";
  if (/webp/i.test(contentType)) return "webp";
  return "bin";
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
