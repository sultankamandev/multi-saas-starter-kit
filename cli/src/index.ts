#!/usr/bin/env node

import { resolve } from "node:path";
import { existsSync } from "node:fs";
import * as p from "@clack/prompts";
import { runPrompts } from "./prompts.js";
import { scaffold } from "./scaffolder.js";
import { postScaffold } from "./post-scaffold.js";

async function main(): Promise<void> {
  const argName = process.argv[2];
  const options = await runPrompts(argName);
  if (!options) return;

  const targetDir = resolve(process.cwd(), options.projectName);

  if (existsSync(targetDir)) {
    const overwrite = await p.confirm({
      message: `Directory "${options.projectName}" already exists. Overwrite?`,
      initialValue: false,
    });
    if (!overwrite || p.isCancel(overwrite)) {
      p.cancel("Aborted.");
      return;
    }
  }

  const spinner = p.spinner();
  spinner.start("Scaffolding project...");

  try {
    await scaffold(targetDir, options);
    spinner.stop("Project scaffolded");
  } catch (err) {
    spinner.stop("Scaffold failed");
    p.log.error(
      err instanceof Error ? err.message : "Unknown error during scaffold"
    );
    process.exit(1);
  }

  await postScaffold(targetDir, options);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
