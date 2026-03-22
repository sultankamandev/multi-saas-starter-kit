/**
 * Removes ephemeral copies under cli/ after npm publish (or local testing).
 */
import { rmSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliRoot = join(__dirname, "..");

for (const name of ["templates", "contract", "docs"]) {
  const p = join(cliRoot, name);
  if (existsSync(p)) {
    rmSync(p, { recursive: true, force: true });
    console.log(`clean-pack-assets: removed ${name}/`);
  }
}
