"use client";
import { useState, useEffect } from "react";
import { buildEmailHtmlFromBlocks } from "@/lib/emailTemplate";

const SEND_BATCH_SIZE = 5;

function parseRecipientInput(value) {
  return String(value || "")
    .split(/[\n,;]+/)
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
    .filter((email, index, arr) => arr.indexOf(email) === index);
}

export default function SendPanel({ blocks, globalStyles, session }) {
  const [subs, setSubs] = useState([]);
  const [mode, setMode] = useState("campaign");
  const [testEmail, setTestEmail] = useState(session?.user?.email || "");
  const [results, setResults] = useState([]);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [contactsError, setContactsError] = useState("");

  useEffect(() => {
    fetch("/api/contacts")
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Failed to load subscribers.");
        const contacts = data.contacts || [];
        setSubs(contacts);
        setSelectedIds(contacts.map((contact) => contact.id));
        setContactsError("");
      })
      .catch((err) => setContactsError(err.message || "Failed to load subscribers."))
      .finally(() => setContactsLoading(false));
  }, []);

  const subjectBlock = blocks?.find((b) => b.type === "subject");
  const headlineBlock = blocks?.find((b) => b.type === "headline");
  const imageBlock = blocks?.find((b) => b.type === "image" && b.data?.src);
  const buttonBlock = blocks?.find((b) => b.type === "button");
  const subject = subjectBlock?.data?.text || "";
  const hasContent =
    blocks && blocks.some((b) => ["headline", "text", "image", "button", "columns"].includes(b.type));
  const isReady = subject && hasContent;

  async function sendBatch(recipients) {
    const html = buildEmailHtmlFromBlocks(blocks || [], globalStyles || {});
    const res = await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipients, subject, html }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Unknown error");
    return data.results || [];
  }

  async function handleSend() {
    if (!isReady) return;
    setDone(false);

    if (mode === "single") {
      const recipients = parseRecipientInput(testEmail);
      if (!recipients.length) return;
      setSending(true);
      setResults(recipients.map((email) => ({ email, status: "pending" })));

      for (let i = 0; i < recipients.length; i += SEND_BATCH_SIZE) {
        const batch = recipients.slice(i, i + SEND_BATCH_SIZE);
        const batchEmails = new Set(batch);
        setResults((prev) =>
          prev.map((row) => (batchEmails.has(row.email) ? { ...row, status: "sending" } : row))
        );

        try {
          const batchResults = await sendBatch(batch);
          const byEmail = new Map(batchResults.map((row) => [row.email, row]));
          setResults((prev) =>
            prev.map((row) => {
              const result = byEmail.get(row.email);
              if (!result) return row;
              return {
                ...row,
                status: result.status === "sent" ? "sent" : "error",
                message: result.message,
              };
            })
          );
        } catch (err) {
          setResults((prev) =>
            prev.map((row) =>
              batchEmails.has(row.email) ? { ...row, status: "error", message: err.message } : row
            )
          );
        }
      }

      setSending(false);
      setDone(true);
      return;
    }

    const selected = new Set(selectedIds);
    const audience = subs.filter((sub) => selected.has(sub.id));
    if (audience.length === 0) return;

    setSending(true);
    setResults(audience.map((s) => ({ email: s.email, name: s.full_name, status: "pending" })));

    for (let i = 0; i < audience.length; i += SEND_BATCH_SIZE) {
      const batch = audience.slice(i, i + SEND_BATCH_SIZE);
      const batchEmails = new Set(batch.map((sub) => sub.email));
      setResults((prev) =>
        prev.map((row) => (batchEmails.has(row.email) ? { ...row, status: "sending" } : row))
      );

      try {
        const batchResults = await sendBatch(batch.map((sub) => sub.email));
        const byEmail = new Map(batchResults.map((row) => [row.email, row]));
        setResults((prev) =>
          prev.map((row) => {
            const result = byEmail.get(row.email);
            if (!result) return row;
            return {
              ...row,
              status: result.status === "sent" ? "sent" : "error",
              message: result.message,
            };
          })
        );
      } catch (err) {
        setResults((prev) =>
          prev.map((row) => (batchEmails.has(row.email) ? { ...row, status: "error", message: err.message } : row))
        );
      }
    }

    setSending(false);
    setDone(true);
  }

  const sentCount = results.filter((r) => r.status === "sent").length;
  const errorCount = results.filter((r) => r.status === "error").length;
  const selectedCount = selectedIds.length;
  const allSelected = subs.length > 0 && selectedCount === subs.length;
  const partiallySelected = selectedCount > 0 && selectedCount < subs.length;
  const ACC = "#D05A2C";

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      <div style={{ width: 276, background: "#ffffff", borderRight: "1px solid #E5E0DA", display: "flex", flexDirection: "column", overflow: "hidden", flexShrink: 0 }}>
        <div style={{ display: "flex", borderBottom: "1px solid #E5E0DA" }}>
          {["single", "campaign"].map((t) => (
            <button
              key={t}
              onClick={() => {
                setMode(t);
                setResults([]);
                setDone(false);
              }}
              style={{
                flex: 1,
                padding: "12px 0",
                border: "none",
                background: "none",
                fontFamily: "inherit",
                fontSize: 12.5,
                fontWeight: 600,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                cursor: "pointer",
                color: mode === t ? ACC : "#9CA3AF",
                borderBottom: mode === t ? `2px solid ${ACC}` : "2px solid transparent",
                marginBottom: -1,
              }}
            >
              {t === "single" ? "Single Recipient" : "Audience"}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "14px 12px" }}>
          <div style={{ fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "#9CA3AF", marginBottom: 10 }}>Email Summary</div>
          <div style={{ background: "#FAFAF9", borderRadius: 8, border: "1px solid #EDE9E4", padding: "10px 12px", marginBottom: 16 }}>
            {[
              { label: "Subject", val: subject || "—" },
              { label: "Headline", val: headlineBlock?.data?.text?.slice(0, 40) || "—" },
              { label: "Image", val: imageBlock ? "✓ Included" : "—" },
              { label: "Button", val: buttonBlock ? `"${buttonBlock.data.text}"` : "—" },
              { label: "Blocks", val: `${blocks?.length || 0} total` },
            ].map(({ label, val }) => (
              <div key={label} style={{ display: "flex", gap: 8, marginBottom: 6, fontSize: 12 }}>
                <span style={{ color: "#9CA3AF", width: 60, flexShrink: 0 }}>{label}</span>
                <span style={{ color: "#1A1D2E", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{val}</span>
              </div>
            ))}
          </div>

          {mode === "single" ? (
            <>
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="recipient@example.com, second@example.com"
                className="field-input"
                style={{ marginBottom: 10 }}
                disabled={sending}
              />
              <SendBtn onClick={handleSend} disabled={!isReady || parseRecipientInput(testEmail).length === 0 || sending} sending={sending}>
                Send Email
              </SendBtn>
            </>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "#9CA3AF" }}>Subscribers</div>
                <span style={{ fontSize: 11, background: "#FDF3EE", color: ACC, borderRadius: 20, padding: "2px 8px", fontWeight: 600 }}>
                  {selectedCount}
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "#4B5563", flex: 1 }}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(node) => {
                      if (node) node.indeterminate = partiallySelected;
                    }}
                    onChange={(e) => {
                      setSelectedIds(e.target.checked ? subs.map((sub) => sub.id) : []);
                    }}
                    disabled={sending || contactsLoading || subs.length === 0}
                  />
                  Select all subscribers
                </label>
                {selectedCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedIds([])}
                    disabled={sending}
                    style={{ border: "none", background: "none", color: "#9CA3AF", fontSize: 11.5, cursor: sending ? "not-allowed" : "pointer", fontFamily: "inherit" }}
                  >
                    Clear
                  </button>
                )}
              </div>

              <div style={{ maxHeight: 220, overflowY: "auto", border: "1px solid #EDE9E4", borderRadius: 8, marginBottom: 12, background: "#FAFAF9" }}>
                {contactsLoading ? (
                  <div style={{ padding: "18px 12px", fontSize: 12, color: "#9CA3AF", textAlign: "center" }}>Loading subscribers…</div>
                ) : contactsError ? (
                  <div style={{ padding: "18px 12px", fontSize: 12, color: "#DC2626", textAlign: "center" }}>{contactsError}</div>
                ) : subs.length === 0 ? (
                  <div style={{ padding: "18px 12px", fontSize: 12, color: "#9CA3AF", textAlign: "center" }}>No subscribers yet</div>
                ) : subs.map((sub) => {
                  const checked = selectedIds.includes(sub.id);
                  return (
                    <label key={sub.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderBottom: "1px solid #F0EDE8", fontSize: 12 }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={sending}
                        onChange={(e) => {
                          setSelectedIds((prev) =>
                            e.target.checked
                              ? Array.from(new Set([...prev, sub.id]))
                              : prev.filter((id) => id !== sub.id)
                          );
                        }}
                      />
                      <span style={{ color: "#4B5563" }}>
                        {sub.full_name || sub.email} <span style={{ color: "#9CA3AF" }}>({sub.email})</span>
                      </span>
                    </label>
                  );
                })}
              </div>

              <SendBtn onClick={handleSend} disabled={!isReady || selectedCount === 0 || sending || contactsLoading} sending={sending}>
                Send to {selectedCount} Recipient{selectedCount !== 1 ? "s" : ""}
              </SendBtn>
            </>
          )}
        </div>
      </div>

      <div className="canvas-bg" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ height: 44, background: "#ffffff", borderBottom: "1px solid #E5E0DA", display: "flex", alignItems: "center", padding: "0 16px", gap: 12, flexShrink: 0 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.07em" }}>Send Results</span>
          {done && results.length > 0 && (
            <div style={{ display: "flex", gap: 10 }}>
              {sentCount > 0 && <span style={{ fontSize: 12, color: "#16A34A", fontWeight: 600 }}>✓ {sentCount} sent</span>}
              {errorCount > 0 && <span style={{ fontSize: 12, color: "#DC2626", fontWeight: 600 }}>✗ {errorCount} failed</span>}
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          {results.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "#9CA3AF", textAlign: "center", gap: 12 }}>
              <p style={{ fontSize: 13, color: "#C5B8AC", fontWeight: 500 }}>No emails sent yet</p>
            </div>
          ) : (
            <div style={{ background: "#ffffff", borderRadius: 10, border: "1px solid #E5E0DA", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#FAFAF9", borderBottom: "1px solid #EDE9E4" }}>
                    {["Recipient", "Status"].map((h) => (
                      <th key={h} style={{ textAlign: "left", padding: "9px 16px", fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "#9CA3AF" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, idx) => (
                    <tr key={r.email} style={{ borderBottom: idx < results.length - 1 ? "1px solid #F5F2EF" : "none" }}>
                      <td style={{ padding: "10px 16px" }}>
                        {r.name && <div style={{ fontSize: 12, fontWeight: 500, color: "#1A1D2E" }}>{r.name}</div>}
                        <div style={{ fontSize: 11.5, color: "#6B7280", fontFamily: "monospace" }}>{r.email}</div>
                        {r.message && <div style={{ fontSize: 11, color: "#DC2626", marginTop: 2 }}>{r.message}</div>}
                      </td>
                      <td style={{ padding: "10px 16px" }}><SBadge status={r.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SendBtn({ onClick, disabled, sending, children }) {
  const ACC = "#D05A2C";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%",
        padding: "9px 0",
        background: disabled ? "#EDE9E4" : ACC,
        color: disabled ? "#9CA3AF" : "#ffffff",
        border: "none",
        borderRadius: 6,
        fontSize: 12.5,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "inherit",
      }}
    >
      {sending ? "Sending…" : children}
    </button>
  );
}

function SBadge({ status }) {
  const cfg = {
    sent: { bg: "#F0FDF4", color: "#16A34A", border: "#86EFAC", l: "Sent" },
    error: { bg: "#FEF2F2", color: "#DC2626", border: "#FCA5A5", l: "Failed" },
    sending: { bg: "#FDF3EE", color: "#D05A2C", border: "#F0C4A8", l: "Sending…" },
    pending: { bg: "#F9FAFB", color: "#6B7280", border: "#E5E0DA", l: "Queued" },
  };
  const c = cfg[status] || cfg.pending;
  return <span style={{ display: "inline-block", padding: "3px 10px", background: c.bg, color: c.color, border: `1px solid ${c.border}`, borderRadius: 20, fontSize: 11.5, fontWeight: 600 }}>{c.l}</span>;
}
