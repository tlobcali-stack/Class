/**
 * Built-in values for the site details an admin can edit. Kept apart from settings-source
 * so browser code can use them without pulling in the database client.
 *
 * The site details an admin can edit (contact, headline, tagline, announcement, and the
 * children's-photos switch). Read from the database; if there is no database, or it
 * cannot be reached, the built-in values from lib/site.ts and lib/content.ts are used,
 * so the site never shows blanks.
 */
import { tagline as builtinTagline } from "./content.ts";
import { childrenPhotosCleared } from "./photos.ts";
import { site } from "./site.ts";

export type SiteSettings = {
  phone: string;
  phoneDisplay: string;
  email: string;
  heroHeadline: string;
  tagline: string;
  announcement: string;
  childrenPhotosCleared: boolean;
};

export const builtinSettings: SiteSettings = {
  phone: site.phone,
  phoneDisplay: site.phoneDisplay,
  email: site.email,
  heroHeadline: "Learn Bollywood from a film-industry performer.",
  tagline: builtinTagline,
  announcement: "",
  childrenPhotosCleared,
};

