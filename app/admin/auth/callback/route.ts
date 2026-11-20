import { NextResponse, type NextRequest } from "next/server";
import { sessionClient } from "@/lib/supabase/clients";

/**
 * Where the emailed sign-in link lands. Swaps the one-time code for a session cookie,
 * then goes to the admin panel. Always redirects to a fixed path on this site, never
 * to an address taken from the link (no open redirect).
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const to = (path: string) => NextResponse.redirect(new URL(path, request.nextUrl.origin));
  if (!code) return to("/admin/login?e=link-expired");
  const db = await sessionClient();
  const { error } = await db.auth.exchangeCodeForSession(code);
  if (error) return to("/admin/login?e=link-expired");
  return to("/admin/arrange");
}
