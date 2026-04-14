import { getToken } from "next-auth/jwt";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { sendCampaignToContacts } from "@/lib/campaigns";

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
    const body = await req.json().catch(() => ({}));

    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", params.id)
      .eq("owner_email", userEmail)
      .single();

    if (campaignError) throw campaignError;

    let contactsQuery = supabase
      .from("contacts")
      .select("id,email,first_name,last_name,full_name,business_name")
      .eq("owner_email", userEmail)
      .eq("status", "active");

    if (body.onlyNewReferrals) {
      contactsQuery = contactsQuery.eq("source", "referral");
    }

    const { data: contacts, error: contactsError } = await contactsQuery;
    if (contactsError) throw contactsError;

    const results = await sendCampaignToContacts(campaign, contacts || []);
    return Response.json({ results });
  } catch (error) {
    const status = error.message === "Unauthorized" ? 401 : 500;
    return Response.json({ error: error.message }, { status });
  }
}
