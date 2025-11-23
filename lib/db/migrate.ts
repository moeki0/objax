import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __objaxDbMigrate: Promise<void> | undefined;
}

const MIGRATIONS: string[] = [
  `
  create table if not exists things (
    id text primary key,
    code text not null,
    users jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );
  `,
  `
  create table if not exists states (
    id text primary key,
    things jsonb,
    updated_at timestamptz not null default now()
  );
  `,
];

async function migrate(pool: Pool) {
  for (const statement of MIGRATIONS) {
    await pool.query(statement);
  }
}

export function runMigrationsOnce(pool: Pool) {
  if (!globalThis.__objaxDbMigrate) {
    globalThis.__objaxDbMigrate = migrate(pool).catch((e) => {
      console.error("[db] migration failed", e);
      throw e;
    });
  }
  return globalThis.__objaxDbMigrate;
}
