import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { createClient } from "./client.js";

/**
 * Guards against the drift the other tests cannot see: an endpoint that is in
 * the contract but was never wired into a backend's router.
 *
 * The type checks in CI only cover TypeScript — the Go and Python DTOs are
 * hand-written and nothing compares them to openapi.yaml, so a path could be
 * dropped from one implementation and every other job would stay green.
 *
 * Rather than parsing three routers with three different regexes, this asks the
 * running server. Requests are sent with no credentials, so protected routes
 * answer 401 and destructive ones never execute — every status except 404 and
 * 405 proves the route is registered at the path the contract claims.
 */
const here = dirname(fileURLToPath(import.meta.url));

// contract/compliance/src -> contract/openapi.yaml in the monorepo,
// tests/compliance/src -> docs/openapi.yaml in a scaffolded project.
const SPEC_CANDIDATES = [
  join(here, "..", "..", "openapi.yaml"),
  join(here, "..", "..", "..", "docs", "openapi.yaml"),
];

const METHODS = ["get", "post", "put", "patch", "delete"] as const;

// Stand-ins for path parameters. They only have to be well-formed enough that
// the router matches; nothing is looked up, because the request is unauthorized.
const PARAM_VALUES: Record<string, string> = {
  id: "00000000-0000-0000-0000-000000000000",
  ip: "192.0.2.1",
  key: "require_email_verification",
};

function loadSpecPaths(): Array<{ method: string; path: string }> {
  const specPath = SPEC_CANDIDATES.find((p) => existsSync(p));
  if (!specPath) return [];

  const spec = parse(readFileSync(specPath, "utf-8")) as {
    paths?: Record<string, Record<string, unknown>>;
  };

  const out: Array<{ method: string; path: string }> = [];
  for (const [path, operations] of Object.entries(spec.paths ?? {})) {
    for (const method of METHODS) {
      if (operations[method]) out.push({ method, path });
    }
  }
  return out;
}

function fillParams(path: string): string {
  return path.replace(/\{(\w+)\}/g, (_, name: string) => PARAM_VALUES[name] ?? "1");
}

describe("Contract coverage", () => {
  const api = createClient();
  const operations = loadSpecPaths();

  it("routes every path defined in openapi.yaml", async () => {
    expect(
      operations.length,
      "could not locate openapi.yaml next to the suite"
    ).toBeGreaterThan(0);

    const missing: string[] = [];

    for (const { method, path } of operations) {
      const res = await api.request({ method, url: fillParams(path) });
      // 404 = no such route. 405 = the path exists but not for this verb.
      if (res.status === 404 || res.status === 405) {
        missing.push(`${method.toUpperCase()} ${path} -> ${res.status}`);
      }
    }

    expect(missing, `${missing.length} contract path(s) not routed`).toEqual([]);
  });
});
