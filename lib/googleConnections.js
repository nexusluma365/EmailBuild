import { refreshGoogleAccessToken } from "@/lib/googleAuth";
import { getSupabaseAdmin, hasSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function persistGoogleConnection(connection) {
  if (!hasSupabaseAdmin()) return;

  const { userEmail, userName, accessToken, refreshToken, expiresAt } =
    connection || {};

  if (!userEmail || !accessToken) return;

  const supabase = getSupabaseAdmin();

  const payload = {
    user_email: userEmail,
    user_name: userName || "",
    provider: "google",
    access_token: accessToken,
    expires_at: expiresAt || null,
    updated_at: new Date().toISOString(),
  };

  if (refreshToken) {
    payload.refresh_token = refreshToken;
  }

  await supabase.from("user_connections").upsert(payload, {
    onConflict: "user_email",
  });
}

export async function getGoogleConnectionByEmail(userEmail) {
  if (!hasSupabaseAdmin()) {
    throw new Error("Supabase admin env is not configured.");
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("user_connections")
    .select("*")
    .eq("user_email", userEmail)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getUsableGoogleAccessToken(userEmail) {
  const connection = await getGoogleConnectionByEmail(userEmail);

  if (!connection?.access_token) {
    throw new Error(
      "No stored Google connection found. Sign in again to enable automation."
    );
  }

  const token = {
    accessToken: connection.access_token,
    refreshToken: connection.refresh_token,
    expiresAt: connection.expires_at,
  };

  if (token.expiresAt && Date.now() < token.expiresAt * 1000) {
    return token.accessToken;
  }

  const refreshed = await refreshGoogleAccessToken(token);
  if (!refreshed?.accessToken || refreshed?.error) {
    throw new Error(
      "Stored Google connection expired. Reconnect Google to resume automated sends."
    );
  }

  await persistGoogleConnection({
    userEmail,
    userName: connection.user_name,
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken,
    expiresAt: refreshed.expiresAt,
  });

  return refreshed.accessToken;
}
