import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { runMigrationsOnce } from "./migrate";

const connectionString =
  process.env.DATABASE_URL || "postgresql://postgres@localhost:5432/postgres";

const pool = new Pool({ connectionString });

export const migrationsReady = runMigrationsOnce(pool);
export const db = drizzle(pool, { schema });
export * from "./schema";
