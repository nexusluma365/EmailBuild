"use client";
import { useState, useEffect } from "react";

export default function Subscribers() {
  const [subs, setSubs] = useState([]);
  const [form, setForm] = useState({ name: "", email: "" });
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadSubscribers() {
    setLoading(true);
    const res = await fetch("/api/contacts");
    const data = await res.json();
    if (res.ok) {
      setSubs(data.contacts || []);
      setError("");
    } else {
      setError(data.error || "Failed to load subscribers.");
    }
    setLoading(false);
  }

  useEffect(() => {
    loadSubscribers();
  }, []);

  const add = async () => {
    setError("");
    setSuccess("");
    const email = form.email.trim().toLowerCase();
    const fullName = form.name.trim();
    if (!email) return setError("Email address is required.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return setError("Please enter a valid email address.");
    }

    const parts = fullName.split(/\s+/).filter(Boolean);
    const payload = {
      email,
      name: fullName,
      firstName: parts[0] || "",
      lastName: parts.slice(1).join(" "),
      source: "manual",
    };

    const res = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      return setError(data.error || "Failed to save subscriber.");
    }

    setForm({ name: "", email: "" });
    setSuccess("Subscriber added successfully.");
    setTimeout(() => setSuccess(""), 3000);
    loadSubscribers();
  };

  const remove = async (id) => {
    if (!window.confirm("Remove this subscriber?")) return;
    const res = await fetch(`/api/contacts/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      return setError(data.error || "Failed to remove subscriber.");
    }
    loadSubscribers();
  };

  const exportCsv = () => {
    const rows = [
      "Name,Email,Added,Source",
      ...subs.map(
        (s) =>
          `"${s.full_name || ""}","${s.email}","${new Date(
            s.created_at
          ).toLocaleDateString()}","${s.source || "manual"}"`
      ),
    ];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob([rows.join("\n")], { type: "text/csv" })
    );
    a.download = "subscribers.csv";
    a.click();
  };

  const importCsv = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const lines = String(ev.target.result || "").split("\n").slice(1);
      const contacts = [];
      for (const line of lines) {
        const cols = line
          .split(",")
          .map((c) => c.replace(/^"|"$/g, "").trim());
        const [name, email] = cols;
        if (
          email &&
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
          !contacts.some((contact) => contact.email === email.toLowerCase())
        ) {
          const parts = (name || "").split(/\s+/).filter(Boolean);
          contacts.push({
            email: email.toLowerCase(),
            name: name || "",
            firstName: parts[0] || "",
            lastName: parts.slice(1).join(" "),
          });
        }
      }

      if (!contacts.length) {
        alert("No new valid subscribers found.");
        return;
      }

      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contacts, source: "csv" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to import subscribers.");
        return;
      }
      setSuccess(`Imported ${data.imported.length} subscriber(s).`);
      setTimeout(() => setSuccess(""), 3000);
      loadSubscribers();
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const filtered = subs.filter(
    (s) =>
      s.email.includes(search.toLowerCase()) ||
      (s.full_name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      <div
        style={{
          width: 272,
          background: "#ffffff",
          borderRight: "1px solid #E5E0DA",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", borderBottom: "1px solid #E5E0DA" }}>
          <div
            style={{
              flex: 1,
              padding: "12px 0",
              textAlign: "center",
              fontSize: 12.5,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              color: "#D05A2C",
              borderBottom: "2px solid #D05A2C",
              marginBottom: -1,
            }}
          >
            List
          </div>
          <div
            style={{
              flex: 1,
              padding: "12px 0",
              textAlign: "center",
              fontSize: 12.5,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              color: "#9CA3AF",
              borderBottom: "2px solid transparent",
            }}
          >
            Import
          </div>
        </div>

        <div style={{ padding: "14px 12px", borderBottom: "1px solid #EDE9E4" }}>
          <div
            style={{
              fontSize: 10.5,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              color: "#9CA3AF",
              marginBottom: 10,
            }}
          >
            Add Subscriber
          </div>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Full name (optional)"
            className="field-input"
            style={{ marginBottom: 6 }}
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="email@example.com *"
            className="field-input"
            style={{ marginBottom: 8 }}
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <button onClick={add} style={primaryBtn}>
            Add Subscriber
          </button>
          {error && <div style={errorBox}>{error}</div>}
          {success && <div style={successBox}>{success}</div>}
        </div>

        <div
          style={{
            padding: "10px 12px",
            borderBottom: "1px solid #EDE9E4",
            display: "flex",
            gap: 6,
          }}
        >
          <label style={toolBtn}>
            Import CSV
            <input type="file" accept=".csv" onChange={importCsv} style={{ display: "none" }} />
          </label>
          {subs.length > 0 && (
            <button onClick={exportCsv} style={toolBtn}>
              Export
            </button>
          )}
        </div>

        <div style={{ padding: "10px 14px" }}>
          <StatPill label="Total" value={subs.length} color="#D05A2C" />
        </div>
      </div>

      <div className="canvas-bg" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ height: 44, background: "#ffffff", borderBottom: "1px solid #E5E0DA", display: "flex", alignItems: "center", padding: "0 16px", gap: 8, flexShrink: 0 }}>
          <div style={{ position: "relative", flex: 1, maxWidth: 360 }}>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search subscribers…"
              className="field-input"
              style={{ paddingRight: 30 }}
            />
          </div>
          <span style={{ fontSize: 12, color: "#9CA3AF" }}>
            {filtered.length} of {subs.length} subscriber{subs.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: "20px" }}>
          <div style={{ background: "#ffffff", borderRadius: 10, border: "1px solid #E5E0DA", overflow: "hidden" }}>
            {loading ? (
              <div style={emptyBox}>Loading subscribers…</div>
            ) : filtered.length === 0 ? (
              <div style={emptyBox}>
                {subs.length === 0 ? "No subscribers yet" : "No results found"}
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#FAFAF9", borderBottom: "1px solid #EDE9E4" }}>
                    {["Name", "Email", "Source", "Added", ""].map((h, i) => (
                      <th
                        key={i}
                        style={{
                          textAlign: i === 4 ? "right" : "left",
                          padding: "10px 16px",
                          fontSize: 10.5,
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.07em",
                          color: "#9CA3AF",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((sub, idx) => (
                    <tr key={sub.id} style={{ borderBottom: idx < filtered.length - 1 ? "1px solid #F5F2EF" : "none" }}>
                      <td style={{ padding: "11px 16px", fontSize: 13, color: "#1A1D2E", fontWeight: 500 }}>
                        {sub.full_name || "—"}
                      </td>
                      <td style={{ padding: "11px 16px", fontSize: 12.5, color: "#4B5563", fontFamily: "monospace" }}>
                        {sub.email}
                      </td>
                      <td style={{ padding: "11px 16px", fontSize: 12, color: "#6B7280" }}>
                        {sub.source || "manual"}
                      </td>
                      <td style={{ padding: "11px 16px", fontSize: 12, color: "#9CA3AF" }}>
                        {new Date(sub.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: "11px 16px", textAlign: "right" }}>
                        <button onClick={() => remove(sub.id)} style={deleteBtn}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatPill({ label, value, color }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px", background: color + "18", borderRadius: 20 }}>
      <div style={{ width: 7, height: 7, borderRadius: "50%", background: color }} />
      <span style={{ fontSize: 11, fontWeight: 600, color }}>{value}</span>
      <span style={{ fontSize: 11, color: "#9CA3AF" }}>{label}</span>
    </div>
  );
}

const primaryBtn = {
  width: "100%",
  padding: "7px 0",
  background: "#D05A2C",
  color: "#ffffff",
  border: "none",
  borderRadius: 6,
  fontSize: 12.5,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
};

const toolBtn = {
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 5,
  padding: "6px 0",
  border: "1px solid #E5E0DA",
  borderRadius: 6,
  fontSize: 12,
  color: "#6B7280",
  cursor: "pointer",
  fontWeight: 500,
  background: "#FAFAF9",
  fontFamily: "inherit",
};

const deleteBtn = {
  border: "1px solid #FCA5A5",
  background: "#FEF2F2",
  color: "#DC2626",
  borderRadius: 6,
  padding: "6px 10px",
  cursor: "pointer",
  fontSize: 12,
  fontFamily: "inherit",
};

const errorBox = {
  marginTop: 8,
  padding: "6px 10px",
  background: "#FEF2F2",
  border: "1px solid #FCA5A5",
  borderRadius: 6,
  fontSize: 12,
  color: "#DC2626",
};

const successBox = {
  marginTop: 8,
  padding: "6px 10px",
  background: "#F0FDF4",
  border: "1px solid #86EFAC",
  borderRadius: 6,
  fontSize: 12,
  color: "#16A34A",
};

const emptyBox = {
  padding: "60px 20px",
  textAlign: "center",
  color: "#9CA3AF",
  fontSize: 13,
};
