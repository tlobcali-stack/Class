import MediaFrame from "@/components/MediaFrame";
import type { SiteMedia } from "@/lib/media-source";

/**
 * A section's photos and videos laid out the way an admin arranged them: 2 columns on
 * phones, 4 from tablets up, each item spanning the columns and rows it was given
 * (wide items are capped at 2 columns on phones so nothing overflows).
 */
const COL = ["", "col-span-1", "col-span-2", "col-span-2 md:col-span-3", "col-span-2 md:col-span-4"];
const ROW = ["", "row-span-1", "row-span-2", "row-span-3"];

export default function MediaGrid({ items, framed = true, contain = false }: { items: SiteMedia[]; framed?: boolean; contain?: boolean }) {
  if (items.length === 0) return null;
  return (
    <ul className="grid grid-flow-row-dense auto-rows-[9.5rem] grid-cols-2 gap-3 sm:auto-rows-[12rem] md:grid-cols-4 md:gap-5">
      {items.map((m) => (
        <li
          key={m.key}
          className={`${COL[m.colSpan] ?? COL[1]} ${ROW[m.rowSpan] ?? ROW[1]} relative overflow-hidden rounded-sm ${framed ? "border border-line" : ""} ${contain ? "bg-white" : ""}`}
        >
          {contain && m.kind === "image" ? (
            <div className="h-full w-full p-4 [&_img]:!object-contain">
              <MediaFrame m={m} sizes="(min-width: 768px) 25vw, 50vw" />
            </div>
          ) : (
            <MediaFrame m={m} sizes={m.colSpan >= 2 ? "(min-width: 768px) 50vw, 100vw" : "(min-width: 768px) 25vw, 50vw"} />
          )}
        </li>
      ))}
    </ul>
  );
}
