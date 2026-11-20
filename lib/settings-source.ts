/**
 * The site details an admin can edit, read from the database with a field-by-field
 * fallback to the built-in values (lib/settings-builtin.ts).
 */
import { builtinSettings, type SiteSettings } from "./settings-builtin.ts";
import { publicClient } from "./supabase/clients.ts";

export { builtinSettings, type SiteSettings };

const str = (v: unknown, fallback: string) => (typeof v === "string" && v.trim() ? v : fallback);

/** Pure: database rows → settings, falling back field by field. Tested. */
export function settingsFromRows(rows: { key: string; value: unknown }[]): SiteSettings {
  const m = new Map(rows.map((r) => [r.key, r.value]));
  const b = builtinSettings;
  return {
    phone: str(m.get("phone"), b.phone),
    phoneDisplay: str(m.get("phone_display"), b.phoneDisplay),
    email: str(m.get("email"), b.email),
    heroHeadline: str(m.get("hero_headline"), b.heroHeadline),
    tagline: str(m.get("tagline"), b.tagline),
    announcement: typeof m.get("announcement") === "string" ? (m.get("announcement") as string) : b.announcement,
    childrenPhotosCleared: typeof m.get("children_photos_cleared") === "boolean" ? (m.get("children_photos_cleared") as boolean) : b.childrenPhotosCleared,
  };
}

export async function loadSettings(): Promise<SiteSettings> {
  const db = publicClient();
  if (!db) return builtinSettings;
  try {
    const { data, error } = await db.from("site_settings").select("key, value");
    if (error) throw error;
    return settingsFromRows(data ?? []);
  } catch (e) {
    console.error("site settings: using built-in values;", e instanceof Error ? e.message : e);
    return builtinSettings;
  }
}
