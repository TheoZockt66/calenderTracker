import { NextRequest } from "next/server";
import { supabase } from "./supabase";

export interface AppUser {
  id: string;
  google_id: string;
  email: string;
  name: string | null;
  accessToken: string;
}

/**
 * Get the current authenticated user from the request.
 * Uses the Google JWT (NextAuth) and auto-creates the Supabase user row if missing.
 * Returns null only if the request has no valid session.
 */
export async function getUser(req: NextRequest): Promise<AppUser | null> {
  const { getToken } = await import("next-auth/jwt");
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token?.sub) {
    return null;
  }

  const googleId = token.sub;
  const email = (token.email as string) || "";
  const name = (token.name as string) || null;
  const accessToken = (token.accessToken as string) || "";

  // Look up user by google_id
  const { data: user } = await supabase
    .from("users")
    .select("id, google_id, email, name")
    .eq("google_id", googleId)
    .single();

  if (user) {
    return {
      id: user.id,
      google_id: user.google_id,
      email: user.email,
      name: user.name,
      accessToken,
    };
  }

  // User doesn't exist yet — auto-create from Google session
  const { data: newUser } = await supabase
    .from("users")
    .insert({
      google_id: googleId,
      email,
      name,
      image: (token.picture as string) || null,
      access_token: accessToken,
      refresh_token: (token.refreshToken as string) || null,
      token_expires_at: (token.expiresAt as number) || null,
    })
    .select("id, google_id, email, name")
    .single();

  if (!newUser) {
    return null;
  }

  return {
    id: newUser.id,
    google_id: newUser.google_id,
    email: newUser.email,
    name: newUser.name,
    accessToken,
  };
}
