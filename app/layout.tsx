import type { Metadata } from "next";
import { Archivo, Fraunces, Space_Mono } from "next/font/google";
import "./globals.css";
import { site, siteUrlConfigured } from "@/lib/site";
import { loadSettings } from "@/lib/settings-source";
import { firstImage } from "@/lib/media-source";

/** Archivo (heavy, tight) for display and body, Fraunces italic for the odd accent word, Space Mono rationed to small kickers. */
const archivo = Archivo({ subsets: ["latin"], variable: "--font-archivo", display: "swap" });
const fraunces = Fraunces({ subsets: ["latin"], style: ["italic"], weight: ["500"], variable: "--font-fraunces", display: "swap" });
const mono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-mono", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const [settings, hero] = await Promise.all([loadSettings(), firstImage("home_hero")]);
  return {
    metadataBase: new URL(site.url),
    title: { default: "The Legends of Bollywood | Bollywood Dance Classes for Kids, Teens & Adults", template: "%s | The Legends of Bollywood" },
    description: settings.tagline,
    openGraph: {
      type: "website",
      title: "The Legends of Bollywood — Bollywood Dance Classes",
      description: settings.tagline,
      images: [{ url: hero.src, width: hero.w, height: hero.h, alt: hero.alt }],
      locale: "en_US",
    },
    // An unconfigured deployment must not be indexed under a placeholder address.
    robots: siteUrlConfigured ? { index: true, follow: true } : { index: false, follow: false },
  };
}

/** The document shell shared by the public site (app/(site)) and the admin panel (app/admin). */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${fraunces.variable} ${mono.variable}`}>
      <body className="bg-cream text-plum antialiased">{children}</body>
    </html>
  );
}
