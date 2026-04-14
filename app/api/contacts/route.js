import { getToken } from "next-auth/jwt";
import { upsertContacts } from "@/lib/campaigns";
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
      .from("contacts")
      .select("*")
      .eq("owner_email", userEmail)
      .eq("status", "active")
      .order("created_at", { ascending: false });

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
