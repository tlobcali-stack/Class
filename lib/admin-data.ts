import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Section } from "./media-validate.ts";
import { storagePublicUrl } from "./supabase/clients.ts";

/** One media item as the admin screens see it (all items, published or not). */
export type AdminMedia = {
  id: string;
  kind: "image" | "video_file" | "video_embed";
  src: string;
  embedUrl: string | null;
  alt: string;
  caption: string | null;
  w: number;
  h: number;
  showsChildren: boolean;
  sections: Section[];
  createdAt: string;
};

export type AdminPlacement = {
  mediaId: string;
  colSpan: number;
  rowSpan: number;
  focalX: number;
  focalY: number;
  zoom: number;
  published: boolean;
};

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export async function listAllMedia(db: SupabaseClient): Promise<AdminMedia[]> {
  const { data, error } = await db
    .from("media")
    .select("id, kind, source, path, embed_url, alt, caption, width, height, shows_children, created_at, placements(section)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Loading media failed: ${error.message}`);
  return (data ?? []).map((m) => ({
    id: m.id,
    kind: m.kind,
    src: m.source === "static" ? `${base}${m.path}` : m.source === "storage" ? storagePublicUrl(m.path) : "",
    embedUrl: m.embed_url,
    alt: m.alt,
    caption: m.caption,
    w: m.width ?? 1600,
    h: m.height ?? 900,
    showsChildren: m.shows_children,
    sections: ((m.placements as { section: Section }[] | null) ?? []).map((p) => p.section),
    createdAt: m.created_at,
  }));
}

export async function sectionPlacements(db: SupabaseClient, section: Section): Promise<AdminPlacement[]> {
  const { data, error } = await db
    .from("placements")
    .select("media_id, col_span, row_span, focal_x, focal_y, zoom, published")
    .eq("section", section)
    .order("position");
  if (error) throw new Error(`Loading the layout failed: ${error.message}`);
  return (data ?? []).map((p) => ({
    mediaId: p.media_id, colSpan: p.col_span, rowSpan: p.row_span, focalX: p.focal_x, focalY: p.focal_y, zoom: Number(p.zoom), published: p.published,
  }));
}
