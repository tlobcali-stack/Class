"use client";

import type { AdminMedia } from "@/lib/admin-data";

/** A small preview of a media item for the admin screens (plain <img>/<video>, no optimiser). */
export default function Thumb({ m, focalX = 50, focalY = 50, zoom = 1 }: { m: AdminMedia; focalX?: number; focalY?: number; zoom?: number }) {
  const pos = `${focalX}% ${focalY}%`;
  const style = { objectPosition: pos, transform: zoom > 1 ? `scale(${zoom})` : undefined, transformOrigin: pos };
  if (m.kind === "video_embed") {
    return (
      <span className="flex h-full w-full flex-col items-center justify-center gap-1 bg-ink p-2 text-center text-paper">
        <span aria-hidden="true" className="text-2xl">▶</span>
        <span className="line-clamp-2 text-xs font-bold">{m.embedUrl?.includes("youtube") ? "YouTube" : m.embedUrl?.includes("vimeo") ? "Vimeo" : "Instagram"} video</span>
      </span>
    );
  }
  if (m.kind === "video_file") {
    return <video src={`${m.src}#t=0.5`} muted playsInline preload="metadata" className="h-full w-full object-cover" style={style} aria-hidden="true" />;
  }
  // eslint-disable-next-line @next/next/no-img-element -- admin previews: plain img keeps them fast and exact
  return <img src={m.src} alt="" loading="lazy" className="h-full w-full object-cover" style={style} />;
}
