"use client";

import type { AdminMedia } from "@/lib/admin-data";

/**
 * Shows the whole photo; clicking (or using the arrow keys) sets the point that must stay
 * in view when the photo is cropped to fit its box on the site.
 */
export default function FocalPicker({ m, x, y, onChange }: { m: AdminMedia; x: number; y: number; onChange: (x: number, y: number) => void }) {
  const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));
  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label="Focus point"
      aria-valuetext={`${x}% from the left, ${y}% from the top`}
      aria-valuenow={x}
      className="relative cursor-crosshair overflow-hidden rounded-xl bg-ink outline-offset-2"
      style={{ aspectRatio: `${m.w} / ${m.h}` }}
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        onChange(clamp(((e.clientX - r.left) / r.width) * 100), clamp(((e.clientY - r.top) / r.height) * 100));
      }}
      onKeyDown={(e) => {
        const step = e.shiftKey ? 10 : 2;
        const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
        const mv = moves[e.key];
        if (mv) {
          e.preventDefault();
          onChange(clamp(x + mv[0]), clamp(y + mv[1]));
        }
      }}
    >
      {m.kind === "video_file" ? (
        <video src={`${m.src}#t=0.5`} muted playsInline preload="metadata" className="h-full w-full" aria-hidden="true" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- exact full-frame preview for picking a point
        <img src={m.src} alt="" className="h-full w-full" draggable={false} />
      )}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-paper shadow-[0_0_0_2px_var(--color-maroon)]"
        style={{ left: `${x}%`, top: `${y}%` }}
      />
    </div>
  );
}
