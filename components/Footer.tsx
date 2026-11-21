import Link from "next/link";
import { site } from "@/lib/site";
import type { SiteSettings } from "@/lib/settings-builtin";

export default function Footer({ showJournal = false, settings: s }: { showJournal?: boolean; settings: SiteSettings }) {
  return (
    <footer data-surface="wine" className="pb-28 md:pb-0">
      <div className="stripe" aria-hidden="true" />
      <div className="mx-auto max-w-[1280px] px-5 py-16 sm:px-8 md:py-20">
        <div className="grid gap-12 md:grid-cols-[1.3fr_1fr_1fr]">
          <div>
            <p className="display text-4xl">The Legends of Bollywood</p>
            <p className="mt-2 font-bold text-paper/70">Dance classes with Toolieka Prakash Nikam</p>
            <p className="mt-5 max-w-sm leading-relaxed text-paper/80">{s.tagline}</p>
            <Link href="/contact" className="btn btn-primary mt-7">
              Book a trial class
            </Link>
          </div>

          <div>
            <h2 className="kicker kicker-plain">Visit</h2>
            <ul className="mt-5 space-y-2 text-paper/80">
              <li>Classes across the USA</li>
            </ul>
            <p className="mt-4 text-sm text-paper/60">Call for class locations and the full schedule.</p>
          </div>

          <div>
            <h2 className="kicker kicker-plain">Contact</h2>
            <ul className="mt-5 space-y-3">
              <li>
                <a href={`tel:${s.phone}`} className="font-semibold hover:text-gold">
                  {s.phoneDisplay}
                </a>
              </li>
              <li>
                <a href={`mailto:${s.email}`} className="text-paper/80 hover:text-gold">
                  {s.email}
                </a>
              </li>
              {site.instagram.map((ig) => (
                <li key={ig.handle}>
                  <a href={ig.url} target="_blank" rel="noopener noreferrer" className="text-paper/80 hover:text-gold">
                    {ig.handle}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-paper/20 pt-8 text-sm text-paper/60 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {site.brand}. All rights reserved.
          </p>
          <nav className="flex flex-wrap gap-x-6 gap-y-2" aria-label="Footer">
            <Link href="/classes" className="hover:text-gold">Classes</Link>
            <Link href="/about" className="hover:text-gold">About</Link>
            <Link href="/gallery" className="hover:text-gold">Gallery</Link>
            {showJournal && <Link href="/blog" className="hover:text-gold">Journal</Link>}
            <Link href="/contact" className="hover:text-gold">Contact</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
