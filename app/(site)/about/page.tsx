import type { Metadata } from "next";
import Link from "next/link";
import { bio, credentials, timeline } from "@/lib/content";
import { firstImage } from "@/lib/media-source";
import MediaFrame from "@/components/MediaFrame";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "About Toolieka",
  description: "Toolieka Prakash Nikam is a Bollywood film-industry performer and a UNESCO / CID Paris certified dance educator, teaching across the USA.",
  alternates: { canonical: "/about" },
};

export default async function About() {
  const portrait = await firstImage("about");
  return (
    <>
      <section data-surface="paper">
        <div className="mx-auto grid max-w-[1280px] gap-12 px-5 py-14 sm:px-8 md:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="kicker rise">About</p>
            <h1 className="display rise rise-2 mt-3 text-[clamp(2.2rem,5vw,4rem)]">Toolieka Prakash Nikam.</h1>
            <p className="rise rise-3 mt-6 text-xl leading-relaxed">{bio.lead}</p>
            <div className="rise rise-3 mt-6 space-y-5 text-lg leading-relaxed">
              {bio.body.map((para) => <p key={para}>{para}</p>)}
            </div>
          </div>
          <div className="rise rise-2 relative aspect-[2/3] w-full overflow-hidden rounded-sm frame">
            <MediaFrame m={portrait} priority sizes="(min-width: 1024px) 38vw, 92vw" />
          </div>
        </div>
      </section>

      <section data-surface="wine">
        <div className="mx-auto max-w-[1280px] px-5 py-16 sm:px-8 md:py-24">
          <h2 className="display text-[clamp(1.8rem,4vw,3rem)]">Credentials</h2>
          <dl className="mt-10 grid grid-cols-2 gap-8 lg:grid-cols-4">
            {credentials.map((c) => (
              <div key={c.label} className="border-t border-gold pt-4">
                <dt className="display text-5xl text-gold">{c.value}</dt>
                <dd className="mt-2 font-bold leading-snug">{c.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section data-surface="stone">
        <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8 md:py-24">
          <h2 className="display text-[clamp(1.8rem,4vw,3rem)]">The path</h2>
          <ol className="mt-10 space-y-8 border-l border-gold pl-6">
            {timeline.map((t) => (
              <li key={t.year}>
                <p className="kicker">{t.year}</p>
                <p className="display mt-1 text-2xl !leading-tight">{t.title}</p>
                <p className="mt-2 leading-relaxed text-ink/85">{t.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section data-surface="stone">
        <div className="mx-auto max-w-[1280px] px-5 py-16 text-center sm:px-8 md:py-24">
          <h2 className="display mx-auto max-w-2xl text-[clamp(1.9rem,4.2vw,3.1rem)]">Come and try a class.</h2>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/contact" className="btn btn-primary">Book a trial class</Link>
            {site.weddingsUrl && <a href={site.weddingsUrl} className="btn btn-ghost">Wedding choreography →</a>}
          </div>
        </div>
      </section>
    </>
  );
}
