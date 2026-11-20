"use client";

import { createContext, useContext } from "react";
import { builtinSettings, type SiteSettings } from "@/lib/settings-builtin";

/**
 * Hands the admin-editable site details (phone, email, …) to components that run in the
 * browser (the menu, the trial form). Server components call loadSettings() directly.
 * Without a provider the built-in values are used, so nothing ever renders blank.
 */
const Ctx = createContext<SiteSettings>(builtinSettings);

export function SiteSettingsProvider({ value, children }: { value: SiteSettings; children: React.ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useSiteSettings = () => useContext(Ctx);
