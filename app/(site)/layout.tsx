import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import AnnouncementBar from "@/components/AnnouncementBar";
import { SiteSettingsProvider } from "@/components/SiteSettings";
import { site } from "@/lib/site";
import { currentAnnouncement } from "@/lib/contentsathi/docs.ts";
import { listPublished } from "@/lib/contentsathi/posts.ts";
import type { AnnouncementContent } from "@/lib/contentsathi/typed.ts";
import { loadSettings, type SiteSettings } from "@/lib/settings-source";

/**
 * These pages are built ahead of time. Admin edits refresh them straight away
 * (revalidatePath in app/admin/actions.ts); this 15-minute refresh also keeps a
 * ContentSathi announcement's start and expiry honest to within that.
 */
export const revalidate = 900;

/**
 * EducationalOrganization, not LocalBusiness: there is no street address or opening
 * hours on record, and a LocalBusiness without them would be invented. Nothing here
 * asserts a rating, a price, a student count or an award — none has been supplied.
 */
function StructuredData({ s }: { s: SiteSettings }) {
  const graph = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    "@id": `${site.url}/#org`,
    name: site.brand,
    description: s.tagline,
    url: site.url,
    telephone: s.phone,
    email: s.email,
    areaServed: { "@type": "Country", name: "United States" },
    founder: { "@type": "Person", name: site.name },
    sameAs: site.instagram.map((i) => i.url),
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(graph).replace(/</g, "\\u003c") }} />;
}

/** An admin's announcement (site details) shows when ContentSathi has none running. */
const adminAnnouncement = (text: string): AnnouncementContent | null =>
  text ? { active: true, text, linkLabel: "", linkHref: "", tone: "info", startsAt: null, expiresAt: null } : null;

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [posts, fromContentSathi, settings] = await Promise.all([listPublished(), currentAnnouncement(), loadSettings()]);
  const showJournal = posts.length > 0;
  return (
    <SiteSettingsProvider value={settings}>
      <StructuredData s={settings} />
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-magenta focus:px-5 focus:py-3 focus:font-extrabold focus:text-cream">
        Skip to content
      </a>
      <AnnouncementBar a={fromContentSathi ?? adminAnnouncement(settings.announcement)} />
      <Nav showJournal={showJournal} />
      <main id="main">{children}</main>
      <Footer showJournal={showJournal} settings={settings} />
    </SiteSettingsProvider>
  );
}
