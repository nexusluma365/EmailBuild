import { getToken } from "next-auth/jwt";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

async function requireUserEmail(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.email) {
    throw new Error("Unauthorized");
  }
  return token.email;
}

export async function DELETE(req, { params }) {
  try {
    const userEmail = await requireUserEmail(req);
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("contacts")
      .update({
        status: "archived",
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id)
      .eq("owner_email", userEmail);

    if (error) throw error;
    return Response.json({ success: true });
  } catch (error) {
    const status = error.message === "Unauthorized" ? 401 : 500;
    return Response.json({ error: error.message }, { status });
  }
}
