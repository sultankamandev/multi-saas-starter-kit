import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import * as p from "@clack/prompts";
import pc from "picocolors";
import type { ScaffoldOptions } from "./types.js";

export async function postScaffold(
  targetDir: string,
  options: ScaffoldOptions
): Promise<void> {
  // Git init
  try {
    execSync("git init", { cwd: targetDir, stdio: "ignore" });
    p.log.success("Initialized git repository");
  } catch {
    p.log.warn("Could not initialize git repository");
  }

  // Detect and install frontend deps
  const skipInstall =
    process.env.SCAFFOLD_SKIP_INSTALL === "1" ||
    process.env.SCAFFOLD_SKIP_INSTALL === "true";
  const frontendDir = join(targetDir, "frontend");
  if (
    !skipInstall &&
    existsSync(join(frontendDir, "package.json"))
  ) {
    const spinner = p.spinner();
    spinner.start("Installing frontend dependencies...");
    try {
      execSync("npm install", {
        cwd: frontendDir,
        stdio: "ignore",
        timeout: 120_000,
      });
      spinner.stop("Frontend dependencies installed");
    } catch {
      spinner.stop("Skipped frontend install (run npm install manually)");
    }
  }

  // Print getting-started instructions
  p.note(
    [
      `${pc.bold("Backend")} (${options.backend.name}):`,
      `  cd ${options.projectName}/backend`,
      options.backend.envFile
        ? `  cp ${options.backend.envFile} .env`
        : null,
      `  ${options.backend.installCmd}`,
      `  ${options.backend.devCmd}`,
      "",
      `${pc.bold("Frontend")} (${options.frontend.name}):`,
      `  cd ${options.projectName}/frontend`,
      `  npm install`,
      `  npm run dev`,
      "",
      options.includeDocker
        ? `${pc.bold("Docker")}:\n  cd ${options.projectName}\n  docker compose up --build`
        : null,
    ]
      .filter(Boolean)
      .join("\n"),
    "Getting started"
  );

  p.outro(
    pc.green(`Done! Your project is ready at ./${options.projectName}`)
  );
}
