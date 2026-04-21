import pg from "pg";

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!pool) {
    pool = new Pool({
      connectionString:
        process.env.DATABASE_URL ??
        "postgres://workshop:workshop@postgres:5432/claims",
      max: 10,
      idleTimeoutMillis: 30_000,
    });
  }
  return pool;
}
