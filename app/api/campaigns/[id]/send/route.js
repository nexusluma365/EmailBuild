import { getToken } from "next-auth/jwt";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getCampaignContacts, sendCampaignToContacts } from "@/lib/campaigns";

export const runtime = "nodejs";
export const maxDuration = 300;

async function requireUserEmail(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.email) {
    throw new Error("Unauthorized");
  }
  return token.email;
}

export async function POST(req, { params }) {
  try {
    const userEmail = await requireUserEmail(req);
    const supabase = getSupabaseAdmin();
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", params.id)
      .eq("owner_email", userEmail)
      .single();

    if (campaignError) throw campaignError;
    if (!isSendableCampaign(campaign)) {
      return Response.json(
        { error: "Campaigns need a subject and at least one content block before sending." },
        { status: 400 }
      );
    }

    const contacts = await getCampaignContacts(campaign);
    const results = await sendCampaignToContacts(campaign, contacts);
    return Response.json({ results });
  } catch (error) {
    const status = error.message === "Unauthorized" ? 401 : 500;
    return Response.json({ error: error.message }, { status });
  }
}

function isSendableCampaign(campaign) {
  return Boolean(
    campaign?.subject &&
      (campaign.blocks || []).some((block) =>
        ["headline", "text", "image", "button", "columns"].includes(block.type)
      )
  );
}
