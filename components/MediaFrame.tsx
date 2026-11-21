"use client";

import Image from "next/image";
import { useState } from "react";
import type { SiteMedia } from "@/lib/media-source";

/**
 * One photo or video, cropped the way an admin set it: the focus point decides which part
 * stays in view (object-position) and zoom scales around that point. Fills its parent, so
 * the parent decides the size (a grid cell, the hero frame).
 *
 * Embedded videos are click-to-play: nothing loads from YouTube/Vimeo/Instagram (and no
 * cookies are set by them) until the visitor presses play.
 */
export default function MediaFrame({ m, sizes, priority = false, className = "" }: { m: SiteMedia; sizes: string; priority?: boolean; className?: string }) {
  const [playing, setPlaying] = useState(false);
  const pos = `${m.focalX}% ${m.focalY}%`;
  const zoomStyle = m.zoom > 1 ? { transform: `scale(${m.zoom})`, transformOrigin: pos } : undefined;

  if (m.kind === "video_embed" && m.embedUrl) {
    return playing ? (
      <iframe
        src={`${m.embedUrl}${m.embedUrl.includes("?") ? "&" : "?"}autoplay=1`}
        title={m.alt}
        className={`h-full w-full ${className}`}
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    ) : (
      <button type="button" onClick={() => setPlaying(true)} className={`group relative flex h-full min-h-40 w-full items-center justify-center bg-ink text-paper ${className}`} aria-label={`Play video: ${m.alt}`}>
        <span aria-hidden="true" className="flex h-16 w-16 items-center justify-center rounded-full bg-gold text-2xl text-ink transition-transform group-hover:scale-110">▶</span>
        <span className="absolute inset-x-3 bottom-3 line-clamp-2 text-left text-sm font-bold text-paper/90">{m.caption || m.alt}</span>
      </button>
    );
  }

  if (m.kind === "video_file") {
    return (
      <video
        src={m.src}
        controls
        playsInline
        preload="metadata"
        aria-label={m.alt}
        className={`h-full w-full object-cover ${className}`}
        style={{ objectPosition: pos, ...zoomStyle }}
      />
    );
  }

  return (
    <Image
      src={m.src}
      alt={m.alt}
      width={m.w}
      height={m.h}
      sizes={sizes}
      priority={priority}
      className={`h-full w-full object-cover ${className}`}
      style={{ objectPosition: pos, ...zoomStyle }}
    />
  );
}
