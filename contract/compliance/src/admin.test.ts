import { describe, it, expect, beforeAll } from "vitest";
import { createClient } from "./client.js";

/**
 * Admin compliance tests require an admin user.
 * Set ADMIN_EMAIL and ADMIN_PASSWORD env vars, or these tests will be skipped.
 */
describe("Admin", () => {
  let adminToken: string | undefined;

  beforeAll(async () => {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    if (!email || !password) return;

    const api = createClient();
    const res = await api.post("/auth/login", {
      email_or_username: email,
      password,
    });
    if (res.data.access_token) {
      adminToken = res.data.access_token;
    }
  });

  it("GET /api/admin/users returns paginated list", async () => {
    if (!adminToken) return;
    const api = createClient(adminToken);
    const res = await api.get("/api/admin/users");
    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty("data");
    expect(Array.isArray(res.data.data)).toBe(true);
    expect(res.data).toHaveProperty("total");
  });

  it("GET /api/admin/user-stats returns summary", async () => {
    if (!adminToken) return;
    const api = createClient(adminToken);
    const res = await api.get("/api/admin/user-stats");
    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty("total_users");
    expect(res.data).toHaveProperty("verified_users");
  });

  it("GET /api/admin/summary returns KPIs", async () => {
    if (!adminToken) return;
    const api = createClient(adminToken);
    const res = await api.get("/api/admin/summary");
    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty("total_users");
  });

  it("GET /api/admin/analytics/user-registrations returns data", async () => {
    if (!adminToken) return;
    const api = createClient(adminToken);
    const res = await api.get("/api/admin/analytics/user-registrations");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);
  });

  it("GET /api/admin/analytics/active-users returns data", async () => {
    if (!adminToken) return;
    const api = createClient(adminToken);
    const res = await api.get("/api/admin/analytics/active-users");
    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty("daily");
    expect(res.data).toHaveProperty("active_24h");
  });

  it("GET /api/admin/settings returns array", async () => {
    if (!adminToken) return;
    const api = createClient(adminToken);
    const res = await api.get("/api/admin/settings");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);
  });

  // These two toggles drifted between templates (node-express served them at
  // /settings/verification while go and python used /settings/email-verification),
  // and nothing caught it. Assert the path AND the payload shape.
  it("GET /api/admin/settings/email-verification returns typed toggle", async () => {
    if (!adminToken) return;
    const api = createClient(adminToken);
    const res = await api.get("/api/admin/settings/email-verification");
    expect(res.status).toBe(200);
    expect(typeof res.data.require_email_verification).toBe("boolean");
    expect(["database", "default"]).toContain(res.data.source);
  });

  it("PUT /api/admin/settings/email-verification round-trips", async () => {
    if (!adminToken) return;
    const api = createClient(adminToken);
    const before = await api.get("/api/admin/settings/email-verification");
    const original = before.data.require_email_verification as boolean;

    const res = await api.put("/api/admin/settings/email-verification", {
      require_email_verification: !original,
    });
    expect(res.status).toBe(200);
    expect(res.data.require_email_verification).toBe(!original);
    expect(typeof res.data.message).toBe("string");

    const after = await api.get("/api/admin/settings/email-verification");
    expect(after.data.require_email_verification).toBe(!original);
    expect(after.data.source).toBe("database");

    // restore
    await api.put("/api/admin/settings/email-verification", {
      require_email_verification: original,
    });
  });

  it("GET /api/admin/settings/2fa returns typed toggle", async () => {
    if (!adminToken) return;
    const api = createClient(adminToken);
    const res = await api.get("/api/admin/settings/2fa");
    expect(res.status).toBe(200);
    expect(typeof res.data.require_2fa).toBe("boolean");
    expect(["database", "default"]).toContain(res.data.source);
  });

  it("PUT /api/admin/settings/2fa round-trips", async () => {
    if (!adminToken) return;
    const api = createClient(adminToken);
    const before = await api.get("/api/admin/settings/2fa");
    const original = before.data.require_2fa as boolean;

    const res = await api.put("/api/admin/settings/2fa", { require_2fa: !original });
    expect(res.status).toBe(200);
    expect(res.data.require_2fa).toBe(!original);
    expect(typeof res.data.message).toBe("string");

    const after = await api.get("/api/admin/settings/2fa");
    expect(after.data.require_2fa).toBe(!original);

    // restore
    await api.put("/api/admin/settings/2fa", { require_2fa: original });
  });

  it("GET /api/admin/blocked-ips returns array", async () => {
    if (!adminToken) return;
    const api = createClient(adminToken);
    const res = await api.get("/api/admin/blocked-ips");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);
  });

  it("GET /api/admin/users requires admin role", async () => {
    const api = createClient();
    const res = await api.get("/api/admin/users");
    expect([401, 403]).toContain(res.status);
  });
});
