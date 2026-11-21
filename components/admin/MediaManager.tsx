"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { addVideoLink, deleteMedia, finalizeUpload, updateMedia } from "@/app/admin/actions";
import type { AdminMedia } from "@/lib/admin-data";
import { altProblem, sizeProblem, sniffFile, type Section } from "@/lib/media-validate";
import { browserClient } from "@/lib/supabase/browser";
import Thumb from "@/components/admin/Thumb";

type SectionOpt = { id: Section; label: string };
type Pending = { key: string; file: File; preview: string; kind: "image" | "video"; ext: string; alt: string; caption: string; children: boolean; state: "ready" | "uploading" | "done" | "error"; note?: string };

const EXT: Record<string, string> = { jpg: "jpg", png: "png", webp: "webp", heic: "heic", mp4: "mp4", mov: "mov", webm: "webm" };

function videoSize(file: File): Promise<{ w?: number; h?: number }> {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => { resolve({ w: v.videoWidth || undefined, h: v.videoHeight || undefined }); URL.revokeObjectURL(v.src); };
    v.onerror = () => resolve({});
    v.src = URL.createObjectURL(file);
  });
}

export default function MediaManager({ userId, media, sections }: { userId: string; media: AdminMedia[]; sections: SectionOpt[] }) {
  const router = useRouter();
  const [queue, setQueue] = useState<Pending[]>([]);
  const [target, setTarget] = useState<Section | "">("gallery");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [filter, setFilter] = useState("");
  const label = (s: Section) => sections.find((x) => x.id === s)?.label ?? s;

  async function pick(files: FileList | null) {
    if (!files) return;
    const next: Pending[] = [];
    for (const file of Array.from(files)) {
      const head = new Uint8Array(await file.slice(0, 32).arrayBuffer());
      const kind = sniffFile(head);
      const key = crypto.randomUUID();
      if (!kind) { next.push({ key, file, preview: "", kind: "image", ext: "", alt: "", caption: "", children: false, state: "error", note: "Not a supported photo or video file." }); continue; }
      const sizeErr = sizeProblem(kind.kind, file.size);
      next.push({
        key, file, preview: URL.createObjectURL(file), kind: kind.kind, ext: EXT[kind.ext], alt: "", caption: "", children: false,
        state: sizeErr || kind.ext === "heic" ? "error" : "ready",
        note: sizeErr ?? (kind.ext === "heic" ? "iPhone HEIC photo: share it as JPEG (or set Camera → Formats → Most Compatible) and pick it again." : undefined),
      });
    }
    setQueue((q) => [...q, ...next]);
    setMsg(null);
  }

  const set = (key: string, p: Partial<Pending>) => setQueue((q) => q.map((x) => (x.key === key ? { ...x, ...p } : x)));

  async function uploadAll() {
    const ready = queue.filter((x) => x.state === "ready");
    for (const x of ready) {
      const err = altProblem(x.alt.trim());
      if (err) { set(x.key, { note: err }); setMsg({ ok: false, text: "Each item needs a description first." }); return; }
    }
    setBusy(true);
    let done = 0;
    for (const x of ready) {
      set(x.key, { state: "uploading", note: undefined });
      const path = `${userId}/${crypto.randomUUID()}.${x.ext}`;
      const up = await browserClient().storage.from("incoming").upload(path, x.file, { contentType: x.file.type || undefined, upsert: false });
      if (up.error) { set(x.key, { state: "error", note: "Upload failed. Check your connection and try again." }); continue; }
      const dims = x.kind === "video" ? await videoSize(x.file) : {};
      const r = await finalizeUpload({ incomingPath: path, alt: x.alt, caption: x.caption, showsChildren: x.children, section: target || undefined, videoWidth: dims.w, videoHeight: dims.h });
      if (r.ok) { set(x.key, { state: "done", note: r.message }); done++; } else set(x.key, { state: "error", note: r.error });
    }
    setBusy(false);
    setMsg({ ok: true, text: `${done} of ${ready.length} added${target ? ` to “${label(target)}”` : ""}.` });
    router.refresh();
  }

  const shown = useMemo(() => media.filter((m) => !filter || m.alt.toLowerCase().includes(filter.toLowerCase())), [media, filter]);

  return (
    <div className="mt-8 space-y-10">
      {/* Upload */}
      <section aria-labelledby="up" className="rounded-2xl border-2 border-ink bg-white p-5">
        <h2 id="up" className="text-xl font-extrabold">Upload photos or videos</h2>
        <label
          className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ink/40 p-8 text-center hover:border-maroon"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files); }}
        >
          <span className="font-bold">Drop files here, or click to choose</span>
          <span className="text-sm text-ink/70">JPEG or PNG photos up to 15 MB · MP4, MOV or WebM videos up to 50 MB</span>
          <input type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm" className="sr-only" onChange={(e) => { pick(e.target.files); e.target.value = ""; }} />
        </label>

        {queue.length > 0 && (
          <div className="mt-5 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <label htmlFor="target" className="font-bold">Also put them in:</label>
              <select id="target" className="field !min-h-10 max-w-xs !py-1.5" value={target} onChange={(e) => setTarget(e.target.value as Section | "")}>
                <option value="">Nowhere yet (just the library)</option>
                {sections.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <ul className="space-y-3">
              {queue.map((x) => (
                <li key={x.key} className="grid gap-3 rounded-xl border-2 border-ink/15 p-3 sm:grid-cols-[6rem_1fr]">
                  <div className="aspect-square overflow-hidden rounded-lg bg-ink">
                    {x.preview && (x.kind === "image"
                      // eslint-disable-next-line @next/next/no-img-element -- local preview of the chosen file
                      ? <img src={x.preview} alt="" className="h-full w-full object-cover" />
                      : <video src={x.preview} muted className="h-full w-full object-cover" />)}
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-bold">{x.file.name} · {(x.file.size / 1024 / 1024).toFixed(1)} MB</p>
                    {x.state === "ready" && (
                      <>
                        <label className="block text-sm font-bold">Describe it (who, what, where) — shown to people who can&rsquo;t see it and to Google
                          <input className="field mt-1" value={x.alt} maxLength={300} onChange={(e) => set(x.key, { alt: e.target.value })} placeholder="e.g. Kids class performing a Holi dance on stage" />
                        </label>
                        <label className="block text-sm font-bold">Caption (optional)
                          <input className="field mt-1" value={x.caption} maxLength={300} onChange={(e) => set(x.key, { caption: e.target.value })} />
                        </label>
                        <label className="check"><input type="checkbox" checked={x.children} onChange={(e) => set(x.key, { children: e.target.checked })} /> Shows children</label>
                      </>
                    )}
                    {x.note && <p className={`text-sm font-bold ${x.state === "error" ? "text-maroon" : "text-ink"}`}>{x.note}</p>}
                    {x.state === "uploading" && <p className="text-sm font-bold">Uploading…</p>}
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn btn-primary" disabled={busy || !queue.some((x) => x.state === "ready")} onClick={uploadAll}>{busy ? "Uploading…" : "Upload"}</button>
              <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => setQueue([])}>Clear list</button>
            </div>
          </div>
        )}
        {msg && <p role="status" className={`mt-3 font-bold ${msg.ok ? "text-ink" : "text-maroon"}`}>{msg.text}</p>}
      </section>

      <VideoLinkForm sections={sections} onDone={() => router.refresh()} />

      {/* Library */}
      <section aria-labelledby="lib">
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="lib" className="text-xl font-extrabold">Library ({media.length})</h2>
          <input type="search" placeholder="Search descriptions" value={filter} onChange={(e) => setFilter(e.target.value)} className="field !min-h-10 max-w-xs !py-1.5" />
        </div>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {shown.map((m) => <MediaCard key={m.id} m={m} label={label} onChanged={() => router.refresh()} />)}
        </ul>
      </section>
    </div>
  );
}

function VideoLinkForm({ sections, onDone }: { sections: SectionOpt[]; onDone: () => void }) {
  const [url, setUrl] = useState("");
  const [alt, setAlt] = useState("");
  const [caption, setCaption] = useState("");
  const [children, setChildren] = useState(false);
  const [section, setSection] = useState<Section | "">("gallery");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <section aria-labelledby="vid" className="rounded-2xl border-2 border-ink bg-white p-5">
      <h2 id="vid" className="text-xl font-extrabold">Add a YouTube, Vimeo or Instagram video</h2>
      <form
        className="mt-4 grid gap-3 md:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await addVideoLink({ url, alt, caption, showsChildren: children, section: section || undefined });
            setMsg(r.ok ? { ok: true, text: r.message ?? "Added." } : { ok: false, text: r.error });
            if (r.ok) { setUrl(""); setAlt(""); setCaption(""); setChildren(false); onDone(); }
          });
        }}
      >
        <label className="text-sm font-bold md:col-span-2">Video link
          <input className="field mt-1" type="url" required value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" />
        </label>
        <label className="text-sm font-bold">Describe the video
          <input className="field mt-1" required minLength={10} maxLength={300} value={alt} onChange={(e) => setAlt(e.target.value)} />
        </label>
        <label className="text-sm font-bold">Caption (optional)
          <input className="field mt-1" maxLength={300} value={caption} onChange={(e) => setCaption(e.target.value)} />
        </label>
        <label className="text-sm font-bold">Put it in
          <select className="field mt-1" value={section} onChange={(e) => setSection(e.target.value as Section | "")}>
            <option value="">Nowhere yet (just the library)</option>
            {sections.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </label>
        <label className="check self-end"><input type="checkbox" checked={children} onChange={(e) => setChildren(e.target.checked)} /> Shows children</label>
        <div className="md:col-span-2">
          <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? "Adding…" : "Add video"}</button>
          {msg && <span role="status" className={`ml-3 font-bold ${msg.ok ? "text-ink" : "text-maroon"}`}>{msg.text}</span>}
        </div>
      </form>
    </section>
  );
}

function MediaCard({ m, label, onChanged }: { m: AdminMedia; label: (s: Section) => string; onChanged: () => void }) {
  const [alt, setAlt] = useState(m.alt);
  const [caption, setCaption] = useState(m.caption ?? "");
  const [children, setChildren] = useState(m.showsChildren);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const dirty = alt !== m.alt || caption !== (m.caption ?? "") || children !== m.showsChildren;
  return (
    <li className="flex flex-col overflow-hidden rounded-2xl border-2 border-ink/20 bg-white">
      <div className="aspect-[4/3] bg-ink"><Thumb m={m} /></div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <label className="text-xs font-bold">Description
          <textarea className="field mt-1 !min-h-0 text-sm" rows={2} maxLength={300} value={alt} onChange={(e) => setAlt(e.target.value)} />
        </label>
        <label className="text-xs font-bold">Caption
          <input className="field mt-1 !min-h-9 !py-1 text-sm" maxLength={300} value={caption} onChange={(e) => setCaption(e.target.value)} />
        </label>
        <label className="check !min-h-9 text-sm"><input type="checkbox" checked={children} onChange={(e) => setChildren(e.target.checked)} /> Shows children</label>
        <p className="text-xs text-ink/70">{m.sections.length ? `On: ${m.sections.map(label).join(", ")}` : "Not on the website yet"}</p>
        <div className="mt-auto flex gap-2 pt-1">
          <button type="button" className="btn btn-primary !min-h-9 flex-1 !px-3 !py-1.5 text-sm" disabled={!dirty || pending}
            onClick={() => start(async () => { const r = await updateMedia({ id: m.id, alt, caption, showsChildren: children }); setMsg(r.ok ? { ok: true, text: "Saved." } : { ok: false, text: r.error }); if (r.ok) onChanged(); })}>
            Save
          </button>
          <button type="button" className="rounded-full border-2 border-maroon px-3 text-sm font-bold text-maroon hover:bg-maroon hover:text-paper" disabled={pending}
            onClick={() => {
              const where = m.sections.length ? ` It will also disappear from: ${m.sections.map(label).join(", ")}.` : "";
              if (!window.confirm(`Delete this item permanently?${where} This cannot be undone.`)) return;
              start(async () => { const r = await deleteMedia(m.id); if (r.ok) onChanged(); else setMsg({ ok: false, text: r.error }); });
            }}>
            Delete
          </button>
        </div>
        {msg && <p role="status" className={`text-xs font-bold ${msg.ok ? "text-ink" : "text-maroon"}`}>{msg.text}</p>}
      </div>
    </li>
  );
}
