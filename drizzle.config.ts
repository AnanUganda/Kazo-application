import { defineConfig } from "drizzle-kit";

// Migrations run against the DIRECT (unpooled) Supabase connection.
// `generate` works from the schema alone (no DB needed); `migrate` requires a
// real URL and will fail clearly against the placeholder if it is unset.
let url =
  process.env.DATABASE_URL_UNPOOLED ??
  process.env.DATABASE_URL ??
  "postgres://placeholder";

// Supabase requires SSL; add it if the URL does not already specify it.
if (
  url.startsWith("postgres") &&
  !url.includes("placeholder") &&
  !url.includes("sslmode=")
) {
  url += (url.includes("?") ? "&" : "?") + "sslmode=require";
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: { url },
  casing: "snake_case",
  verbose: true,
  strict: true,
});
