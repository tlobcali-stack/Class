/**
 * Turns a pasted video link into the one embed address this site will show.
 * Only YouTube, Vimeo and Instagram are accepted; everything else (other hosts,
 * javascript:, http:, look-alike domains) is refused. YouTube is embedded from
 * youtube-nocookie.com, which sets no tracking cookies until the video is played.
 *
 * The database checks the same shapes (supabase/migrations/*_media_admin.sql), so a
 * bad address cannot be stored even if this code were bypassed.
 */

export type EmbedProvider = "youtube" | "vimeo" | "instagram";
export type Embed = { provider: EmbedProvider; id: string; embedUrl: string };

const YT_ID = /^[A-Za-z0-9_-]{11}$/;
const IG_CODE = /^[A-Za-z0-9_-]{1,40}$/;

export function parseEmbed(input: string): Embed | { error: string } {
  const raw = input.trim();
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { error: "That is not a web address. Paste the full link, starting with https://" };
  }
  if (url.protocol !== "https:") return { error: "Use the https:// link to the video." };
  const host = url.hostname.toLowerCase().replace(/^(www\.|m\.)/, "");
  const parts = url.pathname.split("/").filter(Boolean);

  if (host === "youtube.com" || host === "youtube-nocookie.com" || host === "youtu.be") {
    let id: string | null = null;
    if (host === "youtu.be") id = parts[0] ?? null;
    else if (parts[0] === "watch") id = url.searchParams.get("v");
    else if (["embed", "shorts", "live", "v"].includes(parts[0] ?? "")) id = parts[1] ?? null;
    if (!id || !YT_ID.test(id)) return { error: "That YouTube link has no video in it. Open the video and copy its address." };
    return { provider: "youtube", id, embedUrl: `https://www.youtube-nocookie.com/embed/${id}` };
  }

  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const id = host === "player.vimeo.com" ? (parts[0] === "video" ? parts[1] : undefined) : parts.find((p) => /^\d+$/.test(p));
    if (!id || !/^\d{1,12}$/.test(id)) return { error: "That Vimeo link has no video number in it." };
    return { provider: "vimeo", id, embedUrl: `https://player.vimeo.com/video/${id}` };
  }

  if (host === "instagram.com") {
    const kind = parts[0] === "reel" || parts[0] === "reels" ? "reel" : parts[0] === "p" ? "p" : null;
    const code = parts[1];
    if (!kind || !code || !IG_CODE.test(code)) return { error: "Use the link to a single Instagram post or reel." };
    return { provider: "instagram", id: code, embedUrl: `https://www.instagram.com/${kind}/${code}/embed` };
  }

  return { error: "Only YouTube, Vimeo and Instagram links can be added." };
}

/** The hosts the site's Content-Security-Policy allows in frames. Keep in step with parseEmbed. */
export const EMBED_FRAME_HOSTS = ["https://www.youtube-nocookie.com", "https://player.vimeo.com", "https://www.instagram.com"] as const;
