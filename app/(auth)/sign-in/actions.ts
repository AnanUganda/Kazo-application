"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/auth/supabase/server";

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export type SignInState = { error?: string; email?: string };

export async function signIn(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const parsed = schema.safeParse({ email, password });
  if (!parsed.success) {
    return { error: "Enter your email and password.", email };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: "Invalid email or password.", email };
  }

  redirect("/");
}
