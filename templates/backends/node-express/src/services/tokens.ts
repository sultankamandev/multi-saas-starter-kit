import { randomBytes, createHash, timingSafeEqual } from "node:crypto";

/**
 * Mirrors pkg/domain/token.go in the Go template: raw tokens go out in emails,
 * only their SHA-256 digest is ever persisted.
 */
export function generateSecureToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function tokenExpiry(minutes: number): Date {
  return new Date(Date.now() + minutes * 60_000);
}

/** Numeric code for email 2FA, zero-padded so it is always `digits` long. */
export function generateNumericCode(digits = 6): string {
  const max = 10 ** digits;
  // rejection-free: read 4 bytes and reduce; bias is negligible for 6 digits
  const n = randomBytes(4).readUInt32BE(0) % max;
  return n.toString().padStart(digits, "0");
}

/** Constant-time compare for short secrets (2FA codes, recovery codes). */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
