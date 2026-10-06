import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Pool } from "pg";

/**
 * Único mecanismo de schema do projeto. Na subida do servidor:
 * 1. banco vazio (schema sem tabelas): aplica a base inicial `drizzle/0000_sleepy_cargill.sql`;
 * 2. aplica, em ordem, as migrations de `drizzle/migrations/` ainda não registradas em `app_migrations`.
 * Migration nova: criar o arquivo SQL (idempotente, só de adição) e acrescentá-lo ao fim desta lista.
 */
export const MIGRATIONS = [
  "20260917_minuta.sql",
  "20260917_vacations.sql",
  "20260917_notifications.sql",
  "20260917_document_dates.sql",
  "20261005_ticket_messages.sql",
  "20261005_user_worksites.sql",
  "20261006_employee_checklist.sql",
  "20261006_recurring_documents.sql",
  "20261006_addresses.sql",
  "20261006_company_parameters.sql",
  "20261006_recurring_periodicity.sql",
  "20261007_health_campaigns.sql",
  "20261007_audit_client_info.sql",
];

const BASELINE = "0000_sleepy_cargill.sql";

// Uma conexão e um lock de transação evitam corrida entre réplicas.
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
      await client.query("CREATE SCHEMA IF NOT EXISTS smartdocplan");
      const { rows } = await client.query(
        "SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema = 'smartdocplan' AND table_name <> 'app_migrations'"
      );
      if (rows[0].n === 0) {
        // Banco novo: cria as tabelas originais antes das migrations incrementais.
        const baseline = await readFile(resolve("drizzle", BASELINE), "utf8");
        for (const statement of baseline.split("--> statement-breakpoint")) {
          if (statement.trim()) await client.query(statement);
        }
        console.log("[Migration] Base inicial aplicada em banco vazio.");
      }
      await client.query(
        "CREATE TABLE IF NOT EXISTS smartdocplan.app_migrations (name text PRIMARY KEY, applied_at timestamp NOT NULL DEFAULT now())"
      );
      for (const name of MIGRATIONS) {
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
