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

  // Print getting-started instructions. Everything goes through the root
  // scripts so the note is the same shape whichever stack was picked.
  const steps: (string | null)[] = [`  cd ${options.projectName}`, ""];

  if (options.includeDocker) {
    steps.push(
      `${pc.bold("Everything at once")} (Docker):`,
      "  npm run up",
      "",
      `${pc.bold("Or run the pieces yourself")}:`
    );
  } else {
    steps.push(`${pc.bold("Run it")}:`);
  }

  steps.push(
    `  cp backend/${options.backend.envFile ?? ".env.example"} backend/.env`,
    "  # set JWT_SECRET (32+ chars) and DATABASE_URL",
    "  npm run install:backend && npm run dev:backend",
    "  npm run install:frontend && npm run dev:frontend",
    "",
    `${pc.bold("Then, to reach /admin")}:`,
    "  # register through the app first, then:",
    "  npm run admin -- you@example.com",
    "",
    `${pc.bold("To check the API against the contract")}:`,
    "  npm test"
  );

  p.note(steps.filter((s) => s !== null).join("\n"), "Getting started");

  p.outro(
    pc.green(`Done! Your project is ready at ./${options.projectName}`)
  );
}
