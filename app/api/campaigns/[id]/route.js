import { getToken } from "next-auth/jwt";
import { computeNextRunAt, normalizeScheduleConfig } from "@/lib/campaigns";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

async function requireUserEmail(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.email) {
    throw new Error("Unauthorized");
  }
  return token.email;
}

export async function PATCH(req, { params }) {
  try {
    const userEmail = await requireUserEmail(req);
    const body = await req.json();
    const supabase = getSupabaseAdmin();

    const patch = {
      updated_at: new Date().toISOString(),
    };

    const allowed = [
      "name",
      "subject",
      "blocks",
      "global_styles",
      "status",
      "audience_source",
      "recipient_mode",
      "selected_contact_ids",
      "schedule_enabled",
      "last_synced_at",
    ];

    for (const key of allowed) {
      if (body[key] !== undefined) patch[key] = body[key];
    }

    if (body.scheduleConfig !== undefined || body.schedule_config !== undefined) {
      patch.schedule_config = normalizeScheduleConfig(
        body.scheduleConfig || body.schedule_config || {}
      );
    }

    const nextRunSeedConfig =
      patch.schedule_config || body.scheduleConfig || body.schedule_config;
    const scheduleEnabled =
      patch.schedule_enabled !== undefined
        ? patch.schedule_enabled
        : body.scheduleEnabled !== undefined
          ? body.scheduleEnabled
          : undefined;

    if (scheduleEnabled !== undefined) {
      patch.schedule_enabled = Boolean(scheduleEnabled);
      patch.next_run_at = patch.schedule_enabled
        ? computeNextRunAt(nextRunSeedConfig || {}, new Date())
        : null;
    } else if (patch.schedule_config) {
      patch.next_run_at = computeNextRunAt(patch.schedule_config, new Date());
    }

    const { data, error } = await supabase
      .from("campaigns")
      .update(patch)
      .eq("id", params.id)
      .eq("owner_email", userEmail)
      .select("*")
      .single();

    if (error) throw error;
    return Response.json({ campaign: data });
  } catch (error) {
    const status = error.message === "Unauthorized" ? 401 : 500;
    return Response.json({ error: error.message }, { status });
  }
}
