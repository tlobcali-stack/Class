import type { Metadata } from "next";
import MediaGrid from "@/components/MediaGrid";
import { loadSection, type SiteMedia } from "@/lib/media-source";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Gallery",
  description: "Photographs from class, stage and competition season.",
  alternates: { canonical: "/gallery" },
};

/** What the gallery shows and in what order is set in the admin panel (Layout → each gallery section). */
export default async function Gallery() {
  const [main, screen, recognition, earlier] = await Promise.all([
    loadSection("gallery"),
    loadSection("on_screen"),
    loadSection("recognition"),
    loadSection("earlier_website"),
  ]);
  const videos = main.filter((m) => m.kind !== "image").length;
  return (
    <section data-surface="paper">
      <div className="mx-auto max-w-[1280px] px-5 pb-20 pt-14 sm:px-8 md:pb-28 md:pt-20">
        <p className="kicker rise">Gallery</p>
        <h1 className="display rise rise-2 mt-3 max-w-3xl text-[clamp(2.2rem,5vw,4rem)]">On stage and in class.</h1>
        <p className="rise rise-3 mt-6 max-w-xl text-lg leading-relaxed">
          {main.length - videos} photos{videos ? ` and ${videos} video${videos === 1 ? "" : "s"}` : ""} from classes, shows and competitions, then film and TV stills, recognition, and images from the earlier website. More on Instagram at{" "}
          <a href={site.instagram[0].url} target="_blank" rel="noopener noreferrer" className="font-semibold text-maroon underline underline-offset-4">
            {site.instagram[0].handle}
          </a>
          .
        </p>
        <div className="mt-12">
          <MediaGrid items={main} />
        </div>

        <MoreSection
          id="on-screen"
          title="On screen."
          line="Stills from films, television and stage shows Toolieka has appeared in. These are small frames from the original broadcasts and posters; the rights belong to their producers."
          items={screen}
        />
        <MoreSection id="recognition" title="Recognition." line="Her International Dance Council (CID) membership and the associations she belongs to." items={recognition} contain />
        <MoreSection
          id="earlier-website"
          title="From the earlier TLOB website."
          line="Images that appeared on the previous version of this website. Several are stock photography used to illustrate dance styles and services, not photos of TLOB classes."
          items={earlier}
        />
      </div>
    </section>
  );
}

function MoreSection({ id, title, line, items, contain = false }: { id: string; title: string; line: string; items: SiteMedia[]; contain?: boolean }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby={id} className="mt-20 border-t border-line pt-12">
      <h2 id={id} className="display text-[clamp(1.8rem,4vw,2.8rem)]">{title}</h2>
      <p className="mt-4 max-w-2xl leading-relaxed text-ink/80">{line}</p>
      <div className="mt-8">
        <MediaGrid items={items} contain={contain} />
      </div>
    </section>
  );
}
