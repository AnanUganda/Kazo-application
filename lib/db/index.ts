import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

type Db = ReturnType<typeof createDb>;

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.",
    );
  }
  return drizzle(neon(url), { schema, casing: "snake_case" });
}

// Lazy singleton so importing this module never touches the network or env at
// build time; the connection is created on first query.
let _db: Db | null = null;

export function getDb(): Db {
  if (!_db) _db = createDb();
  return _db;
}

export { schema };
