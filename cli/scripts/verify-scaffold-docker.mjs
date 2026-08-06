/**
 * Scaffold every backend x frontend combo with Docker enabled and verify that
 * each emitted Dockerfile's COPY sources resolve inside the generated build
 * context.
 *
 * Why this exists: the Dockerfiles are authored against the monorepo layout
 * (backend/go-api, frontend/react-web) but the scaffolder emits plain
 * backend/ and frontend/. That drift silently broke `docker compose up --build`
 * for 5 of 6 stacks because nothing ever built a *scaffolded* project.
 *
 * This is a fast static check. CI additionally runs a real `docker compose
 * build` (see .github/workflows/ci.yml) for one representative combo.
 *
 * Run from the monorepo: cd cli && npm run build && npm run verify-scaffold-docker
 */
import {
  mkdtempSync,
  rmSync,
  readFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
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

/** Collect unresolvable COPY sources for one Dockerfile. */
function checkDockerfile(projectDir, dockerfileName) {
  const problems = [];
  const dockerfilePath = join(projectDir, "docker", dockerfileName);

  if (!existsSync(dockerfilePath)) {
    return [`missing Dockerfile docker/${dockerfileName}`];
  }

  for (const line of readFileSync(dockerfilePath, "utf-8").split("\n")) {
    const match = line.match(/^COPY\s+(?!--from)(.+)$/);
    if (!match) continue;

    const parts = match[1].trim().split(/\s+/);
    // Last token is the destination.
    for (const src of parts.slice(0, -1)) {
      if (src.startsWith("--")) continue;

      if (src.includes("*")) {
        const slash = src.lastIndexOf("/");
        const parent = slash === -1 ? "." : src.slice(0, slash);
        const pattern = src.slice(slash + 1);
        const absParent = join(projectDir, parent);

        if (!existsSync(absParent)) {
          problems.push(`${dockerfileName}: COPY ${src} -> missing dir ${parent}`);
          continue;
        }
        const rx = new RegExp(
          "^" + pattern.replace(/[.]/g, "\\.").replace(/\*/g, ".*") + "$"
        );
        if (!readdirSync(absParent).some((f) => rx.test(f))) {
          problems.push(`${dockerfileName}: COPY ${src} -> no match in ${parent}/`);
        }
      } else if (!existsSync(join(projectDir, src))) {
        problems.push(`${dockerfileName}: COPY ${src} -> missing ${src}`);
      }
    }
  }
  return problems;
}

const base = mkdtempSync(join(tmpdir(), "saas-scaffold-docker-"));
let failures = 0;

try {
  for (const backend of getBackends()) {
    for (const frontend of getFrontends()) {
      const name = `${backend.id}__${frontend.id}`;
      const projectDir = join(base, name);
      mkdirSync(projectDir, { recursive: true });

      await scaffold(projectDir, {
        projectName: name,
        backend,
        frontend,
        includeDocker: true,
        includeCi: "none",
      });

      const problems = [
        ...checkDockerfile(projectDir, backend.dockerfile),
        ...checkDockerfile(projectDir, frontend.dockerfile),
      ];

      if (!existsSync(join(projectDir, "docker-compose.yml"))) {
        problems.push("missing docker-compose.yml");
      }

      if (problems.length) {
        failures++;
        console.error(`FAIL ${name}`);
        for (const p of problems) console.error(`       ${p}`);
      } else {
        console.log(`OK   ${name}`);
      }
    }
  }
} finally {
  rmSync(base, { recursive: true, force: true });
}

if (failures) {
  console.error(`\nverify-scaffold-docker: ${failures} combo(s) broken`);
  process.exit(1);
}
console.log("\nverify-scaffold-docker: all combos OK");
