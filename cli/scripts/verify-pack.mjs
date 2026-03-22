/**
 * Builds tarball with npm pack and asserts required paths exist inside the package.
 * Run from repo after: cd cli && npm ci && npm run build && npm run bundle-pack-assets
 */
import { execSync } from "node:child_process";
import { existsSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdtempSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliRoot = join(__dirname, "..");

function assert(cond, msg) {
  if (!cond) {
    console.error(`verify-pack: ${msg}`);
    process.exit(1);
  }
}

// Remove stale pack artifacts
for (const f of readdirSync(cliRoot)) {
  if (f.endsWith(".tgz")) {
    rmSync(join(cliRoot, f), { force: true });
  }
}

execSync("npm pack", { cwd: cliRoot, stdio: "inherit" });

const tgz = readdirSync(cliRoot).find((f) => f.endsWith(".tgz"));
assert(tgz, "no .tgz produced by npm pack");

const extractDir = mkdtempSync(join(tmpdir(), "create-saas-app-pack-"));
const tarball = join(cliRoot, tgz);

try {
  execSync(`tar -xf "${tarball}"`, { cwd: extractDir, stdio: "inherit" });
} catch {
  console.error("verify-pack: tar extraction failed (tar required)");
  process.exit(1);
}

const pkgRoot = join(extractDir, "package");
const required = [
  "dist/index.js",
  "templates/backends/_manifest.json",
  "contract/openapi.yaml",
  "contract/generated/types.ts",
  "docs/CONTRIBUTING.md",
];

for (const rel of required) {
  const p = join(pkgRoot, rel);
  assert(existsSync(p), `missing ${rel} in packed tarball`);
}

console.log("verify-pack: OK", tgz);
rmSync(tarball, { force: true });
