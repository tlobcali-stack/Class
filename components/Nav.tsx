"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { site } from "@/lib/site";
import { useSiteSettings } from "@/components/SiteSettings";

const base = [
  { href: "/classes", label: "Classes" },
  { href: "/about", label: "About" },
  { href: "/gallery", label: "Gallery" },
  { href: "/contact", label: "Contact" },
];

/** The Journal appears once there is something in it. */
const withJournal = (show: boolean) => (show ? [...base.slice(0, 3), { href: "/blog", label: "Journal" }, base[3]] : base);

export default function Nav({ showJournal = false }: { showJournal?: boolean }) {
  const s = useSiteSettings();
  const links = withJournal(showJournal);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header data-surface="cream" className="sticky top-0 z-50 border-b-2 border-plum">
        <div className="mx-auto flex h-[4.25rem] max-w-[1280px] items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex flex-col leading-none" aria-label={`${site.brand} — home`}>
            <span className="display text-[1.35rem] sm:text-2xl">The Legends of Bollywood</span>
            <span className="mt-1 text-[0.8rem] font-bold text-plum/70">Dance classes with Toolieka</span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={pathname === l.href || pathname.startsWith(`${l.href}/`) ? "page" : undefined}
                className="text-sm font-extrabold hover:text-magenta aria-[current=page]:text-magenta aria-[current=page]:underline aria-[current=page]:underline-offset-8"
              >
                {l.label}
              </Link>
            ))}
            <Link href="/contact" className="btn btn-primary !min-h-[2.75rem] !py-2">
              Book a trial
            </Link>
          </nav>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-plum md:hidden"
          >
            <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
            <span aria-hidden="true" className="relative block h-3.5 w-5">
              <span className={`absolute left-0 block h-0.5 w-5 bg-plum transition-transform ${open ? "top-1.5 rotate-45" : "top-0"}`} />
              <span className={`absolute left-0 block h-0.5 w-5 bg-plum transition-transform ${open ? "top-1.5 -rotate-45" : "top-3"}`} />
            </span>
          </button>
        </div>
      </header>

      <div id="mobile-nav" hidden={!open} data-surface="plum" className="fixed inset-0 top-[4.25rem] z-40 flex flex-col justify-center px-8 md:hidden">
        <nav className="flex flex-col" aria-label="Primary mobile">
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={close} className="display border-b border-cream/20 py-4 text-4xl">
              {l.label}
            </Link>
          ))}
        </nav>
        <Link href="/contact" onClick={close} className="btn btn-primary mt-8 w-full">
          Book a trial class
        </Link>
      </div>

      {/* Persistent mobile bar: the two things a parent does. */}
      <div className="fixed inset-x-3 bottom-3 z-30 flex gap-2 !bg-transparent md:hidden" data-surface="cream">
        <a href={`tel:${s.phone}`} className="btn btn-ghost flex-1 bg-cream shadow-lg" aria-label={`Call ${s.phoneDisplay}`}>
          Call
        </a>
        <Link href="/contact" className="btn btn-primary flex-[2] shadow-lg">
          Book a trial class
        </Link>
      </div>
    </>
  );
}
