/**
 * Checks for anything an admin sends: files, text and layout. Pure functions, so they
 * can be tested and used both in the browser (fast feedback) and on the server (the
 * check that counts — the browser is never trusted).
 */

export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

export const SECTIONS = ["home_hero", "home_on_stage", "about", "gallery", "on_screen", "recognition", "earlier_website"] as const;
export type Section = (typeof SECTIONS)[number];
export const SECTION_LABELS: Record<Section, string> = {
  home_hero: "Home page: main photo",
  home_on_stage: "Home page: on stage strip",
  about: "About page photo",
  gallery: "Gallery: classes and stage",
  on_screen: "Gallery: on screen",
  recognition: "Gallery: recognition",
  earlier_website: "Gallery: earlier website",
};
/** How many items a section shows. The hero and about photo are single images. */
export const SECTION_LIMITS: Record<Section, number> = {
  home_hero: 1, home_on_stage: 8, about: 1, gallery: 500, on_screen: 500, recognition: 500, earlier_website: 500,
};
export const isSection = (s: unknown): s is Section => typeof s === "string" && (SECTIONS as readonly string[]).includes(s);

export type FileKind = "image" | "video";

/**
 * What a file really is, from its first bytes — not its name or the type the browser
 * claims. Returns the extension it will be stored with, or null if it is not allowed.
 */
export function sniffFile(bytes: Uint8Array): { kind: FileKind; ext: "jpg" | "png" | "webp" | "heic" | "mp4" | "mov" | "webm" } | null {
  const b = bytes;
  const ascii = (from: number, len: number) => String.fromCharCode(...b.subarray(from, from + len));
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { kind: "image", ext: "jpg" };
  if (b.length >= 8 && b[0] === 0x89 && ascii(1, 3) === "PNG") return { kind: "image", ext: "png" };
  if (b.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP") return { kind: "image", ext: "webp" };
  if (b.length >= 12 && b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return { kind: "video", ext: "webm" };
  if (b.length >= 12 && ascii(4, 4) === "ftyp") {
    const brand = ascii(8, 4);
    if (/^(heic|heix|heim|heis|mif1|msf1)$/.test(brand)) return { kind: "image", ext: "heic" };
    if (brand === "qt  ") return { kind: "video", ext: "mov" };
    if (/^(isom|iso2|iso4|iso5|iso6|mp41|mp42|avc1|M4V |MSNV|dash|3gp4|3gp5)$/.test(brand)) return { kind: "video", ext: "mp4" };
  }
  return null;
}

export function sizeProblem(kind: FileKind, bytes: number): string | null {
  const max = kind === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
  if (bytes <= 0) return "The file is empty.";
  if (bytes > max) {
    const mb = Math.round(max / 1024 / 1024);
    return kind === "image"
      ? `Photos can be up to ${mb} MB.`
      : `Videos can be up to ${mb} MB. For a longer video, upload it to YouTube and add the link instead.`;
  }
  return null;
}

/** An uploaded file's name in the private incoming bucket: <uploader id>/<uuid>.<ext>. */
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
export function incomingPathOk(path: string, uploaderId: string): boolean {
  return new RegExp(`^${UUID}/${UUID}\\.(jpg|jpeg|png|webp|heic|heif|mp4|mov|webm)$`).test(path) && path.startsWith(`${uploaderId}/`);
}

export function cleanText(v: unknown, max: number): string {
  return typeof v === "string" ? v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim().slice(0, max) : "";
}

export function altProblem(alt: string): string | null {
  if (alt.length < 10) return "Describe the photo in at least 10 characters (for people who cannot see it, and for Google).";
  if (alt.length > 300) return "Keep the description under 300 characters.";
  return null;
}

export type PlacementInput = {
  media_id: string;
  col_span: number;
  row_span: number;
  focal_x: number;
  focal_y: number;
  zoom: number;
  published: boolean;
};

const clampInt = (v: unknown, lo: number, hi: number, dflt: number) => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n))) : dflt;
};

/** Normalises a section layout sent by the editor; returns an error for anything malformed. */
export function normaliseLayout(section: unknown, items: unknown): { section: Section; items: PlacementInput[] } | { error: string } {
  if (!isSection(section)) return { error: "Unknown section." };
  if (!Array.isArray(items)) return { error: "The layout was not a list." };
  if (items.length > SECTION_LIMITS[section]) return { error: `This section holds at most ${SECTION_LIMITS[section]} item(s).` };
  const seen = new Set<string>();
  const out: PlacementInput[] = [];
  for (const raw of items) {
    if (!raw || typeof raw !== "object") return { error: "A layout item was malformed." };
    const r = raw as Record<string, unknown>;
    const id = r.media_id;
    if (typeof id !== "string" || !new RegExp(`^${UUID}$`).test(id)) return { error: "A layout item had no valid photo id." };
    if (seen.has(id)) return { error: "The same photo is in this section twice." };
    seen.add(id);
    const zoom = typeof r.zoom === "number" && Number.isFinite(r.zoom) ? Math.min(2, Math.max(1, Math.round(r.zoom * 100) / 100)) : 1;
    out.push({
      media_id: id,
      col_span: clampInt(r.col_span, 1, 4, 1),
      row_span: clampInt(r.row_span, 1, 3, 1),
      focal_x: clampInt(r.focal_x, 0, 100, 50),
      focal_y: clampInt(r.focal_y, 0, 100, 50),
      zoom,
      published: r.published !== false,
    });
  }
  return { section, items: out };
}

export type SettingsInput = {
  phone: string;
  phone_display: string;
  email: string;
  hero_headline: string;
  tagline: string;
  announcement: string;
  children_photos_cleared: boolean;
};

export function validateSettings(raw: Record<string, unknown>): { values: SettingsInput } | { errors: Partial<Record<keyof SettingsInput, string>> } {
  const v: SettingsInput = {
    phone: cleanText(raw.phone, 20).replace(/[\s().-]/g, ""),
    phone_display: cleanText(raw.phone_display, 30),
    email: cleanText(raw.email, 120),
    hero_headline: cleanText(raw.hero_headline, 120),
    tagline: cleanText(raw.tagline, 220),
    announcement: cleanText(raw.announcement, 200),
    children_photos_cleared: raw.children_photos_cleared === true || raw.children_photos_cleared === "on" || raw.children_photos_cleared === "true",
  };
  const errors: Partial<Record<keyof SettingsInput, string>> = {};
  if (!/^\+?[0-9]{7,15}$/.test(v.phone)) errors.phone = "Use digits only, with the country code, e.g. +12242583880.";
  if (v.phone_display.length < 7) errors.phone_display = "Write the number the way visitors should read it.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email)) errors.email = "That email address does not look right.";
  if (v.hero_headline.length < 10) errors.hero_headline = "The headline needs at least 10 characters.";
  if (v.tagline.length < 20) errors.tagline = "The tagline needs at least 20 characters.";
  return Object.keys(errors).length ? { errors } : { values: v };
}
