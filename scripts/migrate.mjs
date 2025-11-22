import { sql } from "@vercel/postgres";

const MIGRATIONS = [
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

async function main() {
  for (const statement of MIGRATIONS) {
    await sql.query(statement);
  }
  console.log("[migrate] done");
}

main().catch((e) => {
  console.error("[migrate] failed", e);
  process.exit(1);
});
