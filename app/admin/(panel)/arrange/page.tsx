import Link from "next/link";
import GridEditor from "@/components/admin/GridEditor";
import { requireAdminPage } from "@/lib/admin-auth";
import { listAllMedia, sectionPlacements } from "@/lib/admin-data";
import { isSection, SECTION_LABELS, SECTION_LIMITS, SECTIONS, type Section } from "@/lib/media-validate";

export default async function Arrange({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const { s } = await searchParams;
  const section: Section = isSection(s) ? s : "gallery";
  const { db } = await requireAdminPage();
  const [media, placements] = await Promise.all([listAllMedia(db), sectionPlacements(db, section)]);
  return (
    <div>
      <h1 className="display text-3xl sm:text-4xl">Page layout</h1>
      <p className="mt-2 max-w-2xl text-ink/80">
        Pick a part of the site, then drag items to reorder them, make them bigger or smaller, and choose which part of each photo stays in view.
        Nothing changes on the live site until you press <strong>Save layout</strong>.
      </p>
      <nav aria-label="Sections" className="mt-6 flex flex-wrap gap-2">
        {SECTIONS.map((sec) => (
          <Link
            key={sec}
            href={`/admin/arrange?s=${sec}`}
            aria-current={sec === section ? "page" : undefined}
            className={`rounded-full border-2 px-4 py-2 text-sm font-bold ${sec === section ? "border-ink bg-ink text-paper" : "border-ink/30 bg-white hover:border-ink"}`}
          >
            {SECTION_LABELS[sec]}
          </Link>
        ))}
      </nav>
      <GridEditor key={section} section={section} limit={SECTION_LIMITS[section]} label={SECTION_LABELS[section]} media={media} initial={placements} />
    </div>
  );
}
