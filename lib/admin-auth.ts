import "server-only";
import { redirect } from "next/navigation";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { sessionClient } from "./supabase/clients.ts";

/**
 * The server-side admin check used by every admin page and every admin action.
 * Signed in is not enough: the user must be in the admins table (public.is_admin()).
 */
export async function currentAdmin(): Promise<{ db: SupabaseClient; user: User } | null> {
  const db = await sessionClient();
  const { data } = await db.auth.getUser();
  if (!data.user) return null;
  const { data: ok, error } = await db.rpc("is_admin");
  if (error || ok !== true) return null;
  return { db, user: data.user };
}

/** For pages: send non-admins to the login page. */
export async function requireAdminPage() {
  const a = await currentAdmin();
  if (!a) redirect("/admin/login?e=not-admin");
  return a;
}
