/**
 * What each part of the site shows: photos and videos in order, with their size in the
 * grid and how each is cropped. Read from the database (what admins arranged); if there
 * is no database or it cannot be reached, the built-in library (lib/photos.ts) is used, so
 * a page never goes blank. Same idea as lib/schedule-source.ts.
 */
import { gallery, heroPhoto, librarySection, onStage, photos, type Photo } from "./photos.ts";
import type { Section } from "./media-validate.ts";
import { publicClient, storagePublicUrl } from "./supabase/clients.ts";

export type SiteMedia = {
  key: string;
  kind: "image" | "video_file" | "video_embed";
  /** Image or video file address (empty for embeds). */
  src: string;
  embedUrl: string | null;
  alt: string;
  caption: string | null;
  w: number;
  h: number;
  showsChildren: boolean;
  colSpan: number;
  rowSpan: number;
  focalX: number;
  focalY: number;
  zoom: number;
};

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const fromPhoto = (ph: Photo): SiteMedia => ({
  key: ph.src, kind: "image", src: ph.src, embedUrl: null, alt: ph.alt, caption: null, w: ph.w, h: ph.h,
  showsChildren: Boolean(ph.showsChildren), colSpan: 1, rowSpan: 1, focalX: 50, focalY: 50, zoom: 1,
});

/** The built-in content for each section (used without a database). */
export function builtinSection(section: Section): SiteMedia[] {
  const list: readonly Photo[] = {
    home_hero: [heroPhoto],
    home_on_stage: onStage.photos,
    about: [photos.instructorMagenta],
    gallery,
    on_screen: librarySection("screen"),
    recognition: librarySection("recognition"),
    earlier_website: librarySection("archive"),
  }[section];
  const shaped = section === "gallery" || section === "on_screen" || section === "earlier_website";
  return list.map((ph) => {
    const m = fromPhoto(ph);
    if (!shaped) return m;
    const r = ph.h / ph.w; // same starting sizes as scripts/seed-media.ts
    return { ...m, colSpan: r < 0.62 ? 2 : 1, rowSpan: r > 1.2 ? 2 : 1 };
  });
}

type Row = {
  col_span: number; row_span: number; focal_x: number; focal_y: number; zoom: number | string;
  media: { id: string; kind: SiteMedia["kind"]; source: "static" | "storage" | "embed"; path: string | null; embed_url: string | null;
    alt: string; caption: string | null; width: number | null; height: number | null; shows_children: boolean };
};

/** Pure: database rows → what the page renders. Tested. */
export function mediaFromRows(rows: Row[]): SiteMedia[] {
  const out: SiteMedia[] = [];
  for (const r of rows) {
    const m = r.media;
    if (!m) continue;
    const src = m.source === "static" && m.path ? `${base}${m.path}` : m.source === "storage" && m.path ? storagePublicUrl(m.path) : "";
    if (m.kind !== "video_embed" && !src) continue;
    if (m.kind === "video_embed" && !m.embed_url) continue;
    out.push({
      key: m.id, kind: m.kind, src, embedUrl: m.embed_url, alt: m.alt, caption: m.caption,
      w: m.width ?? 1600, h: m.height ?? 900, showsChildren: m.shows_children,
      colSpan: r.col_span, rowSpan: r.row_span, focalX: r.focal_x, focalY: r.focal_y, zoom: Number(r.zoom) || 1,
    });
  }
  return out;
}

/** Sections that must always show something: an empty one falls back to the built-in photo. */
const NEVER_EMPTY: readonly Section[] = ["home_hero", "about"];

export async function loadSection(section: Section): Promise<SiteMedia[]> {
  const db = publicClient();
  if (!db) return builtinSection(section);
  try {
    const { data, error } = await db
      .from("placements")
      .select("col_span, row_span, focal_x, focal_y, zoom, media!inner(id, kind, source, path, embed_url, alt, caption, width, height, shows_children)")
      .eq("section", section)
      .eq("published", true)
      .order("position");
    if (error) throw error;
    const items = mediaFromRows((data ?? []) as unknown as Row[]);
    return items.length === 0 && NEVER_EMPTY.includes(section) ? builtinSection(section) : items;
  } catch (e) {
    console.error(`media (${section}): using built-in content;`, e instanceof Error ? e.message : e);
    return builtinSection(section);
  }
}

/** The first image in a section, for places that need exactly one picture (hero, link previews). */
export async function firstImage(section: Section): Promise<SiteMedia> {
  const items = await loadSection(section);
  return items.find((m) => m.kind === "image") ?? builtinSection(section)[0];
}
