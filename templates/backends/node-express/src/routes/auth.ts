import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { t } from "../i18n.js";
import jwt from "jsonwebtoken";
import { authMiddleware, type AuthPayload } from "../middleware/auth.js";
import { authRateLimiter } from "../middleware/rateLimit.js";
import {
  createUser,
  findUserByEmailOrUsername,
  findUserByEmail,
  findUserById,
  generateTokens,
  verifyPassword,
  storeRefreshToken,
  findAndDeleteRefreshToken,
  deleteAllRefreshTokens,
  userToResponse,
} from "../services/auth.js";
import { hashPassword, findUserByPublicId } from "../services/auth.js";
import {
  sendPasswordResetEmail,
  sendVerificationEmail,
  send2FACodeEmail,
} from "../services/email.js";
import { generateSecureToken, hashToken, tokenExpiry } from "../services/tokens.js";
import {
  issueEmailCode,
  verifyEmailCode,
  generateTotpSecret,
  totpAuthUrl,
  verifyTotp,
  issueRecoveryCodes,
  consumeRecoveryCode,
  disableTwoFa,
  enableTwoFa,
  TWO_FA_ERROR,
} from "../services/twofa.js";
import { verifyGoogleIdToken, deriveUniqueUsername } from "../services/google.js";
import { isEmailVerificationRequired } from "../services/settings.js";
import { db } from "../config/database.js";
import {
  users,
  passwordResetTokens,
  emailVerificationTokens,
} from "../models/schema.js";
import { eq } from "drizzle-orm";
import { env } from "../config/env.js";

const router = Router();
router.use(authRateLimiter);

/**
 * Issue tokens and return the standard login payload. Shared by password
 * login, Google login, and every 2FA completion path so they cannot drift.
 */
async function issueSession(
  res: Response,
  req: Request,
  user: typeof users.$inferSelect,
  rememberMe: boolean,
  messageKey: string
) {
  const tokens = generateTokens(user.id, user.publicId, user.role);
  const expiresAt = new Date(Date.now() + (rememberMe ? 30 : 7) * 86400000);
  await storeRefreshToken(user.id, tokens.refreshToken, expiresAt);

  res.json({
    message: t(req.lang, messageKey),
    user: userToResponse(user),
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    expires_in: tokens.expiresIn,
    token_type: tokens.tokenType,
  });
}

const registerSchema = z.object({
  username: z.string().min(1),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8).max(255),
  recaptcha_token: z.string().optional(),
  language: z.string().optional(),
  country: z.string().optional(),
});

router.post("/register", async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", errors: parsed.error.flatten().fieldErrors });
    return;
  }

  try {
    const existing = await findUserByEmail(parsed.data.email);
    if (existing) {
      res.status(409).json({ error: "conflict", message: t(req.lang, "UserAlreadyExists") });
      return;
    }

    const user = await createUser({
      username: parsed.data.username,
      firstName: parsed.data.first_name,
      lastName: parsed.data.last_name,
      email: parsed.data.email,
      password: parsed.data.password,
      language: parsed.data.language,
      country: parsed.data.country,
    });

    const requireVerification = await isEmailVerificationRequired();
    if (requireVerification) {
      const raw = generateSecureToken();
      await db.insert(emailVerificationTokens).values({
        userId: user.id,
        token: hashToken(raw),
        expiresAt: tokenExpiry(60 * 24),
      });
      await sendVerificationEmail(user.email, raw, user.language ?? req.lang);
      res.status(201).json({ message: t(req.lang, "UserRegisteredPleaseVerify") });
      return;
    }

    // Verification disabled in app_settings: the account is usable immediately.
    await db.update(users).set({ verified: true }).where(eq(users.id, user.id));
    res.status(201).json({ message: t(req.lang, "UserRegisteredSuccess") });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Registration failed";
    if (msg.includes("unique") || msg.includes("duplicate")) {
      res.status(409).json({ error: "conflict", message: t(req.lang, "UserAlreadyExists") });
      return;
    }
    res.status(500).json({ error: "internal", message: msg });
  }
});

const loginSchema = z.object({
  email_or_username: z.string().min(1),
  password: z.string().min(1),
  recaptcha_token: z.string().optional(),
  remember_me: z.boolean().optional(),
});

router.post("/login", async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", errors: parsed.error.flatten().fieldErrors });
    return;
  }

  const user = await findUserByEmailOrUsername(parsed.data.email_or_username);
  if (!user) {
    res.status(401).json({ error: "unauthorized", message: t(req.lang, "InvalidCredentials") });
    return;
  }

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "unauthorized", message: t(req.lang, "InvalidCredentials") });
    return;
  }

  if (!user.verified && (await isEmailVerificationRequired())) {
    res.status(403).json({
      error: "email_not_verified",
      error_code: "EMAIL_NOT_VERIFIED",
      message: t(req.lang, "EmailNotVerified"),
    });
    return;
  }

  if (user.twoFaEnabled) {
    const twoFaType = user.twoFaSecret ? "totp" : "email";
    // Email 2FA has nothing for the user to read from an app, so send it now.
    if (twoFaType === "email") {
      const code = await issueEmailCode(user.id, parsed.data.remember_me ?? false);
      await send2FACodeEmail(user.email, code, user.language ?? req.lang);
    }
    res.json({
      requires_2fa: true,
      two_fa_type: twoFaType,
      user_id: user.publicId,
      message: t(req.lang, "2FARequired"),
    });
    return;
  }

  const tokens = generateTokens(user.id, user.publicId, user.role);
  const expiresAt = new Date(Date.now() + (parsed.data.remember_me ? 30 : 7) * 86400000);
  await storeRefreshToken(user.id, tokens.refreshToken, expiresAt);

  res.json({
    message: t(req.lang, "LoginSuccess"),
    user: userToResponse(user),
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    expires_in: tokens.expiresIn,
    token_type: tokens.tokenType,
  });
});

const refreshSchema = z.object({ refresh_token: z.string().min(1) });

router.post("/refresh-token", async (req: Request, res: Response) => {
  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: "refresh_token is required" });
    return;
  }

  const row = await findAndDeleteRefreshToken(parsed.data.refresh_token);
  if (!row || row.expiresAt < new Date()) {
    res.status(401).json({ error: "unauthorized", message: t(req.lang, "TokenExpired") });
    return;
  }

  const user = await findUserById(row.userId);
  if (!user) {
    res.status(401).json({ error: "unauthorized", message: t(req.lang, "UserNotFound") });
    return;
  }

  const tokens = generateTokens(user.id, user.publicId, user.role);
  const expiresAt = new Date(Date.now() + 7 * 86400000);
  await storeRefreshToken(user.id, tokens.refreshToken, expiresAt);

  res.json({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    expires_in: tokens.expiresIn,
    token_type: tokens.tokenType,
  });
});

const logoutSchema = z.object({ refresh_token: z.string().min(1) });

router.post("/logout", async (req: Request, res: Response) => {
  const parsed = logoutSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: "refresh_token is required" });
    return;
  }
  await findAndDeleteRefreshToken(parsed.data.refresh_token);
  res.json({ message: t(req.lang, "LoggedOutSuccess") });
});

router.post("/forgot-password", async (req: Request, res: Response) => {
  const parsed = z.object({ email: z.string().email() }).safeParse(req.body);
  // Always answer the same way, so this cannot be used to enumerate accounts.
  const genericReply = () => res.json({ message: t(req.lang, "ResetLinkSent") });

  if (!parsed.success) return genericReply();

  const user = await findUserByEmail(parsed.data.email);
  if (!user || user.deletedAt) return genericReply();

  const raw = generateSecureToken();
  await db.insert(passwordResetTokens).values({
    userId: user.id,
    token: hashToken(raw),
    expiresAt: tokenExpiry(60),
  });
  await sendPasswordResetEmail(user.email, raw, user.language ?? req.lang);
  return genericReply();
});

router.post("/reset-password", async (req: Request, res: Response) => {
  const parsed = z
    .object({ token: z.string().min(1), new_password: z.string().min(8).max(255) })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", errors: parsed.error.flatten().fieldErrors });
    return;
  }

  const [row] = await db
    .select()
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.token, hashToken(parsed.data.token)))
    .limit(1);

  if (!row || row.used || row.expiresAt < new Date()) {
    res.status(400).json({ error: "invalid_token", message: t(req.lang, "InvalidOrExpiredToken") });
    return;
  }

  await db
    .update(users)
    .set({ passwordHash: await hashPassword(parsed.data.new_password), updatedAt: new Date() })
    .where(eq(users.id, row.userId));
  await db
    .update(passwordResetTokens)
    .set({ used: true })
    .where(eq(passwordResetTokens.id, row.id));
  // A password change invalidates every existing session.
  await deleteAllRefreshTokens(row.userId);

  res.json({ message: t(req.lang, "PasswordResetSuccess") });
});

router.get("/verify-email", async (req: Request, res: Response) => {
  const token = typeof req.query.token === "string" ? req.query.token : "";
  if (!token) {
    res.status(400).json({ error: "invalid_token", message: t(req.lang, "InvalidToken") });
    return;
  }

  const [row] = await db
    .select()
    .from(emailVerificationTokens)
    .where(eq(emailVerificationTokens.token, hashToken(token)))
    .limit(1);

  if (!row || row.used || row.expiresAt < new Date()) {
    res.status(400).json({ error: "invalid_token", message: t(req.lang, "InvalidOrExpiredToken") });
    return;
  }

  await db.update(users).set({ verified: true, updatedAt: new Date() }).where(eq(users.id, row.userId));
  await db
    .update(emailVerificationTokens)
    .set({ used: true })
    .where(eq(emailVerificationTokens.id, row.id));

  res.json({ message: t(req.lang, "EmailVerifiedSuccess") });
});

const googleLogin = async (req: Request, res: Response) => {
  const parsed = z
    .object({ token: z.string().min(1), remember_me: z.boolean().optional() })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", errors: parsed.error.flatten().fieldErrors });
    return;
  }
  if (!env.googleClientId) {
    res.status(501).json({
      error: "not_configured",
      message: t(req.lang, "GoogleOAuthNotConfigured"),
    });
    return;
  }

  const profile = await verifyGoogleIdToken(parsed.data.token, env.googleClientId);
  if (!profile) {
    res.status(401).json({ error: "unauthorized", message: t(req.lang, "InvalidGoogleToken") });
    return;
  }
  if (!profile.email) {
    res.status(400).json({ error: "invalid_request", message: t(req.lang, "GoogleEmailNotFound") });
    return;
  }

  let user = await findUserByEmail(profile.email);
  if (!user) {
    // Google has already verified the address, so the account starts verified.
    user = await createUser({
      username: await deriveUniqueUsername(profile.email),
      firstName: profile.givenName ?? "",
      lastName: profile.familyName ?? "",
      email: profile.email,
      password: generateSecureToken(),
      language: req.lang,
    });
    await db.update(users).set({ verified: true }).where(eq(users.id, user.id));
    user = (await findUserById(user.id))!;
  }

  await issueSession(res, req, user, parsed.data.remember_me ?? false, "GoogleLoginSuccess");
};
router.post("/google-login", googleLogin);
router.post("/google", googleLogin); // alias for Go-style clients

router.post("/verify-2fa", async (req: Request, res: Response) => {
  const parsed = z
    .object({ user_id: z.string().min(1), code: z.string().min(1) })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", errors: parsed.error.flatten().fieldErrors });
    return;
  }

  const user = await findUserByPublicId(parsed.data.user_id);
  if (!user) {
    res.status(404).json({ error: "not_found", message: t(req.lang, "UserNotFound") });
    return;
  }

  const check = await verifyEmailCode(user.id, parsed.data.code);
  if (!check.ok) {
    const expired = check.reason === TWO_FA_ERROR.EXPIRED;
    res.status(expired ? 400 : 401).json({
      error: expired ? "code_expired" : "invalid_code",
      error_code: check.reason,
      message: t(req.lang, expired ? "TwoFactorCodeExpired" : "Invalid2FACode"),
    });
    return;
  }

  await issueSession(res, req, user, check.rememberMe, "TwoFactorVerified");
});

router.post("/resend-2fa", async (req: Request, res: Response) => {
  const parsed = z.object({ user_id: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", errors: parsed.error.flatten().fieldErrors });
    return;
  }

  const user = await findUserByPublicId(parsed.data.user_id);
  if (!user) {
    res.status(404).json({ error: "not_found", message: t(req.lang, "UserNotFound") });
    return;
  }

  const code = await issueEmailCode(user.id, false);
  await send2FACodeEmail(user.email, code, user.language ?? req.lang);
  res.json({ message: t(req.lang, "TwoFactorCodeSent") });
});

router.post("/verify-totp-login", async (req: Request, res: Response) => {
  const parsed = z
    .object({
      user_id: z.string().min(1),
      code: z.string().min(1),
      remember_me: z.boolean().optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", errors: parsed.error.flatten().fieldErrors });
    return;
  }

  const user = await findUserByPublicId(parsed.data.user_id);
  if (!user) {
    res.status(404).json({ error: "not_found", message: t(req.lang, "UserNotFound") });
    return;
  }
  if (!user.twoFaSecret) {
    res.status(400).json({ error: "not_setup", message: t(req.lang, "TwoFANotSetup") });
    return;
  }
  if (!verifyTotp(user.twoFaSecret, parsed.data.code)) {
    res.status(401).json({
      error: "invalid_code",
      error_code: TWO_FA_ERROR.INVALID,
      message: t(req.lang, "Invalid2FACode"),
    });
    return;
  }

  await issueSession(res, req, user, parsed.data.remember_me ?? false, "TwoFactorVerified");
});

router.post("/verify-recovery-code", async (req: Request, res: Response) => {
  const parsed = z
    .object({
      user_id: z.string().min(1),
      code: z.string().min(1),
      remember_me: z.boolean().optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", errors: parsed.error.flatten().fieldErrors });
    return;
  }

  const user = await findUserByPublicId(parsed.data.user_id);
  if (!user) {
    res.status(404).json({ error: "not_found", message: t(req.lang, "UserNotFound") });
    return;
  }
  if (!(await consumeRecoveryCode(user.id, parsed.data.code))) {
    res.status(401).json({ error: "invalid_code", message: t(req.lang, "InvalidRecoveryCode") });
    return;
  }

  await issueSession(res, req, user, parsed.data.remember_me ?? false, "RecoveryCodeUsed");
});

// Protected auth routes
router.get("/me", authMiddleware, async (req: Request, res: Response) => {
  const user = await findUserById(req.auth!.userId);
  if (!user) {
    res.status(404).json({ error: "not_found", message: t(req.lang, "UserNotFound") });
    return;
  }
  res.json({ user: userToResponse(user) });
});

router.get("/dashboard", authMiddleware, async (req: Request, res: Response) => {
  const user = await findUserById(req.auth!.userId);
  res.json({ user: user ? userToResponse(user) : null });
});

router.post("/logout-all", authMiddleware, async (req: Request, res: Response) => {
  await deleteAllRefreshTokens(req.auth!.userId);
  res.json({ message: "All sessions have been invalidated" });
});

router.post("/2fa/setup", authMiddleware, async (req: Request, res: Response) => {
  const user = await findUserById(req.auth!.userId);
  if (!user) {
    res.status(404).json({ error: "not_found", message: t(req.lang, "UserNotFound") });
    return;
  }

  // Secret is stored but 2FA stays disabled until a code proves the pairing.
  const secret = generateTotpSecret();
  await db
    .update(users)
    .set({ twoFaSecret: secret, updatedAt: new Date() })
    .where(eq(users.id, user.id));

  res.json({
    otpauth_url: totpAuthUrl(user.email, secret),
    secret,
    message: t(req.lang, "TwoFASetupGenerated"),
  });
});

router.post("/2fa/verify-setup", authMiddleware, async (req: Request, res: Response) => {
  const parsed = z.object({ code: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", errors: parsed.error.flatten().fieldErrors });
    return;
  }

  const user = await findUserById(req.auth!.userId);
  if (!user) {
    res.status(404).json({ error: "not_found", message: t(req.lang, "UserNotFound") });
    return;
  }
  if (!user.twoFaSecret) {
    res.status(400).json({ error: "not_setup", message: t(req.lang, "TwoFANotSetup") });
    return;
  }
  if (!verifyTotp(user.twoFaSecret, parsed.data.code)) {
    res.status(401).json({
      error: "invalid_code",
      error_code: TWO_FA_ERROR.INVALID,
      message: t(req.lang, "Invalid2FACode"),
    });
    return;
  }

  await enableTwoFa(user.id, user.twoFaSecret);
  const codes = await issueRecoveryCodes(user.id);

  res.json({
    message: t(req.lang, "TwoFAEnabledSuccess"),
    recovery_codes: codes,
    warning: t(req.lang, "RecoveryCodesWarning"),
  });
});

router.post("/change-password", authMiddleware, async (req: Request, res: Response) => {
  const parsed = z
    .object({
      current_password: z.string().min(1),
      new_password: z.string().min(8).max(255),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", errors: parsed.error.flatten().fieldErrors });
    return;
  }

  const user = await findUserById(req.auth!.userId);
  if (!user) {
    res.status(404).json({ error: "not_found", message: t(req.lang, "UserNotFound") });
    return;
  }

  // The current password is what proves intent -- an access token alone is not
  // enough to rotate a password.
  if (!(await verifyPassword(parsed.data.current_password, user.passwordHash))) {
    res.status(401).json({
      error: "invalid_credentials",
      message: t(req.lang, "CurrentPasswordIncorrect"),
    });
    return;
  }

  await db
    .update(users)
    .set({ passwordHash: await hashPassword(parsed.data.new_password), updatedAt: new Date() })
    .where(eq(users.id, user.id));
  // Matches reset-password: a password change signs the account out everywhere,
  // including this caller.
  await deleteAllRefreshTokens(user.id);

  res.json({ message: t(req.lang, "PasswordChangedSuccess") });
});

router.post("/2fa/disable", authMiddleware, async (req: Request, res: Response) => {
  const parsed = z.object({ password: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", errors: parsed.error.flatten().fieldErrors });
    return;
  }

  const user = await findUserById(req.auth!.userId);
  if (!user) {
    res.status(404).json({ error: "not_found", message: t(req.lang, "UserNotFound") });
    return;
  }

  // The account password, not just a valid token: a stolen access token should
  // not be enough to strip the second factor.
  if (!(await verifyPassword(parsed.data.password, user.passwordHash))) {
    res.status(401).json({ error: "invalid_credentials", message: t(req.lang, "InvalidCredentials") });
    return;
  }

  if (!user.twoFaEnabled) {
    res.status(400).json({ error: "not_enabled", message: t(req.lang, "TwoFANotSetup") });
    return;
  }

  await disableTwoFa(user.id);

  res.json({ message: t(req.lang, "TwoFADisabledSuccess") });
});

export default router;
