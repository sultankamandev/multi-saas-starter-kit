import { describe, it, expect, beforeAll } from "vitest";
import { createClient, generateTestUser } from "./client.js";

describe("User Profile", () => {
  let accessToken: string;

  beforeAll(async () => {
    const api = createClient();
    const user = generateTestUser();

    await api.post("/auth/register", {
      username: user.username,
      first_name: user.firstName,
      last_name: user.lastName,
      email: user.email,
      password: user.password,
    });

    const loginRes = await api.post("/auth/login", {
      email_or_username: user.email,
      password: user.password,
    });

    if (loginRes.data.access_token) {
      accessToken = loginRes.data.access_token;
    }
  });

  it("GET /api/user/profile returns user data", async () => {
    if (!accessToken) return;
    const api = createClient(accessToken);
    const res = await api.get("/api/user/profile");
    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty("user");
    expect(res.data.user).toHaveProperty("id");
    expect(res.data.user).toHaveProperty("email");
    expect(typeof res.data.user.id).toBe("string");
  });

  it("PUT /api/user/profile updates profile fields", async () => {
    if (!accessToken) return;
    const api = createClient(accessToken);
    const res = await api.put("/api/user/profile", {
      first_name: "Updated",
      last_name: "Name",
      language: "tr",
    });
    expect(res.status).toBe(200);
    expect(res.data.user.first_name).toBe("Updated");
    expect(res.data.user.last_name).toBe("Name");
  });

  it("GET /api/user/profile fails without auth", async () => {
    const api = createClient();
    const res = await api.get("/api/user/profile");
    expect(res.status).toBe(401);
  });
});
