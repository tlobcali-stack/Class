"use server";

/**
 * Everything the admin panel can change. Each action:
 *   1. checks the caller is an admin (currentAdmin) — the browser is never trusted;
 *   2. validates its input here on the server (lib/media-validate.ts, lib/embeds.ts);
 *   3. writes as that admin, so the database rules (supabase/migrations) apply as well;
 *   4. refreshes the public pages so the change shows straight away.
 */
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import sharp from "sharp";
import { currentAdmin } from "@/lib/admin-auth";
import { parseEmbed } from "@/lib/embeds";
import {
  altProblem, cleanText, incomingPathOk, isSection, normaliseLayout, sizeProblem, sniffFile, validateSettings,
  SECTION_LIMITS, type Section,
} from "@/lib/media-validate";
import { sessionClient } from "@/lib/supabase/clients";
import { site } from "@/lib/site";

export type Result = { ok: true; message?: string } | { ok: false; error: string };
const fail = (error: string): Result => ({ ok: false, error });
const NOT_ADMIN = fail("Your session has ended or you are not an admin. Sign in again.");

function refreshSite() {
  revalidatePath("/", "layout");
}

// ─── Sign in / out ───────────────────────────────────────────────────────────

export async function sendLoginLink(_prev: Result | null, form: FormData): Promise<Result> {
  const email = cleanText(form.get("email"), 120).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return fail("Enter your email address.");
  const db = await sessionClient();
  await db.auth.signInWithOtp({
    email,
    // Never creates an account: only people the owner has added can get a link.
    options: { shouldCreateUser: false, emailRedirectTo: `${site.url}/admin/auth/callback` },
  });
  // Always the same answer — even when Supabase throttles a request — because a different reply
  // for existing accounts would let anyone test which addresses are admins.
  return { ok: true, message: "If that address belongs to an admin, a sign-in link is on its way. It works once, for 15 minutes." };
}

export async function signOut() {
  const db = await sessionClient();
  await db.auth.signOut();
  redirect("/admin/login");
}

// ─── Media ───────────────────────────────────────────────────────────────────

async function appendToSection(db: Awaited<ReturnType<typeof sessionClient>>, mediaId: string, section: Section) {
  const { data: rows } = await db.from("placements").select("media_id, position").eq("section", section).order("position", { ascending: false }).limit(1);
  if (SECTION_LIMITS[section] === 1) {
    // Single-photo sections (hero, about): the new item replaces the old one.
    await db.from("placements").delete().eq("section", section);
    return db.from("placements").insert({ media_id: mediaId, section, position: 0 });
  }
  const next = rows && rows.length ? rows[0].position + 1 : 0;
  return db.from("placements").insert({ media_id: mediaId, section, position: next });
}

/**
 * Called after the browser has uploaded a file to the private "incoming" bucket.
 * Photos are re-encoded here: turned upright, resized to at most 2000 px, and every piece
 * of metadata (camera, date, GPS location) removed — many photos show children.
 */
export async function finalizeUpload(input: {
  incomingPath: string; alt: string; caption?: string; showsChildren: boolean; section?: string; videoWidth?: number; videoHeight?: number;
}): Promise<Result> {
  const a = await currentAdmin();
  if (!a) return NOT_ADMIN;
  const { db, user } = a;
  const removeIncoming = () => db.storage.from("incoming").remove([input.incomingPath]);

  if (!incomingPathOk(String(input.incomingPath), user.id)) return fail("That upload could not be found.");
  const alt = cleanText(input.alt, 300);
  const altErr = altProblem(alt);
  if (altErr) return fail(altErr);
  const caption = cleanText(input.caption, 300) || null;
  const section = input.section && isSection(input.section) ? input.section : null;

  const dl = await db.storage.from("incoming").download(input.incomingPath);
  if (dl.error || !dl.data) return fail("The upload did not arrive. Try again.");
  const bytes = new Uint8Array(await dl.data.arrayBuffer());
  const kind = sniffFile(bytes.subarray(0, 32));
  if (!kind) {
    await removeIncoming();
    return fail("That file type is not supported. Use JPEG or PNG photos, and MP4, MOV or WebM videos.");
  }
  if (kind.ext === "heic") {
    await removeIncoming();
    return fail("This is an iPhone HEIC photo. On the iPhone choose Settings → Camera → Formats → Most Compatible, or share it as JPEG, then upload again.");
  }
  const sizeErr = sizeProblem(kind.kind, bytes.byteLength);
  if (sizeErr) {
    await removeIncoming();
    return fail(sizeErr);
  }

  let body: Uint8Array;
  let ext: string;
  let contentType: string;
  let width: number | null = null;
  let height: number | null = null;
  if (kind.kind === "image") {
    try {
      const img = sharp(bytes, { failOn: "error", limitInputPixels: 80_000_000 }).rotate();
      const meta = await img.metadata();
      const resized = img.resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true });
      // sharp writes no metadata unless asked to, so EXIF/GPS/XMP are dropped here.
      const out = meta.hasAlpha
        ? await resized.png({ compressionLevel: 9 }).toBuffer({ resolveWithObject: true })
        : await resized.jpeg({ quality: 84, mozjpeg: true }).toBuffer({ resolveWithObject: true });
      body = new Uint8Array(out.data);
      ext = meta.hasAlpha ? "png" : "jpg";
      contentType = meta.hasAlpha ? "image/png" : "image/jpeg";
      width = out.info.width;
      height = out.info.height;
    } catch {
      await removeIncoming();
      return fail("That photo could not be read. It may be damaged; try exporting it again.");
    }
  } else {
    body = bytes;
    ext = kind.ext;
    contentType = { mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm" }[kind.ext as "mp4" | "mov" | "webm"];
    const w = Number(input.videoWidth), h = Number(input.videoHeight);
    if (Number.isInteger(w) && Number.isInteger(h) && w > 0 && h > 0 && w <= 10000 && h <= 10000) {
      width = w;
      height = h;
    }
  }

  const path = `uploads/${randomUUID()}.${ext}`;
  // Cached for an hour only, so a deleted photo stops being served soon after it is removed.
  const up = await db.storage.from("media").upload(path, body, { contentType, cacheControl: "3600", upsert: false });
  if (up.error) return fail("Saving the file failed. Try again.");

  const ins = await db
    .from("media")
    .insert({ kind: kind.kind === "image" ? "image" : "video_file", source: "storage", path, alt, caption, width, height, shows_children: Boolean(input.showsChildren) })
    .select("id")
    .single();
  if (ins.error || !ins.data) {
    await db.storage.from("media").remove([path]);
    return fail("Saving the details failed. Try again.");
  }
  if (section) await appendToSection(db, ins.data.id, section);
  await removeIncoming();
  refreshSite();
  return { ok: true, message: kind.kind === "image" ? "Photo added." : "Video added." };
}

export async function addVideoLink(input: { url: string; alt: string; caption?: string; showsChildren: boolean; section?: string }): Promise<Result> {
  const a = await currentAdmin();
  if (!a) return NOT_ADMIN;
  const parsed = parseEmbed(String(input.url ?? ""));
  if ("error" in parsed) return fail(parsed.error);
  const alt = cleanText(input.alt, 300);
  const altErr = altProblem(alt);
  if (altErr) return fail(altErr);
  const ins = await a.db
    .from("media")
    .insert({ kind: "video_embed", source: "embed", embed_url: parsed.embedUrl, alt, caption: cleanText(input.caption, 300) || null, shows_children: Boolean(input.showsChildren) })
    .select("id")
    .single();
  if (ins.error || !ins.data) return fail("Saving the video failed. Try again.");
  if (input.section && isSection(input.section)) await appendToSection(a.db, ins.data.id, input.section);
  refreshSite();
  return { ok: true, message: "Video link added." };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export async function updateMedia(input: { id: string; alt: string; caption: string; showsChildren: boolean }): Promise<Result> {
  const a = await currentAdmin();
  if (!a) return NOT_ADMIN;
  if (!UUID_RE.test(String(input.id))) return fail("Unknown item.");
  const alt = cleanText(input.alt, 300);
  const altErr = altProblem(alt);
  if (altErr) return fail(altErr);
  const { error } = await a.db
    .from("media")
    .update({ alt, caption: cleanText(input.caption, 300) || null, shows_children: Boolean(input.showsChildren) })
    .eq("id", input.id);
  if (error) return fail("Saving failed. Try again.");
  refreshSite();
  return { ok: true, message: "Saved." };
}

export async function deleteMedia(id: string): Promise<Result> {
  const a = await currentAdmin();
  if (!a) return NOT_ADMIN;
  if (!UUID_RE.test(String(id))) return fail("Unknown item.");
  const { data: row } = await a.db.from("media").select("source, path").eq("id", id).single();
  if (!row) return fail("That item no longer exists.");
  const { error } = await a.db.from("media").delete().eq("id", id);
  if (error) return fail("Deleting failed. Try again.");
  // Files shipped with the site (source 'static') stay on disk; only uploads are removed.
  if (row.source === "storage" && row.path) await a.db.storage.from("media").remove([row.path]);
  refreshSite();
  return { ok: true, message: "Deleted." };
}

// ─── Layout ──────────────────────────────────────────────────────────────────

export async function saveLayout(section: string, items: unknown): Promise<Result> {
  const a = await currentAdmin();
  if (!a) return NOT_ADMIN;
  const norm = normaliseLayout(section, items);
  if ("error" in norm) return fail(norm.error);
  const { error } = await a.db.rpc("save_section", { p_section: norm.section, p_items: norm.items });
  if (error) return fail("Saving the layout failed. Reload the page and try again.");
  refreshSite();
  return { ok: true, message: "Layout saved. The live site is updated." };
}

// ─── Site details ────────────────────────────────────────────────────────────

export async function saveSettings(_prev: (Result & { fields?: Record<string, string> }) | null, form: FormData): Promise<Result & { fields?: Record<string, string> }> {
  const a = await currentAdmin();
  if (!a) return NOT_ADMIN;
  const v = validateSettings(Object.fromEntries(form.entries()));
  if ("errors" in v) return { ok: false, error: "Some details need fixing.", fields: v.errors as Record<string, string> };
  const rows = Object.entries(v.values).map(([key, value]) => ({ key, value, updated_at: new Date().toISOString(), updated_by: a.user.id }));
  const { error } = await a.db.from("site_settings").upsert(rows, { onConflict: "key" });
  if (error) return fail("Saving failed. Try again.");
  refreshSite();
  return { ok: true, message: "Site details saved. The live site is updated." };
}
