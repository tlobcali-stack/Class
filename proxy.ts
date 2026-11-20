import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Runs before every /admin request: refreshes the sign-in session cookie and sends anyone
 * who is not signed in to the login page. Whether a signed-in person is an ADMIN is checked
 * again on the server for every admin page and every action (lib/admin-auth.ts), and once
 * more by the database rules — this is only the first of three locks.
 */
const OPEN = ["/admin/login", "/admin/auth/callback"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const open = OPEN.some((p) => request.nextUrl.pathname === p);
  if (!url || !key) {
    // No database configured: the admin panel cannot work, so only the login page (which explains this) is reachable.
    return open ? response : NextResponse.redirect(new URL("/admin/login", request.url));
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });
  // getUser() asks Supabase to confirm the session; a forged cookie fails here.
  const { data } = await supabase.auth.getUser();

  if (!data.user && !open) {
    const login = new URL("/admin/login", request.url);
    return NextResponse.redirect(login);
  }
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export const config = { matcher: ["/admin/:path*"] };
