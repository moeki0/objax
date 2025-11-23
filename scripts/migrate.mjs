import pg from "pg";

const { Client } = pg;

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
  const client = new Client({
    connectionString:
      process.env.DATABASE_URL ||
      "postgresql://postgres@localhost:5432/postgres",
  });
  await client.connect();
  try {
    for (const statement of MIGRATIONS) {
      await client.query(statement);
    }
    console.log("[migrate] done");
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error("[migrate] failed", e);
  process.exit(1);
});
