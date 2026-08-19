import "dotenv/config";
import { z } from "zod";

// The shortest JWT_SECRET the server will start with. Long enough to reject
// every placeholder that ships in this repo — the .env.example value, the
// compose default — so nobody boots a signing key that was never actually
// chosen. Go and Python enforce the same number.
const MIN_SECRET_LEN = 32;

// DATABASE_URL and JWT_SECRET have no defaults on purpose. They used to fall
// back to a localhost DSN and the literal string "change-me-in-production",
// which meant a misconfigured deployment booted happily and signed real tokens
// with a public secret instead of failing where someone would notice.
const schema = z.object({
  PORT: z.coerce.number().int().positive().default(8080),
  DATABASE_URL: z.string().min(1, "is required"),
  JWT_SECRET: z
    .string()
    .min(MIN_SECRET_LEN, `must be at least ${MIN_SECRET_LEN} characters`),
  JWT_EXPIRY: z.string().default("15m"),
  REFRESH_TOKEN_EXPIRY: z.string().default("7d"),
  FRONTEND_URL: z.string().default("http://localhost:3000"),
  CORS_ORIGINS: z.string().default("http://localhost:3000"),
  SMTP_HOST: z.string().default(""),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().default(""),
  SMTP_PASS: z.string().default(""),
  SMTP_FROM: z.string().default("noreply@example.com"),
  GOOGLE_CLIENT_ID: z.string().default(""),
  RECAPTCHA_SECRET_KEY: z.string().default(""),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const lines = parsed.error.issues.map(
    (issue) => `  ${issue.path.join(".")} ${issue.message}`
  );
  console.error(
    [
      "Invalid environment configuration:",
      ...lines,
      "",
      "Copy .env.example to .env and fill it in.",
      "Generate a secret with: openssl rand -base64 48",
    ].join("\n")
  );
  process.exit(1);
}

const e = parsed.data;

export const env = {
  port: e.PORT,
  databaseUrl: e.DATABASE_URL,
  jwtSecret: e.JWT_SECRET,
  jwtExpiry: e.JWT_EXPIRY,
  refreshTokenExpiry: e.REFRESH_TOKEN_EXPIRY,
  frontendUrl: e.FRONTEND_URL,
  corsOrigins: e.CORS_ORIGINS.split(",")
    .map((o) => o.trim())
    .filter(Boolean),
  smtp: {
    host: e.SMTP_HOST,
    port: e.SMTP_PORT,
    user: e.SMTP_USER,
    pass: e.SMTP_PASS,
    from: e.SMTP_FROM,
  },
  googleClientId: e.GOOGLE_CLIENT_ID,
  recaptchaSecretKey: e.RECAPTCHA_SECRET_KEY,
};
