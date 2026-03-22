/**
 * Copies monorepo templates/, contract/, and docs/ into cli/ for npm publish.
 * Skips dependency and build artifacts (same spirit as scaffolder SKIP_DIRS).
 */
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import fse from "fs-extra";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliRoot = join(__dirname, "..");
const repoRoot = join(cliRoot, "..");

const SKIP_DIR_NAMES = new Set([
  "node_modules",
  ".next",
  "dist",
  "__pycache__",
  ".venv",
  "venv",
  "vendor",
  ".git",
  "build",
  "out",
  ".turbo",
  "coverage",
  ".eggs",
]);

function shouldCopySource(src) {
  const norm = src.replace(/\\/g, "/");
  const segments = norm.split("/").filter(Boolean);
  for (const seg of segments) {
    if (SKIP_DIR_NAMES.has(seg)) return false;
    if (seg.endsWith(".egg-info")) return false;
  }
  const base = segments[segments.length - 1] ?? "";
  if (base === ".env" || (base.startsWith(".env.") && base !== ".env.example")) {
    return false;
  }
  if (
    base.endsWith(".exe") ||
    base.endsWith(".dll") ||
    base === ".DS_Store" ||
    base === "Thumbs.db"
  ) {
    return false;
  }
  return true;
}

function copyTree(label, relSrc, relDest) {
  const from = join(repoRoot, relSrc);
  const to = join(cliRoot, relDest);
  if (!existsSync(from)) {
    console.error(`bundle-pack-assets: missing source ${from}`);
    process.exit(1);
  }
  mkdirSync(cliRoot, { recursive: true });
  fse.copySync(from, to, {
    filter: (src) => shouldCopySource(src),
  });
  console.log(`bundle-pack-assets: ${label} -> ${relDest}`);
}

copyTree("templates", "templates", "templates");
copyTree("contract", "contract", "contract");
copyTree("docs", "docs", "docs");
