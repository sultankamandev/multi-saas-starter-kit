import "dotenv/config";

export const env = {
  port: parseInt(process.env.PORT || "8080", 10),
  databaseUrl: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/saas_app",
  jwtSecret: process.env.JWT_SECRET || "change-me-in-production",
  jwtExpiry: process.env.JWT_EXPIRY || "15m",
  refreshTokenExpiry: process.env.REFRESH_TOKEN_EXPIRY || "7d",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
  corsOrigins: (process.env.CORS_ORIGINS || "http://localhost:3000").split(","),
  smtp: {
    host: process.env.SMTP_HOST || "",
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.SMTP_FROM || "noreply@example.com",
  },
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  recaptchaSecretKey: process.env.RECAPTCHA_SECRET_KEY || "",
} as const;
