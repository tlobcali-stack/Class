import type { Metadata } from "next";
import LoginForm from "@/components/admin/LoginForm";
import { supabaseConfigured } from "@/lib/supabase/clients";

export const metadata: Metadata = { title: "Admin sign-in", robots: { index: false, follow: false } };

const NOTES: Record<string, string> = {
  "not-admin": "That account is not an admin. Ask the site owner to add you.",
  "link-expired": "That sign-in link has expired or was already used. Ask for a new one.",
};

export default async function Login({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { e } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center bg-stone px-5 py-16">
      <div className="w-full max-w-md rounded-[1.5rem] border-2 border-ink bg-paper p-8">
        <p className="kicker">The Legends of Bollywood</p>
        <h1 className="display mt-2 text-4xl">Admin sign-in</h1>
        {!supabaseConfigured ? (
          <p className="mt-6 leading-relaxed">
            The admin panel is not connected to its database yet. Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to the hosting settings, then redeploy.
          </p>
        ) : (
          <>
            <p className="mt-4 leading-relaxed text-ink/80">Enter your email. We&rsquo;ll send you a link that signs you in; no password needed.</p>
            {e && NOTES[e] && <p role="alert" className="mt-5 rounded-xl border-2 border-maroon bg-white p-3 font-bold text-maroon">{NOTES[e]}</p>}
            <LoginForm />
          </>
        )}
      </div>
    </main>
  );
}
