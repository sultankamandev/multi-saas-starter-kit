import * as p from "@clack/prompts";
import pc from "picocolors";
import { getBackends, getFrontends } from "./registry.js";
import type { ScaffoldOptions } from "./types.js";

export async function runPrompts(
  defaultName?: string
): Promise<ScaffoldOptions | null> {
  p.intro(pc.bgCyan(pc.black(" create-saas-app ")));

  const backends = getBackends();
  const frontends = getFrontends();

  if (backends.length === 0 || frontends.length === 0) {
    p.cancel("No templates found. Ensure the templates directory is present.");
    return null;
  }

  const answers = await p.group(
    {
      projectName: () =>
        p.text({
          message: "Project name",
          placeholder: "my-saas-app",
          defaultValue: defaultName || "my-saas-app",
          validate: (v) => {
            if (!v) return "Project name is required";
            if (!/^[a-z0-9_-]+$/i.test(v))
              return "Only letters, numbers, hyphens, and underscores";
          },
        }),

      backend: () =>
        p.select({
          message: "Backend framework",
          options: backends.map((b) => ({
            value: b.id,
            label: b.name,
            hint: b.status === "beta" ? "beta" : undefined,
          })),
        }),

      frontend: () =>
        p.select({
          message: "Frontend framework",
          options: frontends.map((f) => ({
            value: f.id,
            label: f.name,
            hint: f.status === "beta" ? "beta" : undefined,
          })),
        }),

      includeDocker: () =>
        p.confirm({
          message: "Include Docker setup?",
          initialValue: true,
        }),

      includeCi: () =>
        p.select({
          message: "CI/CD pipeline",
          options: [
            { value: "github", label: "GitHub Actions" },
            { value: "gitlab", label: "GitLab CI" },
            { value: "none", label: "None" },
          ],
        }),
    },
    {
      onCancel: () => {
        p.cancel("Setup cancelled.");
        return process.exit(0);
      },
    }
  );

  const backend = backends.find((b) => b.id === answers.backend)!;
  const frontend = frontends.find((f) => f.id === answers.frontend)!;

  return {
    projectName: answers.projectName as string,
    backend,
    frontend,
    includeDocker: answers.includeDocker as boolean,
    includeCi: answers.includeCi as "github" | "gitlab" | "none",
  };
}
