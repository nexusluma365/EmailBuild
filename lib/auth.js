import GoogleProvider from "next-auth/providers/google";

export async function refreshGoogleAccessToken(token) {
  try {
    if (!token?.refreshToken) {
      throw new Error("Missing refresh token");
    }

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token: token.refreshToken,
      }),
    });

    const refreshed = await response.json();

    if (!response.ok) {
      throw refreshed;
    }

    return {
      ...token,
      accessToken: refreshed.access_token,
      expiresAt: Math.floor(Date.now() / 1000) + (refreshed.expires_in || 3600),
      refreshToken: refreshed.refresh_token ?? token.refreshToken,
      error: undefined,
    };
  } catch (error) {
    console.error("Failed to refresh Google access token:", error);
    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/gmail.send",
          access_type: "offline",
          prompt: "consent",
          response_type: "code",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile, user }) {
      if (account) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token ?? token.refreshToken,
          expiresAt: account.expires_at,
          email: profile?.email ?? user?.email ?? token.email,
          name: profile?.name ?? user?.name ?? token.name,
          picture: profile?.picture ?? user?.image ?? token.picture,
          error: undefined,
        };
      }

      if (token?.accessToken && token?.expiresAt && Date.now() < token.expiresAt * 1000) {
        return token;
      }

      if (token?.refreshToken) {
        return refreshGoogleAccessToken(token);
      }

      return token;
    },
    async session({ session, token }) {
      session.user = {
        ...session.user,
        email: token.email ?? session.user?.email,
        name: token.name ?? session.user?.name,
        image: token.picture ?? session.user?.image,
      };
      session.userEmail = token.email ?? session.user?.email ?? "";
      session.authError = token.error;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/",
  },
};
