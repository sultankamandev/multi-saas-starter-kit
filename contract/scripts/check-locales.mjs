/**
 * Locale drift check across every template.
 *
 * The 7 supported locales live in three different layouts:
 *   backends/*            -> locales/<lang>.json
 *   frontends/next-ts     -> messages/<lang>.json
 *   frontends/react-vite-ts -> public/locales/<lang>/translation.json
 *   frontends/vue-vite-ts   -> public/<lang>/translation.json
 *
 * Nothing kept them in sync, so a key added to en.json could silently never
 * reach tr.json. This asserts, per template:
 *   1. all 7 locales exist
 *   2. every locale has exactly the key set of that template's en.json
 *
 * Run: cd contract && npm run check-locales
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..", "..");
const templates = join(repoRoot, "templates");

export const LOCALES = ["en", "tr", "de", "fr", "es", "it", "ru"];

/** Flatten nested message objects to dotted paths so nesting changes are caught too. */
function flatten(obj, prefix = "", out = new Set()) {
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) flatten(v, path, out);
    else out.add(path);
  }
  return out;
}

/** Returns { keys, bom } — a UTF-8 BOM makes JSON.parse throw in strict loaders. */
function readLocale(file) {
  const raw = readFileSync(file, "utf-8");
  const bom = raw.charCodeAt(0) === 0xfeff;
  return { keys: flatten(JSON.parse(bom ? raw.slice(1) : raw)), bom };
}

/** Each target: { name, fileFor(lang) } */
const targets = [];

for (const dir of readdirSync(join(templates, "backends"))) {
  const base = join(templates, "backends", dir, "locales");
  if (!existsSync(base)) continue;
  targets.push({
    name: `backends/${dir}`,
    fileFor: (lang) => join(base, `${lang}.json`),
  });
}

const frontendLayouts = {
  "next-ts": (lang) => join(templates, "frontends", "next-ts", "messages", `${lang}.json`),
  "react-vite-ts": (lang) =>
    join(templates, "frontends", "react-vite-ts", "public", "locales", lang, "translation.json"),
  "vue-vite-ts": (lang) =>
    join(templates, "frontends", "vue-vite-ts", "public", lang, "translation.json"),
};

for (const [dir, fileFor] of Object.entries(frontendLayouts)) {
  if (!existsSync(join(templates, "frontends", dir))) continue;
  targets.push({ name: `frontends/${dir}`, fileFor });
}

let failures = 0;

for (const target of targets) {
  const enFile = target.fileFor("en");
  if (!existsSync(enFile)) {
    console.error(`FAIL ${target.name}: missing en locale (${enFile})`);
    failures++;
    continue;
  }

  const en = readLocale(enFile);
  const enKeys = en.keys;
  const problems = [];
  if (en.bom) problems.push('en: file starts with a UTF-8 BOM (breaks JSON.parse)');

  for (const lang of LOCALES) {
    if (lang === "en") continue;
    const file = target.fileFor(lang);
    if (!existsSync(file)) {
      problems.push(`missing locale "${lang}"`);
      continue;
    }
    const { keys, bom } = readLocale(file);
    if (bom) problems.push(`${lang}: file starts with a UTF-8 BOM (breaks JSON.parse)`);
    const missing = [...enKeys].filter((k) => !keys.has(k));
    const extra = [...keys].filter((k) => !enKeys.has(k));
    if (missing.length) problems.push(`${lang}: missing ${missing.length} key(s): ${missing.slice(0, 5).join(", ")}${missing.length > 5 ? ", ..." : ""}`);
    if (extra.length) problems.push(`${lang}: ${extra.length} key(s) not in en: ${extra.slice(0, 5).join(", ")}${extra.length > 5 ? ", ..." : ""}`);
  }

  if (problems.length) {
    failures++;
    console.error(`FAIL ${target.name} (${enKeys.size} keys in en)`);
    for (const p of problems) console.error(`       ${p}`);
  } else {
    console.log(`OK   ${target.name} (${enKeys.size} keys x ${LOCALES.length} locales)`);
  }
}

if (failures) {
  console.error(`\ncheck-locales: ${failures} template(s) with locale drift`);
  process.exit(1);
}
console.log("\ncheck-locales: all templates consistent");
