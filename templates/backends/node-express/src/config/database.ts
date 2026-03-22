import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { env } from "./env.js";
import * as schema from "../models/schema.js";

const pool = new pg.Pool({ connectionString: env.databaseUrl });

export const db = drizzle(pool, { schema });
export { pool };
