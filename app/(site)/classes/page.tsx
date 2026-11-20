import type { Metadata } from "next";
import Link from "next/link";
import { AUDIENCES, DAYS, DAY_NAMES, classesFor, classesOn } from "@/lib/classes";
import { loadSchedule } from "@/lib/schedule-source";
import { loadSettings } from "@/lib/settings-source";

export const metadata: Metadata = {
  title: "Classes",
  description: "Bollywood, semi-classical, Indo-fusion and hip-hop classes for kids, teens and adults — listed by who they are for.",
  alternates: { canonical: "/classes" },
};

export default async function Classes() {
  const s = await loadSettings();
  const { entries, confirmed, note } = await loadSchedule();
  const audiences = AUDIENCES.filter((a) => classesFor(a.id, entries).length > 0);
  return (
    <>
      <section data-surface="cream">
        <div className="mx-auto max-w-[1280px] px-5 pb-12 pt-14 sm:px-8 md:pt-20">
          <p className="kicker rise">Classes</p>
          <h1 className="display rise rise-2 mt-3 max-w-3xl text-[clamp(2.4rem,6.5vw,5rem)]">Find the right class.</h1>
          <p className="rise rise-3 mt-6 max-w-2xl text-lg leading-relaxed">
            Listed by who they are for. Each class shows its age or level, the day, and the time of day.
          </p>

          {!confirmed && (
            <div role="note" className="rise rise-3 mt-8 max-w-2xl rounded-2xl border-2 border-plum bg-cream-warm p-5">
              <p className="font-extrabold">Call to confirm days and times.</p>
              <p className="mt-1 leading-relaxed">
                This is the programme as it has been listed, and it can change. For the full schedule and class locations, call{" "}
                <a href={`tel:${s.phone}`} className="font-extrabold text-magenta underline underline-offset-4">{s.phoneDisplay}</a>.
              </p>
            </div>
          )}

          {note && (
            <p role="note" className="rise rise-3 mt-4 max-w-2xl rounded-2xl border-2 border-plum bg-marigold px-5 py-3 font-bold">
              {note}
            </p>
          )}

          <nav aria-label="Jump to" className="rise rise-3 mt-8 flex flex-wrap gap-2.5">
            {audiences.map((a) => (
              <a key={a.id} href={`#${a.id}`} className="chip hover:bg-plum hover:text-cream">{a.label}</a>
            ))}
          </nav>
        </div>
      </section>

      {audiences.map((a, i) => (
        <section key={a.id} id={a.id} data-surface={i % 2 === 0 ? "warm" : "cream"} className="scroll-mt-20">
          <div className="mx-auto max-w-[1280px] px-5 py-14 sm:px-8 md:py-20">
            <h2 className="display text-[clamp(1.8rem,4vw,3rem)]">{a.label}</h2>
            <p className="mt-2 max-w-xl text-plum/80">{a.blurb}</p>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {classesFor(a.id, entries).map((c) => (
                <li key={`${c.day}-${c.name}`} className="card p-5">
                  <p className="kicker">{DAY_NAMES[c.day]} · {c.time}{c.clock ? ` · ${c.clock}` : ""}</p>
                  <p className="display mt-2 text-2xl !leading-tight">{c.name}</p>
                  <p className="mt-2 font-bold text-plum/80">{c.level}</p>
                  {c.location && <p className="mt-1 text-sm text-plum/70">{c.location}</p>}
                </li>
              ))}
            </ul>
          </div>
        </section>
      ))}

      <section data-surface="plum">
        <div className="mx-auto max-w-[1280px] px-5 py-16 sm:px-8 md:py-24">
          <h2 className="display text-[clamp(1.8rem,4vw,3rem)]">The week at a glance</h2>
          <div className="mt-10 grid gap-x-6 gap-y-8 md:grid-cols-2 lg:grid-cols-4">
            {DAYS.filter((d) => classesOn(d, entries).length > 0).map((d) => (
              <div key={d}>
                <h3 className="kicker border-b border-cream/25 pb-2">{DAY_NAMES[d]}</h3>
                <ul className="mt-3 space-y-3">
                  {classesOn(d, entries).map((c) => (
                    <li key={c.name}>
                      <span className="font-extrabold">{c.name}</span>
                      <span className="block text-sm text-cream/70">{c.level} · {c.time}{c.clock ? ` · ${c.clock}` : ""}{c.location ? ` · ${c.location}` : ""}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section data-surface="sun">
        <div className="mx-auto max-w-[1280px] px-5 py-16 text-center sm:px-8 md:py-24">
          <h2 className="display mx-auto max-w-2xl text-[clamp(2rem,5vw,3.6rem)]">Not sure which one?</h2>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed">Say who is dancing and what they have done before. Toolieka will point you to the right class.</p>
          <Link href="/contact" className="btn btn-primary mt-8">Book a trial class</Link>
        </div>
      </section>
    </>
  );
}
