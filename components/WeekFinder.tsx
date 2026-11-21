"use client";

import Link from "next/link";
import { useState } from "react";
import { DAYS, DAY_NAMES, type ClassEntry, type Day } from "@/lib/classes";

export interface FinderGroup {
  id: string;
  label: string;
  blurb: string;
  /** Already sorted Sunday first, morning before evening (classesFor). */
  classes: ClassEntry[];
}

/**
 * The home page's class board: pick who is dancing, see that group's week.
 * Every row comes from the schedule (lib/classes.ts or ContentSathi's schedule.json);
 * nothing here adds a time, price or place the schedule does not have.
 */
export default function WeekFinder({
  groups,
  confirmed,
  note,
  phone,
  phoneDisplay,
}: {
  groups: FinderGroup[];
  confirmed: boolean;
  note: string;
  phone: string;
  phoneDisplay: string;
}) {
  const [active, setActive] = useState(groups[0]?.id ?? "");
  const group = groups.find((g) => g.id === active) ?? groups[0];
  if (!group) return null;

  const byDay = new Map<Day, ClassEntry[]>();
  for (const d of DAYS) byDay.set(d, []);
  for (const c of group.classes) byDay.get(c.day)?.push(c);

  return (
    <div className="board" data-surface="wine">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="display whitespace-nowrap text-[clamp(1.9rem,4vw,3rem)]">Who is dancing?</h2>
          <p className="mt-2 max-w-md text-paper/80">{group.blurb}</p>
        </div>
        <div role="group" aria-label="Show the week for" className="flex flex-wrap gap-2">
          {groups.map((g) => (
            <button
              key={g.id}
              type="button"
              aria-pressed={g.id === group.id}
              aria-controls="week-board"
              onClick={() => setActive(g.id)}
              className="who"
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      <ol id="week-board" aria-live="polite" aria-label={`${group.label}: classes by day`} className="week">
        {DAYS.map((d) => {
          const list = byDay.get(d) ?? [];
          return (
            <li key={d} className={list.length ? "day" : "day day-empty"}>
              <p className="day-name">
                <span aria-hidden="true">{d}</span>
                <span className="sr-only">{DAY_NAMES[d]}</span>
              </p>
              {list.length ? (
                <ul className="mt-3 space-y-3">
                  {list.map((c) => (
                    <li key={`${c.name}-${c.time}`} className="slot">
                      <p className="slot-time">{c.clock || c.time}</p>
                      <p className="mt-0.5 font-semibold leading-tight">{c.name}</p>
                      <p className="text-sm text-paper/75">{c.level}</p>
                      {c.location && <p className="text-sm text-paper/75">{c.location}</p>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-paper/45">No class</p>
              )}
            </li>
          );
        })}
      </ol>

      <div className="mt-8 flex flex-col gap-5 border-t border-paper/15 pt-6 md:flex-row md:items-center md:justify-between">
        <p className="max-w-xl text-paper/85">
          {note && <span className="block font-semibold text-paper">{note}</span>}
          {confirmed ? (
            "Spaces depend on the class. Ask about a trial first."
          ) : (
            <>
              <span className="font-semibold text-paper">Call to confirm days and times. </span>
              This is the weekly programme as it has been listed, and it can change. Call{" "}
              <a href={`tel:${phone}`} className="font-semibold text-gold underline underline-offset-4">{phoneDisplay}</a>{" "}
              for the full schedule and class locations.
            </>
          )}
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/contact" className="btn btn-primary">Book a trial class</Link>
          <Link href={`/classes#${group.id}`} className="btn btn-ghost">All {group.label.toLowerCase()} classes</Link>
        </div>
      </div>
    </div>
  );
}
