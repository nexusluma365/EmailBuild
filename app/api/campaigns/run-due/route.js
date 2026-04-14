import { getCampaignContacts, sendCampaignToContacts } from "@/lib/campaigns";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

function requireCron(req) {
  const authHeader = req.headers.get("authorization") || "";
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    throw new Error("Unauthorized");
  }
}

export async function POST(req) {
  try {
    requireCron(req);
    const supabase = getSupabaseAdmin();
    const nowIso = new Date().toISOString();

    const { data: campaigns, error } = await supabase
      .from("campaigns")
      .select("*")
      .eq("status", "active")
      .eq("schedule_enabled", true)
      .not("next_run_at", "is", null)
      .lte("next_run_at", nowIso);

    if (error) throw error;

    const runs = [];

    for (const campaign of campaigns || []) {
      const contacts = await getCampaignContacts(campaign);
      const results = await sendCampaignToContacts(campaign, contacts);
      runs.push({
        campaignId: campaign.id,
        name: campaign.name,
        sent: results.filter((result) => result.status === "sent").length,
        failed: results.filter((result) => result.status === "error").length,
      });
    }

    return Response.json({ runs });
  } catch (error) {
    const status = error.message === "Unauthorized" ? 401 : 500;
    return Response.json({ error: error.message }, { status });
  }
}
