import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { IS_PREVIEW } from "@/lib/preview";

type Db = ReturnType<typeof createDb>;

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.",
    );
  }
  // Supabase: use the pooled (transaction) connection at runtime. The transaction
  // pooler does not support prepared statements, so prepare must be off. SSL is
  // required for the hosted database.
  const client = postgres(url, { prepare: false, ssl: "require" });
  return drizzle(client, { schema, casing: "snake_case" });
}

// Lazy singleton so importing this module never touches the network or env at
// build time; the connection is created on first query.
let _db: Db | null = null;

export function getDb(): Db {
  if (IS_PREVIEW) {
    // The in-memory preview DB is created at startup by instrumentation.ts.
    const g = globalThis as typeof globalThis & { __previewDb?: unknown };
    if (!g.__previewDb) {
      throw new Error("Preview DB is not initialized yet.");
    }
    return g.__previewDb as Db;
  }
  if (!_db) _db = createDb();
  return _db;
}

export { schema };
