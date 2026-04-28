import { getToken } from "next-auth/jwt";
import { DRAFT_AUDIENCE_SOURCE, buildDraftPayload, mapDraftRow } from "@/lib/drafts";
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

    const { data: existing, error: existingError } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", params.id)
      .eq("owner_email", userEmail)
      .eq("audience_source", DRAFT_AUDIENCE_SOURCE)
      .single();

    if (existingError) throw existingError;

    const payload = buildDraftPayload({
      ownerEmail: userEmail,
      body,
      fallback: existing,
    });

    const { data, error } = await supabase
      .from("campaigns")
      .update(payload)
      .eq("id", params.id)
      .eq("owner_email", userEmail)
      .eq("audience_source", DRAFT_AUDIENCE_SOURCE)
      .select("*")
      .single();

    if (error) throw error;
    return Response.json({ draft: mapDraftRow(data) });
  } catch (error) {
    const status = error.message === "Unauthorized" ? 401 : 500;
    return Response.json({ error: error.message }, { status });
  }
}

export async function DELETE(req, { params }) {
  try {
    const userEmail = await requireUserEmail(req);
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("campaigns")
      .delete()
      .eq("id", params.id)
      .eq("owner_email", userEmail)
      .eq("audience_source", DRAFT_AUDIENCE_SOURCE);

    if (error) throw error;
    return Response.json({ success: true });
  } catch (error) {
    const status = error.message === "Unauthorized" ? 401 : 500;
    return Response.json({ error: error.message }, { status });
  }
}
