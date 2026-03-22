import { describe, it, expect } from "vitest";
import { createClient } from "./client.js";

describe("Health", () => {
  const api = createClient();

  it("GET /ping returns 200", async () => {
    const res = await api.get("/ping");
    expect(res.status).toBe(200);
  });
});
