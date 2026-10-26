/**
 * Seed the first Admin account from env vars. Run once after the database is
 * migrated and Neon Auth env vars are set:
 *
 *   npm run seed:admin
 *
 * Reads SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, SEED_ADMIN_NAME from .env.local.
 * Safe to re-run: it does nothing if that email already has a staff record.
 *
 * Note: this imports @stackframe/stack directly (not lib/auth/stack) so it runs
 * outside the Next.js request context.
 */
import { StackServerApp } from "@stackframe/stack";
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

  const stack = new StackServerApp({ tokenStore: "memory" });
  const user = await stack.createUser({
    primaryEmail: email,
    primaryEmailAuthEnabled: true,
    primaryEmailVerified: true,
    password,
    displayName: name,
  });

  await db.insert(staff).values({
    id: user.id,
    email,
    fullName: name,
    role: "admin",
  });

  console.log(`Created first admin: ${email} (${user.id})`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
