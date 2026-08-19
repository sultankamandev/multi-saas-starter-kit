import { authenticator } from "otplib";
import bcrypt from "bcryptjs";
import { and, eq, desc } from "drizzle-orm";
import { db } from "../config/database.js";
import { twoFactorTokens, recoveryCodes, users } from "../models/schema.js";
import { generateNumericCode, safeEqual, tokenExpiry } from "./tokens.js";

const CODE_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const RECOVERY_CODE_COUNT = 10;

export const TWO_FA_ERROR = {
  EXPIRED: "TWO_FA_CODE_EXPIRED",
  INVALID: "INVALID_2FA_CODE",
} as const;

/** Issue a fresh email 2FA code, invalidating any outstanding ones. */
export async function issueEmailCode(userId: number, rememberMe: boolean): Promise<string> {
  await db
    .update(twoFactorTokens)
    .set({ used: true })
    .where(and(eq(twoFactorTokens.userId, userId), eq(twoFactorTokens.used, false)));

  const code = generateNumericCode(6);
  await db.insert(twoFactorTokens).values({
    userId,
    code,
    rememberMe,
    expiresAt: tokenExpiry(CODE_TTL_MINUTES),
  });
  return code;
}

export type CodeCheck =
  | { ok: true; rememberMe: boolean }
  | { ok: false; reason: (typeof TWO_FA_ERROR)[keyof typeof TWO_FA_ERROR] };

/**
 * Verify an email 2FA code. Attempts are counted on the stored row so a
 * brute-force burst burns the code rather than the rate limiter alone.
 */
export async function verifyEmailCode(userId: number, code: string): Promise<CodeCheck> {
  const [row] = await db
    .select()
    .from(twoFactorTokens)
    .where(and(eq(twoFactorTokens.userId, userId), eq(twoFactorTokens.used, false)))
    .orderBy(desc(twoFactorTokens.createdAt))
    .limit(1);

  if (!row) return { ok: false, reason: TWO_FA_ERROR.EXPIRED };

  if (row.expiresAt < new Date() || row.attempts >= MAX_ATTEMPTS) {
    await db.update(twoFactorTokens).set({ used: true }).where(eq(twoFactorTokens.id, row.id));
    return { ok: false, reason: TWO_FA_ERROR.EXPIRED };
  }

  if (!safeEqual(row.code, code)) {
    await db
      .update(twoFactorTokens)
      .set({ attempts: row.attempts + 1 })
      .where(eq(twoFactorTokens.id, row.id));
    return { ok: false, reason: TWO_FA_ERROR.INVALID };
  }

  await db.update(twoFactorTokens).set({ used: true }).where(eq(twoFactorTokens.id, row.id));
  return { ok: true, rememberMe: row.rememberMe };
}

export function generateTotpSecret(): string {
  return authenticator.generateSecret();
}

export function totpAuthUrl(email: string, secret: string, issuer = "SaaS Starter"): string {
  return authenticator.keyuri(email, issuer, secret);
}

// otplib accepts only the current 30-second step by default, so a code typed a
// second before the window rolls over is rejected. RFC 6238 s5.2 recommends
// allowing one step for network delay and clock drift, and the Go template's
// totp.Validate already does (Skew 1) -- without this the three backends
// disagree about whether the same code is valid.
authenticator.options = { window: [1, 1] };

export function verifyTotp(secret: string, code: string): boolean {
  try {
    return authenticator.check(code, secret);
  } catch {
    return false;
  }
}

/** Generate recovery codes, store only bcrypt hashes, return the plaintext once. */
export async function issueRecoveryCodes(userId: number): Promise<string[]> {
  await db.delete(recoveryCodes).where(eq(recoveryCodes.userId, userId));

  const plain: string[] = [];
  for (let i = 0; i < RECOVERY_CODE_COUNT; i++) {
    // 10 hex chars, formatted xxxxx-xxxxx for legibility
    const raw = generateNumericCode(5) + "-" + generateNumericCode(5);
    plain.push(raw);
  }

  const rows = await Promise.all(
    plain.map(async (code) => ({ userId, codeHash: await bcrypt.hash(code, 10) }))
  );
  await db.insert(recoveryCodes).values(rows);
  return plain;
}

/** Consume a recovery code. Each is single-use. */
export async function consumeRecoveryCode(userId: number, code: string): Promise<boolean> {
  const rows = await db
    .select()
    .from(recoveryCodes)
    .where(and(eq(recoveryCodes.userId, userId), eq(recoveryCodes.used, false)));

  for (const row of rows) {
    if (await bcrypt.compare(code, row.codeHash)) {
      await db
        .update(recoveryCodes)
        .set({ used: true, usedAt: new Date() })
        .where(eq(recoveryCodes.id, row.id));
      return true;
    }
  }
  return false;
}

export async function enableTwoFa(userId: number, secret: string) {
  await db
    .update(users)
    .set({ twoFaEnabled: true, twoFaSecret: secret, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

export async function disableTwoFa(userId: number) {
  await db
    .update(users)
    // Clearing the secret matters: leaving it would let a stale authenticator
    // entry keep working if 2FA were re-enabled later.
    .set({ twoFaEnabled: false, twoFaSecret: null, updatedAt: new Date() })
    .where(eq(users.id, userId));

  // Deleted rather than marked used, so re-enabling starts from a clean set and
  // an old code can never be replayed.
  await db.delete(recoveryCodes).where(eq(recoveryCodes.userId, userId));
}
