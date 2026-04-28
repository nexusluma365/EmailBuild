export const MAX_DRAFTS = 5;
export const DRAFT_AUDIENCE_SOURCE = "draft_library";

export function mapDraftRow(row) {
  return {
    id: row.id,
    name: row.name || "Untitled Template",
    subject: row.subject || "",
    blocks: row.blocks || [],
    globalStyles: row.global_styles || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function buildDraftPayload({ ownerEmail, body, fallback = {} }) {
  const blocks = Array.isArray(body.blocks) ? body.blocks : fallback.blocks || [];
  const globalStyles =
    body.globalStyles || body.global_styles || fallback.global_styles || {};
  const subject = String(body.subject ?? fallback.subject ?? "").trim();
  const name = String(body.name || subject || fallback.name || "Untitled Template").slice(0, 120);

  return {
    owner_email: ownerEmail,
    name,
    subject,
    blocks,
    global_styles: globalStyles,
    audience_source: DRAFT_AUDIENCE_SOURCE,
    status: "draft",
    recipient_mode: "all",
    selected_contact_ids: [],
    schedule_enabled: false,
    schedule_config: {
      frequency: "manual",
      intervalHours: 24,
      weeklyDays: [1],
      startAt: new Date().toISOString(),
    },
    next_run_at: null,
    updated_at: new Date().toISOString(),
  };
}
