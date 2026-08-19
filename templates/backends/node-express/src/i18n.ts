import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Mirrors the Go (pkg/i18n) and Python (app/i18n) loaders: one flat JSON file
 * per language in locales/, keyed by message id, with English as the fallback.
 */
export type Translations = Record<string, string>;

const languages = new Map<string, Translations>();

export const DEFAULT_LANGUAGE = "en";

function localesDir(): string {
  // dist/i18n.js -> ../locales, src/i18n.ts -> ../locales
  return join(dirname(fileURLToPath(import.meta.url)), "..", "locales");
}

export function loadLocales(dir: string = localesDir()): void {
  for (const file of readdirSync(dir)) {
    if (!file.endsWith(".json")) continue;
    const lang = file.slice(0, 2);
    const raw = readFileSync(join(dir, file), "utf-8");
    languages.set(lang, JSON.parse(raw) as Translations);
  }
  console.log(`Loaded ${languages.size} languages`);
}

export function isLanguageSupported(lang: string): boolean {
  return languages.has(lang);
}

export function t(lang: string, key: string): string {
  return (
    languages.get(lang)?.[key] ??
    languages.get(DEFAULT_LANGUAGE)?.[key] ??
    key
  );
}
