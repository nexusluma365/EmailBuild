import { getToken } from "next-auth/jwt";
import { FOLLOWUP_CONTACT_SOURCE, upsertContacts } from "@/lib/campaigns";
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
    const { searchParams } = new URL(req.url);
    const source = searchParams.get("source");
    const includeFollowups = searchParams.get("includeFollowups") === "1";
    const supabase = getSupabaseAdmin();
    let query = supabase
      .from("contacts")
      .select("*")
      .eq("owner_email", userEmail)
      .eq("status", "active");

    if (source) {
      query = query.eq("source", source);
    } else if (!includeFollowups) {
      query = query.neq("source", FOLLOWUP_CONTACT_SOURCE);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) throw error;
    return Response.json({ contacts: data || [] });
  } catch (error) {
    const status = error.message === "Unauthorized" ? 401 : 500;
    return Response.json({ error: error.message }, { status });
  }
}

export async function POST(req) {
  try {
    const userEmail = await requireUserEmail(req);
    const body = await req.json();
    const rows = Array.isArray(body.contacts) ? body.contacts : [body];
    const source = body.source || "manual";
    const result = await upsertContacts(userEmail, rows, source);
    return Response.json(result);
  } catch (error) {
    const status = error.message === "Unauthorized" ? 401 : 500;
    return Response.json({ error: error.message }, { status });
  }
}
