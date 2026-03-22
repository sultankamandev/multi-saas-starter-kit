import { Router, type Request, type Response } from "express";
import { z } from "zod";
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
import { env } from "../config/env.js";

const router = Router();
router.use(authRateLimiter);

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
      res.status(409).json({ error: "conflict", message: "Email already registered" });
      return;
    }

    await createUser({
      username: parsed.data.username,
      firstName: parsed.data.first_name,
      lastName: parsed.data.last_name,
      email: parsed.data.email,
      password: parsed.data.password,
      language: parsed.data.language,
      country: parsed.data.country,
    });

    res.status(201).json({ message: "Registration successful. Please verify your email." });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Registration failed";
    if (msg.includes("unique") || msg.includes("duplicate")) {
      res.status(409).json({ error: "conflict", message: "Email or username already exists" });
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
    res.status(401).json({ error: "unauthorized", message: "Invalid credentials" });
    return;
  }

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "unauthorized", message: "Invalid credentials" });
    return;
  }

  if (user.twoFaEnabled) {
    const twoFaType = user.twoFaSecret ? "totp" : "email";
    res.json({
      requires_2fa: true,
      two_fa_type: twoFaType,
      user_id: user.publicId,
      message: "2FA verification required",
    });
    return;
  }

  const tokens = generateTokens(user.id, user.publicId, user.role);
  const expiresAt = new Date(Date.now() + (parsed.data.remember_me ? 30 : 7) * 86400000);
  await storeRefreshToken(user.id, tokens.refreshToken, expiresAt);

  res.json({
    message: "Login successful",
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
    res.status(401).json({ error: "unauthorized", message: "Invalid or expired refresh token" });
    return;
  }

  const user = await findUserById(row.userId);
  if (!user) {
    res.status(401).json({ error: "unauthorized", message: "User not found" });
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
  res.json({ message: "Logged out successfully" });
});

router.post("/forgot-password", async (req: Request, res: Response) => {
  res.json({ message: "If an account with that email exists, a reset link has been sent." });
});

router.post("/reset-password", async (req: Request, res: Response) => {
  res.status(400).json({ error: "not_implemented", message: "Password reset via token not yet implemented" });
});

router.get("/verify-email", async (req: Request, res: Response) => {
  res.json({ message: "Email verification not yet implemented" });
});

router.post("/google-login", async (req: Request, res: Response) => {
  res.status(501).json({ error: "not_implemented", message: "Google OAuth not yet implemented" });
});

// 2FA stubs
router.post("/verify-2fa", async (_req: Request, res: Response) => {
  res.status(501).json({ error: "not_implemented", message: "2FA verification not yet implemented" });
});
router.post("/resend-2fa", async (_req: Request, res: Response) => {
  res.status(501).json({ error: "not_implemented", message: "2FA resend not yet implemented" });
});
router.post("/verify-totp-login", async (_req: Request, res: Response) => {
  res.status(501).json({ error: "not_implemented", message: "TOTP login not yet implemented" });
});
router.post("/verify-recovery-code", async (_req: Request, res: Response) => {
  res.status(501).json({ error: "not_implemented", message: "Recovery code not yet implemented" });
});

// Protected auth routes
router.get("/me", authMiddleware, async (req: Request, res: Response) => {
  const user = await findUserById(req.auth!.userId);
  if (!user) {
    res.status(404).json({ error: "not_found", message: "User not found" });
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

router.post("/2fa/setup", authMiddleware, async (_req: Request, res: Response) => {
  res.status(501).json({ error: "not_implemented", message: "2FA setup not yet implemented" });
});

router.post("/2fa/verify-setup", authMiddleware, async (_req: Request, res: Response) => {
  res.status(501).json({ error: "not_implemented", message: "2FA verify setup not yet implemented" });
});

export default router;
