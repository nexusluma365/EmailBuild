"use client";

import { useEffect, useState } from "react";

export default function Campaigns({ blocks, globalStyles }) {
  const [campaigns, setCampaigns] = useState([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");

  const subject =
    blocks?.find((block) => block.type === "subject")?.data?.text || "";
  const hasDraft = Boolean(blocks?.length);

  async function loadCampaigns() {
    setLoading(true);
    const res = await fetch("/api/campaigns");
    const data = await res.json();
    if (res.ok) {
      setCampaigns(data.campaigns || []);
    } else {
      setMessage(data.error || "Failed to load campaigns.");
    }
    setLoading(false);
  }

  useEffect(() => {
    loadCampaigns();
  }, []);

  async function createCampaign() {
    if (!hasDraft) {
      setMessage("Build an email first, then create a campaign from that draft.");
      return;
    }

    setBusyId("create");
    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim() || subject || "Untitled Campaign",
        subject,
        blocks,
        globalStyles,
        status: "draft",
        audienceSource: "referrals",
      }),
    });
    const data = await res.json();
    setBusyId("");

    if (!res.ok) {
      setMessage(data.error || "Failed to create campaign.");
      return;
    }

    setCampaigns((prev) => [data.campaign, ...prev]);
    setName("");
    setMessage("Campaign created from the current draft.");
  }

  async function patchCampaign(id, patch, successMessage) {
    setBusyId(id);
    const res = await fetch(`/api/campaigns/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    setBusyId("");

    if (!res.ok) {
      setMessage(data.error || "Failed to update campaign.");
      return;
    }

    setCampaigns((prev) =>
      prev.map((campaign) => (campaign.id === id ? data.campaign : campaign))
    );
    setMessage(successMessage);
  }

  async function sendCampaign(id) {
    setBusyId(`send:${id}`);
    const res = await fetch(`/api/campaigns/${id}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ onlyNewReferrals: true }),
    });
    const data = await res.json();
    setBusyId("");

    if (!res.ok) {
      setMessage(data.error || "Failed to send campaign.");
      return;
    }

    const sent = (data.results || []).filter((row) => row.status === "sent").length;
    const failed = (data.results || []).filter((row) => row.status === "error").length;
    setMessage(`Campaign send complete: ${sent} sent, ${failed} failed.`);
    loadCampaigns();
  }

  async function syncReferrals() {
    setBusyId("sync");
    const res = await fetch("/api/referrals/sync", { method: "POST" });
    const data = await res.json();
    setBusyId("");

    if (!res.ok) {
      setMessage(data.error || "Failed to sync referrals.");
      return;
    }

    const automated = (data.automation || [])
      .map(
        (row) =>
          `${row.campaignName}: ${
            row.results.filter((result) => result.status === "sent").length
          } sent`
      )
      .join(" · ");

    setMessage(
      automated
        ? `Imported ${data.importedCount} referral contacts. Auto-send results: ${automated}`
        : `Imported ${data.importedCount} referral contacts.`
    );
    loadCampaigns();
  }

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      <div
        style={{
          width: 304,
          background: "#fff",
          borderRight: "1px solid #E5E0DA",
          padding: "16px 14px",
          overflowY: "auto",
          flexShrink: 0,
        }}
      >
        <SectionLabel>Create Campaign</SectionLabel>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={subject || "Campaign name"}
          className="field-input"
          style={{ marginBottom: 10 }}
        />
        <button
          onClick={createCampaign}
          disabled={!hasDraft || busyId === "create"}
          style={primaryButton(!hasDraft || busyId === "create")}
        >
          {busyId === "create" ? "Creating…" : "Save Current Draft as Campaign"}
        </button>

        <SectionLabel>Referral Sync</SectionLabel>
        <p style={smallText}>
          Pull referral contacts from your external source and import them into
          Supabase.
        </p>
        <button
          onClick={syncReferrals}
          disabled={busyId === "sync"}
          style={secondaryButton(busyId === "sync")}
        >
          {busyId === "sync" ? "Syncing…" : "Sync Referrals Now"}
        </button>

        {message && (
          <div
            style={{
              marginTop: 12,
              padding: "10px 12px",
              background: "#FAFAF9",
              border: "1px solid #E5E0DA",
              borderRadius: 8,
              fontSize: 12,
              color: "#4B5563",
              lineHeight: 1.5,
            }}
          >
            {message}
          </div>
        )}
      </div>

      <div className="canvas-bg" style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        {loading ? (
          <div style={emptyState}>Loading campaigns…</div>
        ) : campaigns.length === 0 ? (
          <div style={emptyState}>
            No campaigns yet. Build an email in the Builder tab, then save it
            here.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                style={{
                  background: "#fff",
                  border: "1px solid #E5E0DA",
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 12,
                    marginBottom: 12,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#1A1D2E" }}>
                      {campaign.name}
                    </div>
                    <div style={{ fontSize: 12, color: "#6B7280", marginTop: 4 }}>
                      Subject: {campaign.subject || "—"}
                    </div>
                    <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>
                      Status: {campaign.status} · Last sync:{" "}
                      {campaign.last_synced_at
                        ? new Date(campaign.last_synced_at).toLocaleString()
                        : "Never"}
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      patchCampaign(
                        campaign.id,
                        {
                          blocks,
                          global_styles: globalStyles,
                          subject,
                        },
                        "Campaign content updated from the current draft."
                      )
                    }
                    disabled={!hasDraft || busyId === campaign.id}
                    style={secondaryButton(!hasDraft || busyId === campaign.id)}
                  >
                    Use Current Draft
                  </button>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 16,
                    flexWrap: "wrap",
                    marginBottom: 14,
                  }}
                >
                  <Toggle
                    label="Active"
                    checked={campaign.status === "active"}
                    onChange={(checked) =>
                      patchCampaign(
                        campaign.id,
                        { status: checked ? "active" : "draft" },
                        checked ? "Campaign activated." : "Campaign set back to draft."
                      )
                    }
                  />
                  <Toggle
                    label="Automation"
                    checked={campaign.automation_enabled}
                    onChange={(checked) =>
                      patchCampaign(
                        campaign.id,
                        { automation_enabled: checked },
                        checked ? "Automation enabled." : "Automation disabled."
                      )
                    }
                  />
                  <Toggle
                    label="Auto-send on import"
                    checked={campaign.auto_send_on_import}
                    onChange={(checked) =>
                      patchCampaign(
                        campaign.id,
                        { auto_send_on_import: checked },
                        checked
                          ? "Campaign will send after referral sync."
                          : "Campaign will no longer auto-send after sync."
                      )
                    }
                  />
                </div>

                <button
                  onClick={() => sendCampaign(campaign.id)}
                  disabled={
                    busyId === `send:${campaign.id}` || campaign.status !== "active"
                  }
                  style={primaryButton(
                    busyId === `send:${campaign.id}` || campaign.status !== "active"
                  )}
                >
                  {busyId === `send:${campaign.id}`
                    ? "Sending…"
                    : "Send Campaign to Referral Contacts"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: 12.5,
        color: "#4B5563",
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

function SectionLabel({ children }) {
  return (
    <div
      style={{
        fontSize: 10.5,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.07em",
        color: "#9CA3AF",
        marginBottom: 8,
        marginTop: 4,
      }}
    >
      {children}
    </div>
  );
}

function primaryButton(disabled) {
  return {
    width: "100%",
    padding: "9px 12px",
    border: "none",
    borderRadius: 7,
    background: disabled ? "#EDE9E4" : "#D05A2C",
    color: disabled ? "#9CA3AF" : "#fff",
    fontSize: 12.5,
    fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "inherit",
  };
}

function secondaryButton(disabled) {
  return {
    width: "100%",
    padding: "9px 12px",
    border: "1px solid #E5E0DA",
    borderRadius: 7,
    background: disabled ? "#FAFAF9" : "#fff",
    color: disabled ? "#9CA3AF" : "#4B5563",
    fontSize: 12.5,
    fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "inherit",
  };
}

const smallText = {
  fontSize: 12,
  color: "#6B7280",
  lineHeight: 1.55,
  marginBottom: 10,
};

const emptyState = {
  minHeight: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  color: "#9CA3AF",
  fontSize: 13,
  padding: 24,
};
