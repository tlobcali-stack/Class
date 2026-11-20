"use client";

import { useState } from "react";
import { DAYS } from "@/lib/classes";
import { styles } from "@/lib/content";
import { useSiteSettings } from "@/components/SiteSettings";
import { FOR_WHOM, LEVELS, buildTrialRequest } from "@/lib/trial";

/**
 * Trial-class request.
 *
 * DELIVERY MODEL — deliberate: submitting opens a prefilled email in the visitor's
 * own mail app instead of POSTing to a server. A server endpoint needs an email
 * provider and a key, and until one is configured a POST form silently swallows
 * enquiries — the single most expensive bug a site like this can have. A mailto
 * handoff cannot fail silently: either the mail app opens, or the visitor sees it
 * did not and the phone number is right there. The limitation is said on the page.
 * When a provider exists, replace handleSubmit with a server action and keep the
 * field names; lib/trial.ts is the part worth keeping.
 */
export default function TrialForm() {
  const s = useSiteSettings();
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    window.location.href = buildTrialRequest(new FormData(e.currentTarget), s.email).href;
    setSent(true);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-10">
      <p className="rounded-xl border-2 border-dashed border-plum/40 p-4 text-sm leading-relaxed">
        Sending this opens a ready-written email in your own mail app — it is not a booking system, and nothing is
        confirmed until Toolieka replies. If it does not open, call{" "}
        <a href={`tel:${s.phone}`} className="font-extrabold text-magenta underline underline-offset-4">
          {s.phoneDisplay}
        </a>
        .
      </p>

      <fieldset className="grid gap-5 sm:grid-cols-2">
        <legend className="kicker mb-4">About the dancer</legend>
        <div className="sm:col-span-2">
          <label className="field-label" htmlFor="name">Name <span aria-hidden="true">*</span></label>
          <input className="field" id="name" name="name" required autoComplete="name" />
        </div>
        <div>
          <label className="field-label" htmlFor="forWhom">Trial class for</label>
          <select className="field" id="forWhom" name="forWhom" defaultValue="">
            <option value="" disabled>Select…</option>
            {FOR_WHOM.map((o) => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="age">Age <span className="font-normal opacity-70">(if a child or teen)</span></label>
          <input className="field" id="age" name="age" inputMode="numeric" maxLength={3} />
        </div>
        <div className="sm:col-span-2">
          <label className="field-label" htmlFor="level">Experience</label>
          <select className="field" id="level" name="level" defaultValue="">
            <option value="" disabled>Select…</option>
            {LEVELS.map((o) => <option key={o}>{o}</option>)}
          </select>
        </div>
      </fieldset>

      <fieldset>
        <legend className="kicker mb-4">What they want to try</legend>
        <div className="flex flex-wrap gap-2.5">
          {styles.map((st) => (
            <label key={st.name} className="check"><input type="checkbox" name="styles" value={st.name} /> {st.name}</label>
          ))}
          <label className="check"><input type="checkbox" name="styles" value="Not sure yet" /> Not sure yet</label>
        </div>
        <p className="field-label mt-7">Days that suit</p>
        <div className="flex flex-wrap gap-2.5">
          {DAYS.map((d) => (
            <label key={d} className="check"><input type="checkbox" name="days" value={d} /> {d}</label>
          ))}
        </div>
      </fieldset>

      <fieldset className="grid gap-5 sm:grid-cols-2">
        <legend className="kicker mb-4">How to reach you</legend>
        <div>
          <label className="field-label" htmlFor="email">Email <span aria-hidden="true">*</span></label>
          <input className="field" id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div>
          <label className="field-label" htmlFor="phone">Phone <span aria-hidden="true">*</span></label>
          <input className="field" id="phone" name="phone" type="tel" required autoComplete="tel" />
        </div>
        <div className="sm:col-span-2">
          <label className="field-label" htmlFor="message">Anything else we should know?</label>
          <textarea className="field" id="message" name="message" rows={4} maxLength={1200} />
        </div>
      </fieldset>

      <div>
        <button type="submit" className="btn btn-primary w-full sm:w-auto">Open the email to send</button>
        {sent && (
          <p role="status" className="mt-4 rounded-xl bg-plum p-4 text-cream">
            Your email app should have opened with the request written out. Press send there. If nothing opened, call{" "}
            <a href={`tel:${s.phone}`} className="font-extrabold text-marigold underline underline-offset-4">{s.phoneDisplay}</a>.
          </p>
        )}
      </div>
    </form>
  );
}
