"use client";

import { useEffect, useMemo, useState } from "react";

const SCHEDULE_PRESETS = [
  { id: "manual", label: "Manual only" },
  { id: "hourly_interval", label: "Custom hours" },
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "twice_weekly", label: "Twice a week" },
];

const WEEKDAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

const FOLLOWUP_CONTACT_SOURCE = "followup_gscript";
const FOLLOWUP_SCHEDULE = {
  frequency: "hourly_interval",
  intervalHours: 48,
  weeklyDays: [1],
};

export default function Campaigns({ blocks, globalStyles }) {
  const [campaigns, setCampaigns] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [name, setName] = useState("");
  const [followupTemplateId, setFollowupTemplateId] = useState("");
  const [followupName, setFollowupName] = useState("Follow-up Emails");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");

  const subject =
    blocks?.find((block) => block.type === "subject")?.data?.text || "";
  const hasContent = blocks?.some((block) =>
    ["headline", "text", "image", "button", "columns"].includes(block.type)
  );
  const hasSendableDraft = Boolean(subject && hasContent);

  async function loadCampaigns() {
    setLoading(true);
    try {
      const [campaignRes, contactRes, templateRes] = await Promise.all([
        fetch("/api/campaigns"),
        fetch("/api/contacts?includeFollowups=1"),
        fetch("/api/drafts"),
      ]);
      const [campaignData, contactData, templateData] = await Promise.all([
        campaignRes.json().catch(() => ({})),
        contactRes.json().catch(() => ({})),
        templateRes.json().catch(() => ({})),
      ]);

      if (campaignRes.ok) setCampaigns(campaignData.campaigns || []);
      else setMessage(campaignData.error || "Failed to load campaigns.");

      if (contactRes.ok) setContacts(contactData.contacts || []);
      else setMessage(contactData.error || "Failed to load subscribers.");

      if (templateRes.ok) {
        const loadedTemplates = templateData.drafts || [];
        setTemplates(loadedTemplates);
        setFollowupTemplateId((current) => current || loadedTemplates[0]?.id || "");
      } else {
        setMessage(templateData.error || "Failed to load templates.");
      }
    } catch (error) {
      setMessage(error.message || "Could not load campaign data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCampaigns();
  }, []);

  async function createCampaign() {
    if (!hasSendableDraft) {
      setMessage("Add a subject and at least one content block before creating a campaign.");
      return;
    }

    setBusyId("create");
    try {
      const scheduleConfig = {
        frequency: "manual",
        intervalHours: 24,
        weeklyDays: [1],
        startAt: new Date().toISOString(),
      };
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || subject || "Untitled Campaign",
          subject,
          blocks,
          globalStyles,
          status: "draft",
          recipientMode: "all",
          selectedContactIds: [],
          scheduleEnabled: false,
          scheduleConfig,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data.error || "Failed to create campaign.");
        return;
      }

      setCampaigns((prev) => [data.campaign, ...prev]);
      setName("");
      setMessage("Campaign created from the current template.");
    } catch (error) {
      setMessage(error.message || "Failed to create campaign.");
    } finally {
      setBusyId("");
    }
  }

  async function patchCampaign(id, patch, successMessage) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/campaigns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMessage(data.error || "Failed to update campaign.");
        return;
      }

      setCampaigns((prev) =>
        prev.map((campaign) => (campaign.id === id ? data.campaign : campaign))
      );
      if (successMessage) setMessage(successMessage);
    } catch (error) {
      setMessage(error.message || "Failed to update campaign.");
    } finally {
      setBusyId("");
    }
  }

  async function sendCampaign(id) {
    setBusyId(`send:${id}`);
    try {
      const res = await fetch(`/api/campaigns/${id}/send`, { method: "POST" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMessage(data.error || "Failed to send campaign.");
        return;
      }

      const sent = (data.results || []).filter((row) => row.status === "sent").length;
      const failed = (data.results || []).filter((row) => row.status === "error").length;
      setMessage(`Campaign send complete: ${sent} sent, ${failed} failed.`);
      loadCampaigns();
    } catch (error) {
      setMessage(error.message || "Failed to send campaign.");
    } finally {
      setBusyId("");
    }
  }

  async function syncReferrals() {
    setBusyId("sync");
    setMessage("Importing referrals...");
    try {
      const res = await fetch("/api/referrals/sync", { method: "POST" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMessage(data.error || "Failed to sync referrals.");
        return;
      }

      setMessage(`Imported ${data.importedCount} referral contacts into subscribers.`);
      loadCampaigns();
    } catch (error) {
      setMessage(error.message || "Failed to sync referrals.");
    } finally {
      setBusyId("");
    }
  }

  async function syncFollowups() {
    setBusyId("followup-sync");
    setMessage("Syncing follow-up list from Google Sheets...");
    try {
      const res = await fetch("/api/followups/sync", { method: "POST" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMessage(data.error || "Failed to sync follow-up list.");
        return;
      }

      setMessage(
        `Synced ${data.totalSynced} follow-up contact(s). ${data.importedCount} new.`
      );
      loadCampaigns();
    } catch (error) {
      setMessage(error.message || "Failed to sync follow-up list.");
    } finally {
      setBusyId("");
    }
  }

  async function createFollowupCampaign() {
    const template = templates.find((item) => item.id === followupTemplateId);
    if (!template) {
      setMessage("Choose a saved template for the follow-up campaign.");
      return;
    }

    const scheduleConfig = {
      ...FOLLOWUP_SCHEDULE,
      startAt: new Date().toISOString(),
    };

    setBusyId("followup-create");
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: followupName.trim() || "Follow-up Emails",
          subject: template.subject,
          blocks: template.blocks || [],
          globalStyles: template.globalStyles || {},
          status: "draft",
          recipientMode: "all",
          selectedContactIds: [],
          audience_source: FOLLOWUP_CONTACT_SOURCE,
          scheduleEnabled: true,
          scheduleConfig,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMessage(data.error || "Failed to create follow-up campaign.");
        return;
      }

      setCampaigns((prev) => [data.campaign, ...prev]);
      setMessage("Follow-up campaign created. Toggle Active on when you are ready.");
    } catch (error) {
      setMessage(error.message || "Failed to create follow-up campaign.");
    } finally {
      setBusyId("");
    }
  }

  const contactLookup = useMemo(
    () => new Map(contacts.map((contact) => [contact.id, contact])),
    [contacts]
  );
  const followupContacts = contacts.filter(
    (contact) => contact.source === FOLLOWUP_CONTACT_SOURCE
  );
  const followupCampaigns = campaigns.filter(
    (campaign) => campaign.audience_source === FOLLOWUP_CONTACT_SOURCE
  );

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      <div
        style={{
          width: 304,
          background: "#ffffff",
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
          disabled={!hasSendableDraft || busyId === "create"}
          style={primaryButton(!hasSendableDraft || busyId === "create")}
        >
          {busyId === "create" ? "Creating…" : "Save Current Template as Campaign"}
        </button>

        <SectionLabel>Subscriber Sources</SectionLabel>
        <p style={smallText}>
          Subscribers are stored in Supabase. You can also import referrals into
          the subscriber store.
        </p>
        <button
          onClick={syncReferrals}
          disabled={busyId === "sync"}
          style={secondaryButton(busyId === "sync")}
        >
          {busyId === "sync" ? "Importing…" : "Import Referrals into Subscribers"}
        </button>

        <SectionLabel>Follow-up Campaign</SectionLabel>
        <p style={smallText}>
          Pulls Name and Email from the credit repair Apps Script into a separate
          list, then sends the selected saved template every 2 days.
        </p>
        <button
          onClick={syncFollowups}
          disabled={busyId === "followup-sync"}
          style={secondaryButton(busyId === "followup-sync")}
        >
          {busyId === "followup-sync"
            ? "Syncing…"
            : `Sync Follow-up List (${followupContacts.length})`}
        </button>
        <input
          type="text"
          value={followupName}
          onChange={(e) => setFollowupName(e.target.value)}
          placeholder="Follow-up campaign name"
          className="field-input"
          style={{ marginTop: 10, marginBottom: 8 }}
        />
        <select
          value={followupTemplateId}
          onChange={(e) => setFollowupTemplateId(e.target.value)}
          className="field-input"
          style={{ marginBottom: 8 }}
        >
          {templates.length === 0 ? (
            <option value="">No saved templates yet</option>
          ) : (
            templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))
          )}
        </select>
        <button
          onClick={createFollowupCampaign}
          disabled={!followupTemplateId || busyId === "followup-create"}
          style={primaryButton(!followupTemplateId || busyId === "followup-create")}
        >
          {busyId === "followup-create"
            ? "Creating…"
            : "Create 2-Day Follow-up Campaign"}
        </button>
        {followupCampaigns.length > 0 && (
          <p style={{ ...smallText, marginTop: 8, marginBottom: 0 }}>
            {followupCampaigns.length} follow-up campaign
            {followupCampaigns.length !== 1 ? "s" : ""} configured.
          </p>
        )}

        {message && <div style={messageBox}>{message}</div>}
      </div>

      <div className="canvas-bg" style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        {loading ? (
          <div style={emptyState}>Loading campaigns…</div>
        ) : campaigns.length === 0 ? (
          <div style={emptyState}>No campaigns yet. Save a builder template here first.</div>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {campaigns.map((campaign) => {
              const schedule = campaign.schedule_config || {
                frequency: "manual",
                intervalHours: 24,
                weeklyDays: [1],
                startAt: new Date().toISOString(),
              };
              const selectedIds = campaign.selected_contact_ids || [];
              const isFollowup =
                campaign.audience_source === FOLLOWUP_CONTACT_SOURCE;
              const campaignContacts = isFollowup
                ? followupContacts
                : contacts.filter((contact) => contact.source !== FOLLOWUP_CONTACT_SOURCE);
              const selectedContacts =
                campaign.recipient_mode === "selected"
                  ? selectedIds
                      .map((id) => contactLookup.get(id))
                      .filter((contact) => contact && campaignContacts.includes(contact))
                  : campaignContacts;

              return (
                <div key={campaign.id} style={card}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#1A1D2E" }}>
                        {campaign.name}
                      </div>
                      <div style={{ fontSize: 12, color: "#6B7280", marginTop: 4 }}>
                        Subject: {campaign.subject || "—"}
                      </div>
                      <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>
                        Status: {campaign.status} · Next run:{" "}
                        {campaign.next_run_at
                          ? new Date(campaign.next_run_at).toLocaleString()
                          : "Not scheduled"}
                      </div>
                      {isFollowup && (
                        <div style={{ fontSize: 12, color: "#D05A2C", marginTop: 4, fontWeight: 600 }}>
                          Follow-up list · every 2 days · {selectedContacts.length} contact
                          {selectedContacts.length !== 1 ? "s" : ""}
                        </div>
                      )}
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
                          "Campaign content updated from the current template."
                        )
                      }
                      disabled={!hasSendableDraft || busyId === campaign.id}
                      style={secondaryButton(!hasSendableDraft || busyId === campaign.id)}
                    >
                      Use Current Template
                    </button>
                  </div>

                  <div style={sectionRow}>
                    <Toggle
                      label="Active"
                      checked={campaign.status === "active"}
                      onChange={(checked) =>
                        patchCampaign(campaign.id, {
                          status: checked ? "active" : "draft",
                        })
                      }
                    />
                    <Toggle
                      label="Scheduled"
                      checked={campaign.schedule_enabled}
                      onChange={(checked) =>
                        patchCampaign(campaign.id, {
                          schedule_enabled: checked,
                          scheduleConfig: schedule,
                        })
                      }
                    />
                  </div>

                  <SectionLabel>Audience</SectionLabel>
                  {isFollowup ? (
                    <p style={smallText}>
                      Uses the separate follow-up list imported from Apps Script.
                    </p>
                  ) : (
                    <div style={sectionRow}>
                      <Toggle
                        label="All subscribers"
                        checked={campaign.recipient_mode !== "selected"}
                        onChange={() =>
                          patchCampaign(campaign.id, {
                            recipient_mode: "all",
                            selected_contact_ids: [],
                          })
                        }
                      />
                      <Toggle
                        label="Select subscribers"
                        checked={campaign.recipient_mode === "selected"}
                        onChange={(checked) =>
                          patchCampaign(campaign.id, {
                            recipient_mode: checked ? "selected" : "all",
                          })
                        }
                      />
                    </div>
                  )}

                  {campaign.recipient_mode === "selected" && (
                    <div style={pickerBox}>
                      {campaignContacts.map((contact) => {
                        const checked = selectedIds.includes(contact.id);
                        return (
                          <label key={contact.id} style={contactRow}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                const next = e.target.checked
                                  ? [...selectedIds, contact.id]
                                  : selectedIds.filter((id) => id !== contact.id);
                                patchCampaign(campaign.id, {
                                  recipient_mode: "selected",
                                  selected_contact_ids: next,
                                });
                              }}
                            />
                            <span>
                              {contact.full_name || contact.email}{" "}
                              <span style={{ color: "#9CA3AF" }}>({contact.email})</span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  <SectionLabel>Schedule</SectionLabel>
                  <select
                    value={schedule.frequency}
                    onChange={(e) =>
                      patchCampaign(campaign.id, {
                        schedule_enabled: e.target.value !== "manual",
                        scheduleConfig: {
                          ...schedule,
                          frequency: e.target.value,
                          weeklyDays:
                            e.target.value === "twice_weekly"
                              ? [1, 4]
                              : e.target.value === "weekly"
                                ? [1]
                                : schedule.weeklyDays,
                        },
                      })
                    }
                    className="field-input"
                    style={{ marginBottom: 8 }}
                  >
                    {SCHEDULE_PRESETS.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.label}
                      </option>
                    ))}
                  </select>

                  {schedule.frequency === "hourly_interval" && (
                    <input
                      type="number"
                      min="1"
                      value={schedule.intervalHours || 24}
                      onChange={(e) =>
                        patchCampaign(campaign.id, {
                          schedule_enabled: true,
                          scheduleConfig: {
                            ...schedule,
                            frequency: "hourly_interval",
                            intervalHours: Number(e.target.value || 1),
                          },
                        })
                      }
                      className="field-input"
                      style={{ marginBottom: 8 }}
                    />
                  )}

                  {(schedule.frequency === "weekly" ||
                    schedule.frequency === "twice_weekly") && (
                    <div style={weekdayGrid}>
                      {WEEKDAYS.map((day) => {
                        const checked = (schedule.weeklyDays || []).includes(day.value);
                        return (
                          <label key={day.value} style={weekdayPill(checked)}>
                            <input
                              type="checkbox"
                              checked={checked}
                              style={{ display: "none" }}
                              onChange={(e) => {
                                let nextDays = e.target.checked
                                  ? [...(schedule.weeklyDays || []), day.value]
                                  : (schedule.weeklyDays || []).filter((value) => value !== day.value);
                                nextDays = [...new Set(nextDays)].sort((a, b) => a - b);
                                patchCampaign(campaign.id, {
                                  schedule_enabled: true,
                                  scheduleConfig: {
                                    ...schedule,
                                    weeklyDays: nextDays,
                                  },
                                });
                              }}
                            />
                            {day.label}
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {schedule.frequency !== "manual" && (
                    <input
                      type="datetime-local"
                      value={toDateTimeLocal(schedule.startAt)}
                      onChange={(e) =>
                        patchCampaign(campaign.id, {
                          schedule_enabled: true,
                          scheduleConfig: {
                            ...schedule,
                            startAt: new Date(e.target.value).toISOString(),
                          },
                        })
                      }
                      className="field-input"
                      style={{ marginTop: 8 }}
                    />
                  )}

                  <div style={{ display: "flex", gap: 10, marginTop: 14, alignItems: "center" }}>
                    <button
                      onClick={() => sendCampaign(campaign.id)}
                      disabled={
                        busyId === `send:${campaign.id}` ||
                        campaign.status !== "active" ||
                        selectedContacts.length === 0
                      }
                      style={primaryButton(
                        busyId === `send:${campaign.id}` ||
                          campaign.status !== "active" ||
                          selectedContacts.length === 0
                      )}
                    >
                      {busyId === `send:${campaign.id}` ? "Sending…" : `Send Now to ${selectedContacts.length}`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "#4B5563" }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#9CA3AF", marginBottom: 8, marginTop: 4 }}>
      {children}
    </div>
  );
}

function primaryButton(disabled) {
  return {
    padding: "9px 12px",
    border: "none",
    borderRadius: 7,
    background: disabled ? "#EDE9E4" : "#D05A2C",
    color: disabled ? "#9CA3AF" : "#ffffff",
    fontSize: 12.5,
    fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "inherit",
    width: "100%",
  };
}

function secondaryButton(disabled) {
  return {
    padding: "9px 12px",
    border: "1px solid #E5E0DA",
    borderRadius: 7,
    background: disabled ? "#FAFAF9" : "#ffffff",
    color: disabled ? "#9CA3AF" : "#4B5563",
    fontSize: 12.5,
    fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "inherit",
    width: "100%",
  };
}

function toDateTimeLocal(value) {
  const date = value ? new Date(value) : new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const smallText = {
  fontSize: 12,
  color: "#6B7280",
  lineHeight: 1.55,
  marginBottom: 10,
};

const messageBox = {
  marginTop: 12,
  padding: "10px 12px",
  background: "#FAFAF9",
  border: "1px solid #E5E0DA",
  borderRadius: 8,
  fontSize: 12,
  color: "#4B5563",
  lineHeight: 1.5,
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

const card = {
  background: "#ffffff",
  border: "1px solid #E5E0DA",
  borderRadius: 12,
  padding: 16,
};

const sectionRow = {
  display: "flex",
  gap: 16,
  flexWrap: "wrap",
  marginBottom: 14,
};

const pickerBox = {
  maxHeight: 180,
  overflowY: "auto",
  border: "1px solid #E5E0DA",
  borderRadius: 8,
  padding: 8,
  marginBottom: 14,
};

const contactRow = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "6px 4px",
  fontSize: 12.5,
  color: "#4B5563",
};

const weekdayGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
  gap: 6,
  marginBottom: 8,
};

function weekdayPill(active) {
  return {
    padding: "8px 0",
    textAlign: "center",
    borderRadius: 8,
    border: `1px solid ${active ? "#D05A2C" : "#E5E0DA"}`,
    background: active ? "#FDF3EE" : "#ffffff",
    color: active ? "#D05A2C" : "#6B7280",
    fontSize: 12,
    cursor: "pointer",
  };
}
