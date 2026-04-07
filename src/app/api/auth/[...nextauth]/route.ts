import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { supabase } from "@/lib/supabase";

/**
 * Refresh the Google access token using the stored refresh token.
 * First tries the token from DB (cross-device), falls back to JWT token.
 */
async function refreshAccessToken(token: any) {
  try {
    // Try to get refresh token from DB first (cross-device persistence)
    let refreshToken = token.refreshToken as string;

    if (token.sub) {
      const { data: dbUser } = await supabase
        .from("users")
        .select("refresh_token")
        .eq("google_id", token.sub)
        .single();

      if (dbUser?.refresh_token) {
        refreshToken = dbUser.refresh_token;
      }
    }

    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      // invalid_grant means the refresh token is revoked/expired — clear it from DB
      if (data.error === "invalid_grant" && token.sub) {
        await supabase
          .from("users")
          .update({ refresh_token: null, access_token: null })
          .eq("google_id", token.sub);
      }
      throw new Error(data.error || "refresh failed");
    }

    const newExpiresAt = Math.floor(Date.now() / 1000) + (data.expires_in as number);
    const newRefreshToken = data.refresh_token ?? refreshToken;

    // Update tokens in DB
    if (token.sub) {
      await supabase
        .from("users")
        .update({
          access_token: data.access_token,
          refresh_token: newRefreshToken,
          token_expires_at: newExpiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq("google_id", token.sub);
    }

    return {
      ...token,
      accessToken: data.access_token,
      expiresAt: newExpiresAt,
      refreshToken: newRefreshToken,
    };
  } catch (error) {
    console.error("Token refresh error:", error);
    return { ...token, error: "RefreshAccessTokenError" };
  }
}

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/tasks.readonly",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  pages: {
    signIn: "/",
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      return baseUrl;
    },
    async jwt({ token, account, profile }) {
      // Initial sign-in – store tokens and upsert user in DB
      if (account) {
        const googleId = token.sub || profile?.sub || "";
        const email = token.email || profile?.email || "";
        const name = token.name || profile?.name || "";
        const image = (token as any).picture || (profile as any)?.picture || "";

        // Upsert user in Supabase
        if (googleId) {
          const { data: existingUser } = await supabase
            .from("users")
            .select("id")
            .eq("google_id", googleId)
            .single();

          if (existingUser) {
            await supabase
              .from("users")
              .update({
                email,
                name,
                image,
                access_token: account.access_token,
                refresh_token: account.refresh_token || undefined,
                token_expires_at: account.expires_at,
                updated_at: new Date().toISOString(),
              })
              .eq("google_id", googleId);

            token.userId = existingUser.id;
          } else {
            const { data: newUser } = await supabase
              .from("users")
              .insert({
                google_id: googleId,
                email,
                name,
                image,
                access_token: account.access_token,
                refresh_token: account.refresh_token,
                token_expires_at: account.expires_at,
              })
              .select("id")
              .single();

            token.userId = newUser?.id;
          }
        }

        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          expiresAt: account.expires_at,
        };
      }

      // Resolve userId if not set (e.g. after server restart)
      if (!token.userId && token.sub) {
        const { data: user } = await supabase
          .from("users")
          .select("id")
          .eq("google_id", token.sub)
          .single();

        if (user) {
          token.userId = user.id;
        }
      }

      // Token still valid (with 60s buffer) – return as-is
      if (typeof token.expiresAt === "number" && Date.now() / 1000 < token.expiresAt - 60) {
        return token;
      }

      // Token expired – refresh it
      return await refreshAccessToken(token);
    },
    async session({ session, token }) {
      (session as any).accessToken = token.accessToken;
      (session as any).userId = token.userId;
      (session as any).error = token.error;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };
