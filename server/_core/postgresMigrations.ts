import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Pool } from "pg";

// One connection and a transaction lock prevent races between replicas.
export async function runPostgresMigrations(
  connectionString = process.env.DATABASE_URL
) {
  if (!connectionString) throw new Error("DATABASE_URL não configurada.");
  const pool = new Pool({ connectionString });
  try {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(20260917, 1)");
      await client.query(
        "CREATE TABLE IF NOT EXISTS smartdocplan.app_migrations (name text PRIMARY KEY, applied_at timestamp NOT NULL DEFAULT now())"
      );
      for (const name of [
        "20260917_minuta.sql",
        "20260917_vacations.sql",
        "20260917_notifications.sql",
      ]) {
        const existing = await client.query(
          "SELECT name FROM smartdocplan.app_migrations WHERE name = $1",
          [name]
        );
        if (!existing.rowCount) {
          await client.query(
            await readFile(resolve("drizzle/migrations", name), "utf8")
          );
          await client.query(
            "INSERT INTO smartdocplan.app_migrations (name) VALUES ($1)",
            [name]
          );
        }
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}
