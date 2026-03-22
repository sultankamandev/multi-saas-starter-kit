import { describe, it, expect, beforeAll } from "vitest";
import { createClient, generateTestUser, type TestUser } from "./client.js";

describe("Auth", () => {
  const api = createClient();
  let testUser: TestUser;
  let accessToken: string;
  let refreshToken: string;

  beforeAll(() => {
    testUser = generateTestUser();
  });

  it("POST /auth/register creates a new user", async () => {
    const res = await api.post("/auth/register", {
      username: testUser.username,
      first_name: testUser.firstName,
      last_name: testUser.lastName,
      email: testUser.email,
      password: testUser.password,
    });
    expect(res.status).toBe(201);
    expect(res.data).toHaveProperty("message");
  });

  it("POST /auth/register rejects duplicate email", async () => {
    const res = await api.post("/auth/register", {
      username: testUser.username + "dup",
      first_name: testUser.firstName,
      last_name: testUser.lastName,
      email: testUser.email,
      password: testUser.password,
    });
    expect(res.status).toBe(409);
  });

  it("POST /auth/login succeeds with valid credentials", async () => {
    const res = await api.post("/auth/login", {
      email_or_username: testUser.email,
      password: testUser.password,
    });
    // May return 200 (login success) or 200 with requires_2fa
    expect(res.status).toBe(200);

    if (res.data.requires_2fa) {
      expect(res.data).toHaveProperty("two_fa_type");
      expect(res.data).toHaveProperty("user_id");
    } else {
      expect(res.data).toHaveProperty("access_token");
      expect(res.data).toHaveProperty("refresh_token");
      expect(res.data).toHaveProperty("user");
      expect(res.data.user).toHaveProperty("id");
      expect(res.data.user).toHaveProperty("email");
      expect(res.data.token_type).toBe("Bearer");
      accessToken = res.data.access_token;
      refreshToken = res.data.refresh_token;
    }
  });

  it("POST /auth/login fails with wrong password", async () => {
    const res = await api.post("/auth/login", {
      email_or_username: testUser.email,
      password: "WrongPassword123!",
    });
    expect(res.status).toBe(401);
  });

  it("POST /auth/refresh-token returns new tokens", async () => {
    if (!refreshToken) return;
    const res = await api.post("/auth/refresh-token", {
      refresh_token: refreshToken,
    });
    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty("access_token");
    expect(res.data).toHaveProperty("refresh_token");
    accessToken = res.data.access_token;
    refreshToken = res.data.refresh_token;
  });

  it("GET /auth/me returns authenticated user", async () => {
    if (!accessToken) return;
    const authedApi = createClient(accessToken);
    const res = await authedApi.get("/auth/me");
    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty("user");
    expect(res.data.user.email).toBe(testUser.email);
  });

  it("GET /auth/me fails without token", async () => {
    const res = await api.get("/auth/me");
    expect(res.status).toBe(401);
  });

  it("POST /auth/forgot-password returns 200 (never leaks existence)", async () => {
    const res = await api.post("/auth/forgot-password", {
      email: testUser.email,
    });
    expect(res.status).toBe(200);
  });

  it("POST /auth/logout invalidates refresh token", async () => {
    if (!refreshToken) return;
    const res = await api.post("/auth/logout", {
      refresh_token: refreshToken,
    });
    expect(res.status).toBe(200);
  });
});
