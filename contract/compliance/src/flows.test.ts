import { describe, it, expect, beforeAll } from "vitest";
import { authenticator } from "otplib";
import { createClient, generateTestUser, type TestUser } from "./client.js";
import { mailEnabled, waitForToken, clearMail } from "./mailpit.js";

/**
 * End-to-end flows the core suite never touches: email verification, password
 * reset, and TOTP 2FA (setup, login, recovery-code login).
 *
 * These require a mail sink, so the whole describe skips unless MAILPIT_URL is
 * set and the backend's SMTP_* point at it. Run with, e.g.:
 *   API_URL=http://localhost:8080 MAILPIT_URL=http://localhost:8025 npm test
 */
const enabled = mailEnabled();
const maybe = enabled ? describe : describe.skip;

// The link tokens in emails. Backends put the token in a /verify-email?token=
// and /reset-password?token= URL; accept either query style or a bare token.
const VERIFY_TOKEN = /verify-email\?token=([A-Za-z0-9._-]+)/;
const RESET_TOKEN = /reset-password\?token=([A-Za-z0-9._-]+)/;

async function registerAndVerify(): Promise<TestUser> {
  const api = createClient();
  const user = generateTestUser();
  await clearMail();
  const reg = await api.post("/auth/register", {
    username: user.username,
    first_name: user.firstName,
    last_name: user.lastName,
    email: user.email,
    password: user.password,
  });
  expect(reg.status).toBe(201);
  const token = await waitForToken(user.email, VERIFY_TOKEN);
  const verify = await api.get(`/auth/verify-email?token=${encodeURIComponent(token)}`);
  expect(verify.status).toBe(200);
  return user;
}

async function login(user: TestUser, password = user.password) {
  const api = createClient();
  return api.post("/auth/login", { email_or_username: user.email, password });
}

maybe("Email verification flow", () => {
  it("register emails a token that verifies the account and unblocks login", async () => {
    const user = await registerAndVerify();
    const res = await login(user);
    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty("access_token");
  });

  it("rejects a bogus verification token", async () => {
    const api = createClient();
    const res = await api.get("/auth/verify-email?token=not-a-real-token");
    expect([400, 401, 404]).toContain(res.status);
  });
});

maybe("Password reset flow", () => {
  it("forgot-password emails a token that sets a new password", async () => {
    const user = await registerAndVerify();
    const api = createClient();

    await clearMail();
    const forgot = await api.post("/auth/forgot-password", { email: user.email });
    expect(forgot.status).toBe(200);

    const token = await waitForToken(user.email, RESET_TOKEN);
    const newPassword = "NewPass456!@#";
    const reset = await api.post("/auth/reset-password", {
      token,
      new_password: newPassword,
    });
    expect(reset.status).toBe(200);

    // New password works, old one does not.
    expect((await login(user, newPassword)).status).toBe(200);
    expect((await login(user, user.password)).status).toBe(401);
  });

  it("rejects a bogus reset token", async () => {
    const api = createClient();
    const res = await api.post("/auth/reset-password", {
      token: "not-a-real-token",
      new_password: "Whatever123!@#",
    });
    expect([400, 401, 404]).toContain(res.status);
  });
});

maybe("TOTP 2FA flow", () => {
  let user: TestUser;
  let accessToken: string;
  let secret: string;
  let recoveryCodes: string[];

  beforeAll(async () => {
    user = await registerAndVerify();
    const res = await login(user);
    accessToken = res.data.access_token;
  });

  it("2fa/setup returns an otpauth url and secret", async () => {
    const api = createClient(accessToken);
    const res = await api.post("/auth/2fa/setup", {});
    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty("secret");
    expect(res.data.otpauth_url).toContain("otpauth://");
    secret = res.data.secret;
  });

  it("2fa/verify-setup with a valid code enables 2FA and returns recovery codes", async () => {
    const api = createClient(accessToken);
    const res = await api.post("/auth/2fa/verify-setup", {
      code: authenticator.generate(secret),
    });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data.recovery_codes)).toBe(true);
    expect(res.data.recovery_codes.length).toBeGreaterThan(0);
    recoveryCodes = res.data.recovery_codes;
  });

  it("login now demands a second factor", async () => {
    const res = await login(user);
    expect(res.status).toBe(200);
    expect(res.data.requires_2fa).toBe(true);
    expect(res.data.two_fa_type).toBe("totp");
    expect(res.data).toHaveProperty("user_id");
  });

  it("verify-totp-login with a valid code completes login", async () => {
    const challenge = await login(user);
    const api = createClient();
    const res = await api.post("/auth/verify-totp-login", {
      user_id: challenge.data.user_id,
      code: authenticator.generate(secret),
    });
    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty("access_token");
  });

  it("a recovery code also completes login, and only once", async () => {
    const challenge = await login(user);
    const api = createClient();
    const code = recoveryCodes[0];

    const first = await api.post("/auth/verify-recovery-code", {
      user_id: challenge.data.user_id,
      code,
    });
    expect(first.status).toBe(200);
    expect(first.data).toHaveProperty("access_token");

    // Same code must not work twice.
    const challenge2 = await login(user);
    const second = await api.post("/auth/verify-recovery-code", {
      user_id: challenge2.data.user_id,
      code,
    });
    expect(second.status).toBe(401);
  });
});
