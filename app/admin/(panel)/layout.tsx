import type { Metadata } from "next";
import Link from "next/link";
import { signOut } from "@/app/admin/actions";
import { requireAdminPage } from "@/lib/admin-auth";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const LINKS = [
  { href: "/admin/arrange", label: "Page layout" },
  { href: "/admin/media", label: "Photos & videos" },
  { href: "/admin/settings", label: "Site details" },
];

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireAdminPage();
  return (
    <div className="min-h-screen bg-stone">
      <header data-surface="wine" className="sticky top-0 z-40">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3">
          <p className="display text-lg">TLOB admin</p>
          <nav aria-label="Admin" className="flex flex-wrap gap-1">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="rounded-full px-3 py-1.5 text-sm font-bold hover:bg-wine-soft">{l.label}</Link>
            ))}
            <a href="/" target="_blank" rel="noopener" className="rounded-full px-3 py-1.5 text-sm font-bold hover:bg-wine-soft">View site ↗</a>
          </nav>
          <form action={signOut} className="ml-auto flex items-center gap-3 text-sm">
            <span className="hidden text-paper/70 sm:inline">{user.email}</span>
            <button type="submit" className="rounded-full border-2 border-paper/40 px-3 py-1 font-bold hover:border-gold">Sign out</button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
