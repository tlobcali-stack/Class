"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { saveLayout } from "@/app/admin/actions";
import type { AdminMedia, AdminPlacement } from "@/lib/admin-data";
import type { Section } from "@/lib/media-validate";
import FocalPicker from "@/components/admin/FocalPicker";
import Thumb from "@/components/admin/Thumb";

/**
 * Drag-and-drop editor for one section. The grid uses the same columns and row height as
 * the public page (components/MediaGrid.tsx), so what you see is how it will look.
 * Keyboard: focus a tile's handle, press Space, move with the arrow keys, Space to drop.
 */
const COL = ["", "col-span-1", "col-span-2", "col-span-2 md:col-span-3", "col-span-2 md:col-span-4"];
const ROW = ["", "row-span-1", "row-span-2", "row-span-3"];

type Props = { section: Section; limit: number; label: string; media: AdminMedia[]; initial: AdminPlacement[] };

export default function GridEditor({ section, limit, label, media, initial }: Props) {
  const byId = useMemo(() => new Map(media.map((m) => [m.id, m])), [media]);
  const [items, setItems] = useState<AdminPlacement[]>(initial.filter((p) => byId.has(p.mediaId)));
  const [selected, setSelected] = useState<string | null>(items[0]?.mediaId ?? null);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const change = (next: AdminPlacement[]) => {
    setItems(next);
    setDirty(true);
    setStatus(null);
  };
  const patch = (id: string, p: Partial<AdminPlacement>) => change(items.map((it) => (it.mediaId === id ? { ...it, ...p } : it)));

  function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const from = items.findIndex((i) => i.mediaId === e.active.id);
    const to = items.findIndex((i) => i.mediaId === e.over!.id);
    change(arrayMove(items, from, to));
  }

  function add(m: AdminMedia) {
    const fresh: AdminPlacement = { mediaId: m.id, colSpan: 1, rowSpan: m.h / m.w > 1.2 && limit > 1 ? 2 : 1, focalX: 50, focalY: 50, zoom: 1, published: true };
    change(limit === 1 ? [fresh] : [...items, fresh]);
    setSelected(m.id);
    if (limit === 1 || items.length + 1 >= limit) setAdding(false);
  }

  function save() {
    start(async () => {
      const r = await saveLayout(
        section,
        items.map((i) => ({ media_id: i.mediaId, col_span: i.colSpan, row_span: i.rowSpan, focal_x: i.focalX, focal_y: i.focalY, zoom: i.zoom, published: i.published })),
      );
      setStatus(r.ok ? { ok: true, text: r.message ?? "Saved." } : { ok: false, text: r.error });
      if (r.ok) setDirty(false);
    });
  }

  const sel = items.find((i) => i.mediaId === selected) ?? null;
  const selMedia = sel ? byId.get(sel.mediaId) ?? null : null;
  const inSection = new Set(items.map((i) => i.mediaId));
  const candidates = media.filter((m) => !inSection.has(m.id) && (!filter || m.alt.toLowerCase().includes(filter.toLowerCase())));
  const isGrid = limit > 8;

  return (
    <div className="mt-6">
      {/* Save bar */}
      <div className="sticky top-[3.6rem] z-30 flex flex-wrap items-center gap-3 rounded-2xl border-2 border-ink bg-paper p-3 shadow-sm">
        <p className="font-bold">
          {label}: {items.length} item{items.length === 1 ? "" : "s"}
          {limit < 500 ? ` (holds ${limit})` : ""}
        </p>
        <span className="text-sm text-ink/70">{dirty ? "Unsaved changes" : "All changes saved"}</span>
        <div className="ml-auto flex flex-wrap gap-2">
          <button type="button" className="btn btn-ghost !min-h-10 !py-2" onClick={() => setAdding((v) => !v)} aria-expanded={adding}>
            {adding ? "Close library" : limit === 1 ? "Choose a different item" : "Add photos or videos"}
          </button>
          <button type="button" className="btn btn-ghost !min-h-10 !py-2" disabled={!dirty || pending} onClick={() => { setItems(initial.filter((p) => byId.has(p.mediaId))); setDirty(false); setStatus(null); }}>
            Discard changes
          </button>
          <button type="button" className="btn btn-primary !min-h-10 !py-2" disabled={!dirty || pending} onClick={save}>
            {pending ? "Saving…" : "Save layout"}
          </button>
        </div>
        {status && <p role="status" className={`w-full font-bold ${status.ok ? "text-ink" : "text-maroon"}`}>{status.text}</p>}
      </div>

      {adding && (
        <section aria-label="Library" className="mt-4 rounded-2xl border-2 border-ink/30 bg-white p-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-extrabold">Add from your photos and videos</h2>
            <input type="search" placeholder="Search descriptions" value={filter} onChange={(e) => setFilter(e.target.value)} className="field !min-h-10 max-w-xs !py-1.5" />
            <a href="/admin/media" className="text-sm font-bold text-maroon underline">Upload new</a>
          </div>
          {candidates.length === 0 ? (
            <p className="mt-4 text-ink/70">Everything is already in this section. Upload something new on the Photos &amp; videos page.</p>
          ) : (
            <ul className="mt-4 grid max-h-[22rem] grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-5 lg:grid-cols-8">
              {candidates.map((m) => (
                <li key={m.id}>
                  <button type="button" onClick={() => add(m)} className="group relative block aspect-square w-full overflow-hidden rounded-xl border-2 border-transparent hover:border-maroon focus:border-maroon" title={m.alt}>
                    <Thumb m={m} />
                    <span className="sr-only">Add: {m.alt}</span>
                    <span aria-hidden="true" className="absolute right-1 top-1 rounded-full bg-maroon px-2 text-sm font-extrabold text-paper opacity-0 group-hover:opacity-100 group-focus:opacity-100">+</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_20rem]">
        {/* The grid */}
        {/* A fixed id keeps dnd-kit's screen-reader ids the same on the server and in the browser. */}
        <DndContext id={`grid-${section}`} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={items.map((i) => i.mediaId)} strategy={rectSortingStrategy}>
            {items.length === 0 ? (
              <p className="rounded-2xl border-2 border-dashed border-ink/40 p-10 text-center text-ink/70">This section is empty. Press &ldquo;Add photos or videos&rdquo;.</p>
            ) : (
              <ul className={isGrid ? "grid grid-flow-row-dense auto-rows-[9.5rem] grid-cols-2 gap-3 sm:auto-rows-[12rem] md:grid-cols-4" : "grid grid-cols-2 gap-3 md:grid-cols-4"}>
                {items.map((it, idx) => {
                  const m = byId.get(it.mediaId);
                  return m ? (
                    <Tile key={it.mediaId} it={it} m={m} index={idx} grid={isGrid} selected={it.mediaId === selected} onSelect={() => setSelected(it.mediaId)} />
                  ) : null;
                })}
              </ul>
            )}
          </SortableContext>
        </DndContext>

        {/* Controls for the selected item */}
        <aside className="h-fit rounded-2xl border-2 border-ink bg-white p-4 lg:sticky lg:top-40">
          {!sel || !selMedia ? (
            <p className="text-ink/70">Click an item to adjust it.</p>
          ) : (
            <div className="space-y-5">
              <p className="text-sm font-bold leading-snug">{selMedia.alt}</p>

              {selMedia.kind !== "video_embed" && (
                <div>
                  <p className="field-label">What stays in view — click the spot that matters</p>
                  <FocalPicker m={selMedia} x={sel.focalX} y={sel.focalY} onChange={(x, y) => patch(sel.mediaId, { focalX: x, focalY: y })} />
                </div>
              )}

              {selMedia.kind !== "video_embed" && (
                <div>
                  <label htmlFor="zoom" className="field-label">Zoom: {sel.zoom.toFixed(2)}×</label>
                  <input id="zoom" type="range" min={1} max={2} step={0.05} value={sel.zoom} onChange={(e) => patch(sel.mediaId, { zoom: Number(e.target.value) })} className="w-full accent-[var(--color-maroon)]" />
                </div>
              )}

              {isGrid && (
                <div className="grid grid-cols-2 gap-3">
                  <Stepper label="Width" value={sel.colSpan} min={1} max={4} unit="col" onChange={(v) => patch(sel.mediaId, { colSpan: v })} />
                  <Stepper label="Height" value={sel.rowSpan} min={1} max={3} unit="row" onChange={(v) => patch(sel.mediaId, { rowSpan: v })} />
                </div>
              )}

              <label className="check w-full">
                <input type="checkbox" checked={sel.published} onChange={(e) => patch(sel.mediaId, { published: e.target.checked })} />
                Show on the website
              </label>

              {isGrid && (
                <div className="flex gap-2">
                  <button type="button" className="btn btn-ghost !min-h-10 flex-1 !px-3 !py-2" disabled={items[0]?.mediaId === sel.mediaId}
                    onClick={() => change([sel, ...items.filter((i) => i.mediaId !== sel.mediaId)])}>Move to start</button>
                  <button type="button" className="btn btn-ghost !min-h-10 flex-1 !px-3 !py-2" disabled={items.at(-1)?.mediaId === sel.mediaId}
                    onClick={() => change([...items.filter((i) => i.mediaId !== sel.mediaId), sel])}>Move to end</button>
                </div>
              )}

              <button type="button" className="w-full rounded-full border-2 border-maroon px-4 py-2 font-bold text-maroon hover:bg-maroon hover:text-paper"
                onClick={() => { change(items.filter((i) => i.mediaId !== sel.mediaId)); setSelected(null); }}>
                Remove from this section
              </button>
              <p className="text-xs text-ink/60">Removing only takes it off this part of the site. The file stays in Photos &amp; videos.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Tile({ it, m, index, grid, selected, onSelect }: { it: AdminPlacement; m: AdminMedia; index: number; grid: boolean; selected: boolean; onSelect: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: it.mediaId });
  const style = { transform: CSS.Translate.toString(transform), transition, zIndex: isDragging ? 20 : undefined };
  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`${grid ? `${COL[it.colSpan]} ${ROW[it.rowSpan]}` : "aspect-[4/5]"} relative overflow-hidden rounded-2xl border-4 bg-ink ${selected ? "border-maroon" : "border-transparent"} ${isDragging ? "opacity-80 shadow-2xl" : ""} ${it.published ? "" : "opacity-50"}`}
    >
      <button type="button" onClick={onSelect} className="block h-full w-full" aria-pressed={selected} aria-label={`Select item ${index + 1}: ${m.alt}`}>
        <Thumb m={m} focalX={it.focalX} focalY={it.focalY} zoom={it.zoom} />
      </button>
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Drag to move item ${index + 1}`}
        className="absolute left-2 top-2 cursor-grab touch-none rounded-lg bg-paper/95 px-2 py-1 text-sm font-extrabold text-ink shadow active:cursor-grabbing"
      >
        ⠿ {index + 1}
      </button>
      {!it.published && <span className="absolute bottom-2 left-2 rounded bg-ink px-2 py-0.5 text-xs font-bold text-paper">Hidden</span>}
      {m.showsChildren && <span className="absolute bottom-2 right-2 rounded bg-gold px-2 py-0.5 text-xs font-bold text-ink">Children</span>}
    </li>
  );
}

function Stepper({ label, value, min, max, unit, onChange }: { label: string; value: number; min: number; max: number; unit: string; onChange: (v: number) => void }) {
  return (
    <div>
      <p className="field-label">{label}</p>
      <div className="flex items-center gap-2">
        <button type="button" className="h-9 w-9 rounded-full border-2 border-ink font-extrabold disabled:opacity-30" disabled={value <= min} onClick={() => onChange(value - 1)} aria-label={`${label} smaller`}>−</button>
        <span className="min-w-[3.5rem] text-center font-bold" aria-live="polite">{value} {unit}{value === 1 ? "" : "s"}</span>
        <button type="button" className="h-9 w-9 rounded-full border-2 border-ink font-extrabold disabled:opacity-30" disabled={value >= max} onClick={() => onChange(value + 1)} aria-label={`${label} bigger`}>+</button>
      </div>
    </div>
  );
}
