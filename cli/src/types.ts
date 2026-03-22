export interface TemplateEntry {
  id: string;
  name: string;
  dir: string;
  port: number;
  language: string;
  variants: string[];
  status: "stable" | "beta" | "experimental";
  healthCheck?: string;
  envFile?: string;
  installCmd: string;
  devCmd: string;
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
