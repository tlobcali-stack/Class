import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { formatDate, readingMinutes } from "@/lib/contentsathi/format.ts";
import { excerpt, listPublished } from "@/lib/contentsathi/posts.ts";
import { siteUrlConfigured } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const hasPosts = (await listPublished()).length > 0;
  return {
    title: "Journal",
    description: "News, tips and updates from the studio.",
    alternates: { canonical: "/blog" },
    // An empty journal is not worth indexing; it stops being noindex when the first article lands —
    // and never while the site has no real address (the layout's noindex would otherwise be overridden here).
    robots: hasPosts && siteUrlConfigured ? { index: true, follow: true } : { index: false, follow: true },
  };
}

export default async function Journal() {
  const posts = await listPublished();
  return (
    <section data-surface="cream">
      <div className="mx-auto max-w-[1280px] px-5 pb-24 pt-14 sm:px-8 md:pb-32 md:pt-20">
        <p className="kicker rise">Journal</p>
        <h1 className="display rise rise-2 mt-3 max-w-3xl text-[clamp(2.4rem,6.5vw,5rem)]">News from the studio.</h1>

        {posts.length === 0 ? (
          <p className="rise rise-3 mt-10 max-w-xl text-lg leading-relaxed">
            The first articles are on their way. Meanwhile,{" "}
            <Link href="/classes" className="font-extrabold text-magenta underline underline-offset-4">see the classes</Link>.
          </p>
        ) : (
          <ul className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((p) => (
              <li key={p.slug}>
                <Link href={`/blog/${p.slug}`} className="card group block h-full overflow-hidden transition-transform hover:-translate-y-1">
                  {p.featuredImage && (
                    <div className="relative aspect-[4/3] border-b-2 border-plum">
                      <Image src={p.featuredImage} alt="" fill unoptimized sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw" className="object-cover" />
                    </div>
                  )}
                  <div className="p-6">
                    <p className="kicker">{p.category}</p>
                    <h2 className="display mt-3 text-2xl !leading-tight group-hover:text-magenta">{p.title}</h2>
                    <p className="mt-3 leading-relaxed text-plum/80">{excerpt(p)}</p>
                    <p className="mt-4 text-sm font-bold text-plum/60">{formatDate(p.publishedAt)} · {readingMinutes(p.body)} min read</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
