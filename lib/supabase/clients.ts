/**
 * Supabase connections. Three kinds, each with the least access it needs:
 *
 *  - publicClient():   for visitors' pages. Uses the public (anon) key and no session, so it
 *                      can only read what the database rules publish. Using no cookies keeps
 *                      the public pages pre-built and fast.
 *  - sessionClient():  for the admin area and its server actions. Acts as the signed-in user,
 *                      so every write is checked by the database rules (only admins can write).
 *  - browserClient():  (lib/supabase/browser.ts) in admin pages in the browser, for uploading files straight to the
 *                      private "incoming" bucket (Vercel cannot accept large request bodies).
 *
 * The service-role key is never used by the website. It appears only in local scripts.
 */
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Written out in full so Next.js can inline them in browser code.
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** Whether this deployment has a database. Without one the site uses its built-in content. */
export const supabaseConfigured = Boolean(URL_ && ANON);
export const supabaseUrl = URL_.replace(/\/+$/, "");

/** The public address of a file in the "media" bucket. */
export const storagePublicUrl = (path: string) => `${supabaseUrl}/storage/v1/object/public/media/${path}`;

export function publicClient(): SupabaseClient | null {
  if (!supabaseConfigured) return null;
  return createClient(URL_, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function sessionClient(): Promise<SupabaseClient> {
  if (!supabaseConfigured) throw new Error("The admin panel needs NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  const { cookies } = await import("next/headers");
  const store = await cookies();
  return createServerClient(URL_, ANON, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Called from a server component, where cookies are read-only. The proxy refreshes them.
        }
      },
    },
  });
}
