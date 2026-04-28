import { getToken } from "next-auth/jwt";
import { DRAFT_AUDIENCE_SOURCE, MAX_DRAFTS, buildDraftPayload, mapDraftRow } from "@/lib/drafts";
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
      .eq("audience_source", DRAFT_AUDIENCE_SOURCE)
      .order("updated_at", { ascending: false })
      .limit(MAX_DRAFTS);

    if (error) throw error;
    return Response.json({ drafts: (data || []).map(mapDraftRow) });
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

    const { count, error: countError } = await supabase
      .from("campaigns")
      .select("id", { count: "exact", head: true })
      .eq("owner_email", userEmail)
      .eq("audience_source", DRAFT_AUDIENCE_SOURCE);

    if (countError) throw countError;
    if ((count || 0) >= MAX_DRAFTS) {
      return Response.json(
        { error: `You can save up to ${MAX_DRAFTS} templates. Delete one before saving another.` },
        { status: 400 }
      );
    }

    const payload = buildDraftPayload({ ownerEmail: userEmail, body });
    const { data, error } = await supabase
      .from("campaigns")
      .insert(payload)
      .select("*")
      .single();

    if (error) throw error;
    return Response.json({ draft: mapDraftRow(data) });
  } catch (error) {
    const status = error.message === "Unauthorized" ? 401 : 500;
    return Response.json({ error: error.message }, { status });
  }
}
