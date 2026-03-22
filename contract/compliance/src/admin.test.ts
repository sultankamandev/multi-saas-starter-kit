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
