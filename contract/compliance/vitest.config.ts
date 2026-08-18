import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const here = dirname(fileURLToPath(import.meta.url));

/**
 * Load configuration from a file rather than requiring `API_URL=... npm test`,
 * which is POSIX-only syntax — on Windows that form sets nothing and every test
 * silently runs against the default URL instead.
 *
 * `.env.defaults` holds non-secret values (which backend, which port) and is
 * committed; `.env` holds local ones (admin credentials) and is not. Real
 * environment variables always win, so CI can still pass everything directly.
 */
function readEnvFile(name: string): Record<string, string> {
  const path = join(here, name);
  if (!existsSync(path)) return {};

  const out: Record<string, string> = {};
  for (const raw of readFileSync(path, "utf-8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;

    const eq = line.indexOf("=");
    if (eq === -1) continue;

    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (key) out[key] = value;
  }
  return out;
}

const fromFiles = { ...readEnvFile(".env.defaults"), ...readEnvFile(".env") };

// Anything already exported in the real environment takes precedence.
const resolved: Record<string, string> = {};
for (const [key, value] of Object.entries(fromFiles)) {
  resolved[key] = process.env[key] ?? value;
  process.env[key] = resolved[key];
}

export default defineConfig({
  test: {
    // Also passed through explicitly so the value reaches the test workers
    // regardless of which pool Vitest uses.
    env: resolved,

    // These files share one running backend, one database, and one per-IP rate
    // limit, so they are not independent and must not overlap.
    //
    // Concretely: admin.test.ts round-trips the server-wide
    // `require_email_verification` toggle, flipping it off and back on. Any
    // registration that lands inside that window gets no verification mail,
    // which made flows.test.ts fail intermittently with "no matching mail" —
    // a failure that pointed at the mail sink and had nothing to do with it.
    //
    // Serialising also spreads the ~67 /auth requests a run makes over more
    // wall time, leaving more headroom under the 100/minute limit.
    fileParallelism: false,
    // Must exceed waitForToken's budget in src/mailpit.ts, or its diagnostic
    // never surfaces. The email flows dominate: a cold backend plus a cold mail
    // catcher can take over ten seconds to deliver the first message.
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
