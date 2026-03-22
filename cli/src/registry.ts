import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Manifest, TemplateEntry } from "./types.js";

export function getTemplatesRoot(): string {
  // In development: ../templates  (relative to cli/)
  // In published package: ./templates (bundled alongside dist/)
  const devPath = join(import.meta.dirname, "..", "..", "templates");
  const pkgPath = join(import.meta.dirname, "..", "templates");

  try {
    readFileSync(join(devPath, "backends", "_manifest.json"), "utf-8");
    return devPath;
  } catch {
    return pkgPath;
  }
}

function loadManifest(category: string): Manifest {
  const root = getTemplatesRoot();
  const raw = readFileSync(
    join(root, category, "_manifest.json"),
    "utf-8"
  );
  return JSON.parse(raw) as Manifest;
}

export function getBackends(): TemplateEntry[] {
  return loadManifest("backends").templates.filter(
    (t) => t.status !== "experimental"
  );
}

export function getFrontends(): TemplateEntry[] {
  return loadManifest("frontends").templates.filter(
    (t) => t.status !== "experimental"
  );
}
