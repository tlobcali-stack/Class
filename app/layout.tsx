import type { Metadata } from "next";
import { Marcellus, Source_Sans_3, Space_Mono } from "next/font/google";
import "./globals.css";
import { site, siteUrlConfigured } from "@/lib/site";
import { loadSettings } from "@/lib/settings-source";
import { firstImage } from "@/lib/media-source";

/** Marcellus (a classical engraved roman) for headings only; Source Sans 3 for everything people read; Space Mono only inside articles' code. */
const marcellus = Marcellus({ subsets: ["latin"], weight: ["400"], variable: "--font-marcellus", display: "swap" });
const source = Source_Sans_3({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--font-source", display: "swap" });
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
    <html lang="en" className={`${marcellus.variable} ${source.variable} ${mono.variable}`}>
      <body className="bg-paper text-ink antialiased">{children}</body>
    </html>
  );
}
