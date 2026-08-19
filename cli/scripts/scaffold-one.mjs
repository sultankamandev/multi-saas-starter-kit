/**
 * Scaffold a single project to a given directory, without prompts.
 * Used by CI to produce a real project that `docker compose build` can build.
 *
 * Usage: node scripts/scaffold-one.mjs <outDir> <backendId> <frontendId>
 */
import { mkdirSync, rmSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliRoot = join(__dirname, "..");
process.chdir(cliRoot);

const { scaffold } = await import(
  pathToFileURL(join(cliRoot, "dist", "scaffolder.js")).href
);
const { getBackends, getFrontends } = await import(
  pathToFileURL(join(cliRoot, "dist", "registry.js")).href
);

const [outDirArg, backendId, frontendId] = process.argv.slice(2);
if (!outDirArg || !backendId || !frontendId) {
  console.error(
    "usage: node scripts/scaffold-one.mjs <outDir> <backendId> <frontendId>"
  );
  process.exit(1);
}

const backend = getBackends().find((b) => b.id === backendId);
const frontend = getFrontends().find((f) => f.id === frontendId);
if (!backend) {
  console.error(`unknown backend id: ${backendId}`);
  process.exit(1);
}
if (!frontend) {
  console.error(`unknown frontend id: ${frontendId}`);
  process.exit(1);
}

const outDir = resolve(outDirArg);
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

await scaffold(outDir, {
  projectName: "ci-scaffold",
  backend,
  frontend,
  includeDocker: true,
  includeCi: "none",
});

console.log(`scaffolded ${backendId} + ${frontendId} -> ${outDir}`);
