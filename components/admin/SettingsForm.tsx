"use client";

import { useActionState } from "react";
import { saveSettings, type Result } from "@/app/admin/actions";
import type { SiteSettings } from "@/lib/settings-builtin";

type State = (Result & { fields?: Record<string, string> }) | null;

export default function SettingsForm({ initial }: { initial: SiteSettings }) {
  const [state, action, pending] = useActionState<State, FormData>(saveSettings, null);
  const err = (k: string) => (state && !state.ok ? state.fields?.[k] : undefined);
  const field = (name: string, label: string, value: string, opts: { hint?: string; type?: string; max?: number; area?: boolean } = {}) => (
    <div>
      <label htmlFor={name} className="field-label">{label}</label>
      {opts.area ? (
        <textarea id={name} name={name} defaultValue={value} maxLength={opts.max} rows={2} className="field" aria-invalid={Boolean(err(name))} aria-describedby={`${name}-h`} />
      ) : (
        <input id={name} name={name} type={opts.type ?? "text"} defaultValue={value} maxLength={opts.max} className="field" aria-invalid={Boolean(err(name))} aria-describedby={`${name}-h`} />
      )}
      <p id={`${name}-h`} className={`mt-1 text-sm ${err(name) ? "font-bold text-magenta" : "text-plum/70"}`}>{err(name) ?? opts.hint ?? ""}</p>
    </div>
  );
  return (
    <form action={action} className="mt-6 space-y-5 rounded-2xl border-2 border-plum bg-white p-5">
      <fieldset className="space-y-4">
        <legend className="text-lg font-extrabold">Contact</legend>
        {field("phone_display", "Phone number as visitors see it", initial.phoneDisplay, { hint: "e.g. 224.258.3880", max: 30 })}
        {field("phone", "Phone number for tapping to call", initial.phone, { hint: "Digits with the country code, e.g. +12242583880", type: "tel", max: 20 })}
        {field("email", "Email address", initial.email, { type: "email", max: 120, hint: "Trial-class requests are sent here." })}
      </fieldset>
      <fieldset className="space-y-4">
        <legend className="text-lg font-extrabold">Home page</legend>
        {field("hero_headline", "Main headline", initial.heroHeadline, { max: 120 })}
        {field("tagline", "Line under the headline", initial.tagline, { max: 220, area: true, hint: "Also used in Google results and link previews." })}
        {field("announcement", "Announcement banner (optional)", initial.announcement, { max: 200, hint: "Shown at the top of every page. Leave empty for none." })}
      </fieldset>
      <fieldset>
        <legend className="text-lg font-extrabold">Children&rsquo;s photos</legend>
        <label className="check mt-2">
          <input type="checkbox" name="children_photos_cleared" defaultChecked={initial.childrenPhotosCleared} />
          Show photos marked &ldquo;shows children&rdquo;
        </label>
        <p className="mt-1 text-sm text-plum/70">Turn this off to hide every photo of children at once (for example, if a parent withdraws permission).</p>
      </fieldset>
      <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? "Saving…" : "Save site details"}</button>
      {state && <p role="status" className={`font-bold ${state.ok ? "text-plum" : "text-magenta"}`}>{state.ok ? state.message : state.error}</p>}
    </form>
  );
}
