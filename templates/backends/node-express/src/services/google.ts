import { eq, sql } from "drizzle-orm";
import { db } from "../config/database.js";
import { users } from "../models/schema.js";

export interface GoogleProfile {
  email: string | null;
  givenName?: string;
  familyName?: string;
}

interface TokenInfo {
  aud?: string;
  email?: string;
  email_verified?: string | boolean;
  given_name?: string;
  family_name?: string;
  exp?: string;
}

/**
 * Validate a Google ID token via Google's tokeninfo endpoint.
 *
 * This avoids pulling in google-auth-library for one call, but it is a network
 * round trip per login. If that matters, swap in local JWKS verification —
 * the checks below (audience, expiry, verified email) are what must not change.
 */
export async function verifyGoogleIdToken(
  idToken: string,
  expectedClientId: string
): Promise<GoogleProfile | null> {
  let info: TokenInfo;
  try {
    const resp = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
    );
    if (!resp.ok) return null;
    info = (await resp.json()) as TokenInfo;
  } catch {
    return null;
  }

  if (info.aud !== expectedClientId) return null;

  const verified = info.email_verified === true || info.email_verified === "true";
  if (!verified) return null;

  if (info.exp && Number(info.exp) * 1000 < Date.now()) return null;

  return {
    email: info.email?.toLowerCase() ?? null,
    givenName: info.given_name,
    familyName: info.family_name,
  };
}

/** Build a username from an email local part, suffixing until it is free. */
export async function deriveUniqueUsername(email: string): Promise<string> {
  const base =
    email
      .split("@")[0]
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "")
      .slice(0, 20) || "user";

  for (let i = 0; i < 100; i++) {
    const candidate = i === 0 ? base : `${base}${i}`;
    const [taken] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(sql`lower(${users.username})`, candidate))
      .limit(1);
    if (!taken) return candidate;
  }
  return `${base}${Date.now().toString().slice(-6)}`;
}
