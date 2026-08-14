const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

const EMAIL_HEADER_RE = /^(e-?mail|email address|lead email|subscriber email)$/i;
const NAME_HEADER_RE = /^(name|full name|lead name|customer name)$/i;
const FIRST_NAME_HEADER_RE = /^(first name|firstname|lead first name)$/i;
const LAST_NAME_HEADER_RE = /^(last name|lastname|lead last name)$/i;

export function extractEmailFromValue(value) {
  const match = String(value || "").match(EMAIL_RE);
  return match?.[0]?.toLowerCase() || "";
}

export function extractEmailFromRecord(record = {}) {
  const direct =
    record.email ||
    record.Email ||
    record.emailAddress ||
    record.email_address ||
    record.leadEmail ||
    record.lead_email ||
    record.referralEmail ||
    record.referral_email ||
    "";
  const directEmail = extractEmailFromValue(direct);
  if (directEmail) return directEmail;

  for (const value of Object.values(record || {})) {
    const found = extractEmailFromValue(value);
    if (found) return found;
  }

  return "";
}

export function extractNameFromRecord(record = {}) {
  const firstName =
    record.first_name ||
    record.firstName ||
    record["First Name"] ||
    record.firstname ||
    "";
  const lastName =
    record.last_name ||
    record.lastName ||
    record["Last Name"] ||
    record.lastname ||
    "";
  const fullName =
    record.full_name ||
    record.fullName ||
    record.name ||
    record.Name ||
    record["Full Name"] ||
    record.leadName ||
    record.customerName ||
    [firstName, lastName].filter(Boolean).join(" ");

  return String(fullName || "").trim();
}

export function parseDelimitedText(text = "") {
  const normalized = String(text || "").replace(/^\uFEFF/, "");
  const delimiter = detectDelimiter(normalized);
  const rows = [];
  let cell = "";
  let row = [];
  let inQuotes = false;

  for (let i = 0; i < normalized.length; i += 1) {
    const char = normalized[i];
    const next = normalized[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === delimiter) {
      row.push(cell.trim());
      cell = "";
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

export function contactsFromDelimitedText(text = "") {
  const rows = parseDelimitedText(text);
  if (!rows.length) return [];

  const headers = rows[0].map((cell) => String(cell || "").trim());
  const hasHeader = headers.some((header) => EMAIL_HEADER_RE.test(header));
  const bodyRows = hasHeader ? rows.slice(1) : rows;

  return dedupeContacts(
    bodyRows
      .map((row) => {
        const record = hasHeader ? rowToRecord(headers, row) : {};
        const email = hasHeader
          ? extractEmailFromRecord(record)
          : row.map(extractEmailFromValue).find(Boolean) || "";
        if (!email) return null;

        const emailIndex = row.findIndex((cell) => extractEmailFromValue(cell) === email);
        const fallbackName =
          emailIndex > 0 && !extractEmailFromValue(row[emailIndex - 1])
            ? row[emailIndex - 1]
            : "";
        const name = hasHeader ? extractNameFromRecord(record) : fallbackName;
        const parts = String(name || "").split(/\s+/).filter(Boolean);

        return {
          email,
          name,
          firstName: parts[0] || "",
          lastName: parts.slice(1).join(" "),
          metadata: hasHeader ? record : { row },
        };
      })
      .filter(Boolean)
  );
}

export function contactsFromPdfBytes(bytes) {
  const text = decodePdfBytes(bytes);
  const emails = Array.from(new Set((text.match(EMAIL_RE) || []).map((email) => email.toLowerCase())));
  return emails.map((email) => ({ email, name: "", firstName: "", lastName: "", metadata: { source: "pdf" } }));
}

function detectDelimiter(text) {
  const firstLine = String(text || "").split(/\r?\n/).find(Boolean) || "";
  const options = [",", "\t", ";"];
  return options
    .map((delimiter) => ({
      delimiter,
      count: firstLine.split(delimiter).length,
    }))
    .sort((a, b) => b.count - a.count)[0].delimiter;
}

function rowToRecord(headers, row) {
  return headers.reduce((record, header, index) => {
    const key = header || `Column ${index + 1}`;
    record[key] = row[index] || "";
    return record;
  }, {});
}

function dedupeContacts(contacts) {
  const seen = new Set();
  return contacts.filter((contact) => {
    if (!contact.email || seen.has(contact.email)) return false;
    seen.add(contact.email);
    return true;
  });
}

function decodePdfBytes(bytes) {
  const raw = new TextDecoder("latin1").decode(bytes);
  const literalStrings = Array.from(raw.matchAll(/\(([^()]*)\)/g))
    .map((match) => match[1])
    .join(" ");
  const hexStrings = Array.from(raw.matchAll(/<([0-9A-Fa-f\s]{8,})>/g))
    .map((match) => hexToText(match[1]))
    .join(" ");
  return `${raw} ${literalStrings} ${hexStrings}`.replace(/\\([()\\])/g, "$1");
}

function hexToText(value) {
  const clean = String(value || "").replace(/\s/g, "");
  let out = "";
  for (let i = 0; i < clean.length - 1; i += 2) {
    const code = parseInt(clean.slice(i, i + 2), 16);
    if (Number.isFinite(code) && code >= 32 && code <= 126) {
      out += String.fromCharCode(code);
    }
  }
  return out;
}
