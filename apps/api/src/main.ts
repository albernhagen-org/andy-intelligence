import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { runMigrations } from "@andy/db/migrate";
import { createApp } from "./app";
import { parseAllowList } from "./auth";
import { firebaseVerifier } from "./firebase";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`missing required env var ${name}`);
  return value;
}

async function main() {
  const projectId = requireEnv("GCP_PROJECT_ID");
  const allowedEmails = parseAllowList(requireEnv("ALLOWED_EMAILS"));
  const port = Number(process.env.PORT ?? 8080);

  const databaseUrl = process.env.DATABASE_URL;
  if (process.env.RUN_MIGRATIONS === "true") {
    if (databaseUrl) {
      await runMigrations(databaseUrl, process.env.MIGRATIONS_DIR);
      console.log(JSON.stringify({ severity: "INFO", message: "migrations applied" }));
    } else {
      // Expected until the database secret is wired in (database_secret_ready=false).
      console.log(
        JSON.stringify({ severity: "WARNING", message: "DATABASE_URL unset; skipping migrations" }),
      );
    }
  }

  const app = createApp({
    verifier: firebaseVerifier(projectId),
    allowedEmails,
    version: process.env.K_REVISION ?? "dev",
    webConfig: {
      firebaseApiKey: requireEnv("FIREBASE_API_KEY"),
      firebaseAuthDomain: requireEnv("FIREBASE_AUTH_DOMAIN"),
      projectId,
    },
  });

  // SPA: serve built web assets; unknown non-API paths fall back to index.html.
  const webRoot = process.env.WEB_ROOT ?? "./public";
  app.use("/*", serveStatic({ root: webRoot }));
  app.get("*", serveStatic({ root: webRoot, path: "index.html" }));

  serve({ fetch: app.fetch, port }, (info) =>
    console.log(JSON.stringify({ severity: "INFO", message: `listening on ${info.port}` })),
  );
}

main().catch((err: unknown) => {
  console.error(JSON.stringify({ severity: "ERROR", message: String(err) }));
  process.exit(1);
});
