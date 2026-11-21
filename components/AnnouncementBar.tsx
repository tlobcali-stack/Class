import Link from "next/link";
import type { AnnouncementContent } from "@/lib/contentsathi/typed.ts";

/**
 * The site-wide banner ContentSathi can switch on and off. A server component:
 * it is in the page's HTML, no script needed. It scrolls away; the header stays.
 *
 * Whether it shows at all (active, inside its start and end times) is decided by
 * currentAnnouncement() before it gets here, and the link was checked twice already
 * (when ContentSathi sent it, and again when the file was read), so it is a path on
 * this site, https, mailto or tel — nothing else can arrive.
 */
export default function AnnouncementBar({ a }: { a: AnnouncementContent | null }) {
  if (!a) return null;
  const notice = a.tone === "notice";
  const link = a.linkHref
    ? a.linkHref.startsWith("/")
      ? (
          <Link href={a.linkHref} className="font-semibold underline underline-offset-4" style={{ color: "var(--accent)" }}>
            {a.linkLabel}
          </Link>
        )
      : (
          <a
            href={a.linkHref}
            className="font-semibold underline underline-offset-4"
            style={{ color: "var(--accent)" }}
            {...(a.linkHref.startsWith("https:") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            {a.linkLabel}
          </a>
        )
    : null;
  return (
    <div role="region" aria-label="Announcement" data-surface={notice ? "wine" : "stone"} className="text-center text-sm font-bold">
      <p className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-center gap-x-3 gap-y-1 px-5 py-2.5 sm:px-8">
        <span>{a.text}</span>
        {link}
      </p>
    </div>
  );
}
