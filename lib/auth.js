import GoogleProvider from "next-auth/providers/google";
import { persistGoogleConnection } from "@/lib/googleConnections";
import { refreshGoogleAccessToken } from "@/lib/googleAuth";

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
        await persistGoogleConnection({
          userEmail: profile?.email ?? user?.email ?? token.email,
          userName: profile?.name ?? user?.name ?? token.name,
          accessToken: account.access_token,
          refreshToken: account.refresh_token ?? token.refreshToken,
          expiresAt: account.expires_at,
        });

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
