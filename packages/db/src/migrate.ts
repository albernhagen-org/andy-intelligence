import { migrate } from "drizzle-orm/node-postgres/migrator";
import { fileURLToPath } from "node:url";
import { createDb } from "./index";

/** Apply pending migrations. Called by the API at boot when RUN_MIGRATIONS=true (ADR-0013). */
export async function runMigrations(url: string, migrationsFolder?: string): Promise<void> {
  const { db, pool } = createDb(url, { max: 1 });
  try {
    await migrate(db, {
      migrationsFolder: migrationsFolder ?? fileURLToPath(new URL("../drizzle", import.meta.url)),
    });
  } finally {
    await pool.end();
  }
}
