"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/auth/supabase/server";

/** Sign the current user out and return to the sign-in page. */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
}
