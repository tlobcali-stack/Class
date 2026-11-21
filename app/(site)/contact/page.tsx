import type { Metadata } from "next";
import TrialForm from "@/components/TrialForm";
import { site } from "@/lib/site";
import { loadSettings } from "@/lib/settings-source";

export const metadata: Metadata = {
  title: "Book a trial class",
  description: "Ask for a trial class: say who is dancing and what they would like to try.",
  alternates: { canonical: "/contact" },
};

export default async function Contact() {
  const s = await loadSettings();
  return (
    <section data-surface="paper">
      <div className="mx-auto grid max-w-[1280px] gap-14 px-5 py-14 sm:px-8 md:py-20 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="kicker rise">Contact</p>
          <h1 className="display rise rise-2 mt-3 text-[clamp(2.4rem,6vw,4.4rem)]">Book a trial class.</h1>
          <p className="rise rise-3 mt-6 text-lg leading-relaxed">
            Tell us who is dancing and what they would like to try. For the full schedule and class locations, the quickest way is to call.
          </p>

          <ul className="rise rise-3 mt-10 space-y-6">
            <li>
              <p className="kicker kicker-plain">Call</p>
              <a href={`tel:${s.phone}`} className="display mt-1 block text-4xl hover:text-maroon">{s.phoneDisplay}</a>
            </li>
            <li>
              <p className="kicker kicker-plain">Email</p>
              <a href={`mailto:${s.email}`} className="mt-1 block text-lg font-bold underline underline-offset-4 hover:text-maroon">{s.email}</a>
            </li>
            <li>
              <p className="kicker kicker-plain">Where</p>
              <p className="mt-1 text-lg font-bold">Across the USA</p>
            </li>
            <li>
              <p className="kicker kicker-plain">Instagram</p>
              <ul className="mt-1 space-y-1">
                {site.instagram.map((ig) => (
                  <li key={ig.handle}>
                    <a href={ig.url} target="_blank" rel="noopener noreferrer" className="font-bold underline underline-offset-4 hover:text-maroon">{ig.handle}</a>
                  </li>
                ))}
              </ul>
            </li>
          </ul>
        </div>
        <div className="card p-6 sm:p-8">
          <TrialForm />
        </div>
      </div>
    </section>
  );
}
