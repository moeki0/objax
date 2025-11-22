import { drizzle } from "drizzle-orm/vercel-postgres";
import { sql } from "@vercel/postgres";
import * as schema from "./schema";
import { runMigrationsOnce } from "./migrate";

export const migrationsReady = runMigrationsOnce();
export const db = drizzle(sql, { schema });
export * from "./schema";
