import { eq } from "drizzle-orm";
import { db } from "../config/database.js";
import { appSettings } from "../models/schema.js";

export const REQUIRE_EMAIL_VERIFICATION_KEY = "require_email_verification";
export const REQUIRE_2FA_KEY = "require_2fa";

function parseBool(value: string | null | undefined): boolean | null {
  const raw = value?.toLowerCase() ?? "";
  if (raw === "") return null;
  return raw === "true" || raw === "1" || raw === "yes";
}

/** Read a boolean app setting, falling back when no row exists yet. */
export async function readToggle(
  key: string,
  fallback: boolean
): Promise<{ value: boolean; source: "database" | "default" }> {
  const [row] = await db.select().from(appSettings).where(eq(appSettings.key, key)).limit(1);
  const parsed = parseBool(row?.value);
  return parsed === null
    ? { value: fallback, source: "default" }
    : { value: parsed, source: "database" };
}

export async function writeToggle(key: string, enabled: boolean): Promise<void> {
  const value = enabled ? "true" : "false";
  const [existing] = await db.select().from(appSettings).where(eq(appSettings.key, key)).limit(1);
  if (existing) {
    await db
      .update(appSettings)
      .set({ value, updatedAt: new Date() })
      .where(eq(appSettings.key, key));
  } else {
    await db.insert(appSettings).values({ key, value });
  }
}

/** Defaults to true, matching the Go and Python templates. */
export async function isEmailVerificationRequired(): Promise<boolean> {
  return (await readToggle(REQUIRE_EMAIL_VERIFICATION_KEY, true)).value;
}
