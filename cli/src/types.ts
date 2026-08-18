export interface TemplateEntry {
  id: string;
  name: string;
  dir: string;
  port: number;
  language: string;
  variants: string[];
  status: "stable" | "beta" | "experimental";
  /** Short caveat shown next to the name in the picker, e.g. what is missing. */
  hint?: string;
  /** Longer warning shown after selection, so nobody discovers a gap post-scaffold. */
  limitations?: string[];
  healthCheck?: string;
  envFile?: string;
  installCmd: string;
  devCmd: string;
  /** Promotes an account to admin, run from backend/. Takes the email as a trailing arg. */
  adminCmd?: string;
  /** The same command inside the built image, for `docker compose exec backend ...`. */
  adminDockerCmd?: string;
  dockerfile: string;
  dbUrlEnvFormat?: string;
  apiUrlEnv?: string;
  prodPort?: number;
  prodCmd?: string;
}

export interface Manifest {
  templates: TemplateEntry[];
}

export interface ScaffoldOptions {
  projectName: string;
  backend: TemplateEntry;
  frontend: TemplateEntry;
  includeDocker: boolean;
  includeCi: "github" | "gitlab" | "none";
}
