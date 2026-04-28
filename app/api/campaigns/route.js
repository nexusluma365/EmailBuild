import { getToken } from "next-auth/jwt";
import { computeNextRunAt, normalizeScheduleConfig } from "@/lib/campaigns";
import { DRAFT_AUDIENCE_SOURCE } from "@/lib/drafts";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

async function requireUserEmail(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.email) {
    throw new Error("Unauthorized");
  }
  return token.email;
}

export async function GET(req) {
  try {
    const userEmail = await requireUserEmail(req);
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("campaigns")
      .select("*")
      .eq("owner_email", userEmail)
      .neq("audience_source", DRAFT_AUDIENCE_SOURCE)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return Response.json({ campaigns: data || [] });
  } catch (error) {
    const status = error.message === "Unauthorized" ? 401 : 500;
    return Response.json({ error: error.message }, { status });
  }
}

export async function POST(req) {
  try {
    const userEmail = await requireUserEmail(req);
    const body = await req.json();
    const supabase = getSupabaseAdmin();
    const blocks = Array.isArray(body.blocks) ? body.blocks : [];
    const subject = String(body.subject || "").trim();

    if (!isSendableCampaign(subject, blocks)) {
      return Response.json(
        { error: "Campaigns need a subject and at least one content block." },
        { status: 400 }
      );
    }

    const payload = {
      owner_email: userEmail,
      name: body.name || "Untitled Campaign",
      subject,
      blocks,
      global_styles: body.global_styles || body.globalStyles || {},
      status: body.status || "draft",
      audience_source: "contacts",
      recipient_mode: body.recipientMode || "all",
      selected_contact_ids: body.selectedContactIds || [],
      schedule_enabled: Boolean(body.scheduleEnabled),
      schedule_config: normalizeScheduleConfig(body.scheduleConfig || {}),
      next_run_at: body.scheduleEnabled
        ? computeNextRunAt(body.scheduleConfig || {}, new Date())
        : null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("campaigns")
      .insert(payload)
      .select("*")
      .single();

    if (error) throw error;
    return Response.json({ campaign: data });
  } catch (error) {
    const status = error.message === "Unauthorized" ? 401 : 500;
    return Response.json({ error: error.message }, { status });
  }
}

function isSendableCampaign(subject, blocks) {
  return Boolean(
    subject &&
      blocks.some((block) =>
        ["headline", "text", "image", "button", "columns"].includes(block.type)
      )
  );
}
