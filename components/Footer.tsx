import Link from "next/link";
import { site } from "@/lib/site";
import type { SiteSettings } from "@/lib/settings-builtin";

export default function Footer({ showJournal = false, settings: s }: { showJournal?: boolean; settings: SiteSettings }) {
  return (
    <footer data-surface="plum" className="pb-28 md:pb-0">
      <div className="stripe" aria-hidden="true" />
      <div className="mx-auto max-w-[1280px] px-5 py-16 sm:px-8 md:py-20">
        <div className="grid gap-12 md:grid-cols-[1.3fr_1fr_1fr]">
          <div>
            <p className="display text-4xl">The Legends of Bollywood</p>
            <p className="mt-2 font-bold text-cream/70">Dance classes with Toolieka Prakash Nikam</p>
            <p className="mt-5 max-w-sm leading-relaxed text-cream/80">{s.tagline}</p>
            <Link href="/contact" className="btn btn-primary mt-7">
              Book a trial class
            </Link>
          </div>

          <div>
            <h2 className="kicker">Visit</h2>
            <ul className="mt-5 space-y-2 text-cream/80">
              <li>Classes across the USA</li>
            </ul>
            <p className="mt-4 text-sm text-cream/60">Call for class locations and the full schedule.</p>
          </div>

          <div>
            <h2 className="kicker">Contact</h2>
            <ul className="mt-5 space-y-3">
              <li>
                <a href={`tel:${s.phone}`} className="font-extrabold hover:text-marigold">
                  {s.phoneDisplay}
                </a>
              </li>
              <li>
                <a href={`mailto:${s.email}`} className="text-cream/80 hover:text-marigold">
                  {s.email}
                </a>
              </li>
              {site.instagram.map((ig) => (
                <li key={ig.handle}>
                  <a href={ig.url} target="_blank" rel="noopener noreferrer" className="text-cream/80 hover:text-marigold">
                    {ig.handle}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-cream/20 pt-8 text-sm text-cream/60 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {site.brand}. All rights reserved.
          </p>
          <nav className="flex flex-wrap gap-x-6 gap-y-2" aria-label="Footer">
            <Link href="/classes" className="hover:text-marigold">Classes</Link>
            <Link href="/about" className="hover:text-marigold">About</Link>
            <Link href="/gallery" className="hover:text-marigold">Gallery</Link>
            {showJournal && <Link href="/blog" className="hover:text-marigold">Journal</Link>}
            <Link href="/contact" className="hover:text-marigold">Contact</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
