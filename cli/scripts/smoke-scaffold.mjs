/**
 * Programmatic scaffold smoke test (no prompts). Run from monorepo: cd cli && npm run build && npm run bundle-pack-assets (optional) && npm run smoke-scaffold
 */
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliRoot = join(__dirname, "..");

process.chdir(cliRoot);

const { scaffold } = await import("../dist/scaffolder.js");
const { getBackends, getFrontends } = await import("../dist/registry.js");

function assert(cond, msg) {
  if (!cond) {
    console.error(`smoke-scaffold: ${msg}`);
    process.exit(1);
  }
}

const backends = getBackends();
const frontends = getFrontends();
const go = backends.find((b) => b.id === "go-gin");
const py = backends.find((b) => b.id === "python-fastapi");
const react = frontends.find((f) => f.id === "react-vite-ts");
const next = frontends.find((f) => f.id === "next-ts");

assert(go && py && react && next, "could not resolve template entries from manifest");

const base = mkdtempSync(join(tmpdir(), "saas-smoke-"));

const scenarios = [
  { name: "go-react", backend: go, frontend: react },
  { name: "python-next", backend: py, frontend: next },
];

for (const { name, backend, frontend } of scenarios) {
  const targetDir = join(base, name);
  mkdirSync(targetDir, { recursive: true });

  await scaffold(targetDir, {
    projectName: name,
    backend,
    frontend,
    includeDocker: false,
    includeCi: "none",
  });

  assert(
    existsSync(join(targetDir, "docs", "openapi.yaml")),
    `${name}: missing docs/openapi.yaml`
  );
  assert(
    existsSync(join(targetDir, "frontend", "src", "types", "api-generated.ts")),
    `${name}: missing frontend/src/types/api-generated.ts`
  );
  assert(
    existsSync(join(targetDir, "backend")),
    `${name}: missing backend/`
  );
  console.log(`smoke-scaffold: OK ${name}`);
}

rmSync(base, { recursive: true, force: true });
console.log("smoke-scaffold: all scenarios passed");
