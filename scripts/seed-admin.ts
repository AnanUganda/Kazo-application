/**
 * Seed the first Admin account from env vars. Run once after the database is
 * migrated and Supabase env vars are set:
 *
 *   npm run seed:admin
 *
 * Reads SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, SEED_ADMIN_NAME plus the Supabase
 * URL and service-role key from .env.local. Safe to re-run: it does nothing if
 * that email already has a staff record.
 *
 * Note: this builds the Supabase admin client directly (not lib/auth/...) so it
 * runs outside the Next.js server context.
 */
import { createClient } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";
import { getDb } from "../lib/db";
import { staff } from "../lib/db/schema";

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}

async function main() {
  const email = required("SEED_ADMIN_EMAIL").trim().toLowerCase();
  const password = required("SEED_ADMIN_PASSWORD");
  const name = (process.env.SEED_ADMIN_NAME ?? "Administrator").trim();
  const supabaseUrl = required("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = required("SUPABASE_SERVICE_ROLE_KEY");

  const db = getDb();

  const existing = await db
    .select()
    .from(staff)
    .where(eq(staff.email, email))
    .limit(1);

  if (existing[0]) {
    console.log(`Admin already exists for ${email}; nothing to do.`);
    return;
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name },
  });
  if (error || !data.user) {
    throw error ?? new Error("Supabase did not return a user");
  }

  await db.insert(staff).values({
    id: data.user.id,
    email,
    fullName: name,
    role: "admin",
  });

  console.log(`Created first admin: ${email} (${data.user.id})`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
