import { join, relative, basename } from "node:path";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import fse from "fs-extra";
import ejs from "ejs";
import type { ScaffoldOptions } from "./types.js";
import { getTemplatesRoot } from "./registry.js";

const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  "dist",
  "__pycache__",
  ".venv",
  "vendor",
  ".git",
]);

const MAINTAINER_DOCS = new Set([
  "CONTRIBUTING.md",
  "TEMPLATE_SPEC.md",
  "maintainers.md",
  "architecture.md",
  "design",
]);

const SKIP_FILES = new Set(["server.exe", ".DS_Store", "Thumbs.db", ".env"]);

function walkDir(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (SKIP_DIRS.has(entry) || SKIP_FILES.has(entry)) continue;
    const stat = statSync(full);
    if (stat.isDirectory()) {
      results.push(...walkDir(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

function renderEjs(
  templatePath: string,
  data: Record<string, unknown>
): string {
  const content = readFileSync(templatePath, "utf-8");
  return ejs.render(content, data, { filename: templatePath });
}

export async function scaffold(
  targetDir: string,
  options: ScaffoldOptions
): Promise<void> {
  const root = getTemplatesRoot();
  const ejsData = {
    projectName: options.projectName,
    backend: options.backend,
    frontend: options.frontend,
    includeDocker: options.includeDocker,
    includeCi: options.includeCi,
  };

  await fse.ensureDir(targetDir);

  // 1. Copy shared files
  const sharedDir = join(root, "_shared");
  if (existsSync(sharedDir)) {
    for (const file of walkDir(sharedDir)) {
      const relPath = relative(sharedDir, file);
      const destName = relPath.replace(/\.ejs$/, "");
      const destPath = join(targetDir, destName);
      await fse.ensureDir(join(destPath, ".."));

      if (file.endsWith(".ejs")) {
        const rendered = renderEjs(file, ejsData);
        await fse.writeFile(destPath, rendered, "utf-8");
      } else {
        await fse.copy(file, destPath);
      }
    }
  }

  // 2. Copy backend template
  const backendSrc = join(root, "backends", options.backend.dir);
  const backendDest = join(targetDir, "backend");
  await copyTemplate(backendSrc, backendDest);

  // 3. Copy frontend template
  const frontendSrc = join(root, "frontends", options.frontend.dir);
  const frontendDest = join(targetDir, "frontend");
  await copyTemplate(frontendSrc, frontendDest);

  // 4. Copy API docs, minus the ones addressed to maintainers of this repo.
  const docsDir = join(root, "..", "docs");
  if (existsSync(docsDir)) {
    await fse.copy(docsDir, join(targetDir, "docs"), {
      filter: (src) => !MAINTAINER_DOCS.has(basename(src)),
    });
  }

  // 5. Copy OpenAPI contract and generated types
  const contractFile = join(root, "..", "contract", "openapi.yaml");
  if (existsSync(contractFile)) {
    await fse.ensureDir(join(targetDir, "docs"));
    await fse.copy(contractFile, join(targetDir, "docs", "openapi.yaml"));
  }

  const generatedTypes = join(root, "..", "contract", "generated", "types.ts");
  if (existsSync(generatedTypes)) {
    const typesDir = join(targetDir, "frontend", "src", "types");
    await fse.ensureDir(typesDir);
    await fse.copy(generatedTypes, join(typesDir, "api-generated.ts"));
  }

  // 6. Copy the compliance suite so the contract stays checkable after the
  // project is handed over. node_modules and .env are filtered by walkDir.
  const complianceSrc = join(root, "..", "contract", "compliance");
  if (existsSync(complianceSrc)) {
    const complianceDest = join(targetDir, "tests", "compliance");
    await copyTemplate(complianceSrc, complianceDest);

    // Point it at the backend that was actually chosen. Written as a file
    // because `API_URL=... npm test` is POSIX-only and silently does nothing
    // on Windows.
    const defaults = [
      "# Non-secret defaults for the compliance suite. Committed on purpose.",
      "# Real environment variables override anything set here.",
      "",
      "# The backend under test.",
      `API_URL=http://localhost:${options.backend.port}`,
      "",
      "# Mail sink used by the email/2FA flow checks. Those 9 checks skip",
      "# themselves when this is unreachable.",
      ...(options.includeDocker
        ? ["# `npm run up` starts one at this address."]
        : [
            "# Start one with:",
            "#   docker run -p 1025:1025 -p 8025:8025 axllent/mailpit",
          ]),
      "MAILPIT_URL=http://localhost:8025",
      "",
      "# The 12 admin checks skip themselves unless these are set. Put them in",
      "# a local .env (not committed) next to this file, after running",
      "# `npm run admin -- you@example.com`:",
      "#   ADMIN_EMAIL=you@example.com",
      "#   ADMIN_PASSWORD=...",
      "",
    ].join("\n");

    await fse.writeFile(
      join(complianceDest, ".env.defaults"),
      defaults,
      "utf-8"
    );
  }

  // 7. Docker setup
  if (options.includeDocker) {
    const dockerDir = join(targetDir, "docker");
    await fse.ensureDir(dockerDir);

    // Render docker-compose
    const composeTemplate = join(root, "infra", "docker", "docker-compose.ejs");
    if (existsSync(composeTemplate)) {
      const rendered = renderEjs(composeTemplate, ejsData);
      await fse.writeFile(
        join(targetDir, "docker-compose.yml"),
        rendered,
        "utf-8"
      );
    }

    // Copy relevant Dockerfiles
    const backendDockerfile = join(
      root,
      "infra",
      "docker",
      "dockerfiles",
      options.backend.dockerfile
    );
    if (existsSync(backendDockerfile)) {
      await fse.copy(
        backendDockerfile,
        join(dockerDir, options.backend.dockerfile)
      );
    }

    const frontendDockerfile = join(
      root,
      "infra",
      "docker",
      "dockerfiles",
      options.frontend.dockerfile
    );
    if (existsSync(frontendDockerfile)) {
      await fse.copy(
        frontendDockerfile,
        join(dockerDir, options.frontend.dockerfile)
      );
    }

    // Copy nginx config for SPA frontends
    const nginxConf = join(root, "infra", "docker", "nginx-spa.conf");
    if (existsSync(nginxConf) && options.frontend.prodPort) {
      await fse.copy(nginxConf, join(dockerDir, "nginx-spa.conf"));
    }
  }

  // 8. CI/CD setup
  if (options.includeCi !== "none") {
    const ciTemplate = join(
      root,
      "infra",
      "ci",
      options.includeCi === "github"
        ? "github-actions.ejs"
        : "gitlab-ci.ejs"
    );
    if (existsSync(ciTemplate)) {
      const rendered = renderEjs(ciTemplate, ejsData);
      if (options.includeCi === "github") {
        const ghDir = join(targetDir, ".github", "workflows");
        await fse.ensureDir(ghDir);
        await fse.writeFile(join(ghDir, "ci.yml"), rendered, "utf-8");
      } else {
        await fse.writeFile(
          join(targetDir, ".gitlab-ci.yml"),
          rendered,
          "utf-8"
        );
      }
    }
  }
}

async function copyTemplate(src: string, dest: string): Promise<void> {
  if (!existsSync(src)) return;
  for (const file of walkDir(src)) {
    const relPath = relative(src, file);
    const destPath = join(dest, relPath);
    await fse.ensureDir(join(destPath, ".."));
    await fse.copy(file, destPath);
  }
}
