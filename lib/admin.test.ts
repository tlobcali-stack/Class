import { test } from "node:test";
import assert from "node:assert/strict";
import { parseEmbed } from "./embeds.ts";
import { incomingPathOk, normaliseLayout, sizeProblem, sniffFile, validateSettings, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES } from "./media-validate.ts";

const ok = (input: string) => {
  const r = parseEmbed(input);
  assert.ok(!("error" in r), `${input}: ${"error" in r ? r.error : ""}`);
  return r;
};
const bad = (input: string) => assert.ok("error" in parseEmbed(input), input);

test("YouTube links of every common shape become a youtube-nocookie embed", () => {
  for (const u of [
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtube.com/watch?v=dQw4w9WgXcQ&t=42s",
    "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtu.be/dQw4w9WgXcQ?si=abc",
    "https://www.youtube.com/shorts/dQw4w9WgXcQ",
    "https://www.youtube.com/embed/dQw4w9WgXcQ",
    "  https://www.youtube.com/live/dQw4w9WgXcQ  ",
  ]) assert.equal(ok(u).embedUrl, "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
});

test("Vimeo and Instagram links become their player addresses", () => {
  assert.equal(ok("https://vimeo.com/76979871").embedUrl, "https://player.vimeo.com/video/76979871");
  assert.equal(ok("https://player.vimeo.com/video/76979871").embedUrl, "https://player.vimeo.com/video/76979871");
  assert.equal(ok("https://www.instagram.com/p/Cabc_12-x/").embedUrl, "https://www.instagram.com/p/Cabc_12-x/embed");
  assert.equal(ok("https://instagram.com/reel/Cxyz123/?igsh=1").embedUrl, "https://www.instagram.com/reel/Cxyz123/embed");
});

test("anything else is refused: other hosts, look-alikes, non-https, script URLs", () => {
  for (const u of [
    "javascript:alert(1)",
    "http://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ",
    "https://evil-youtube.com/watch?v=dQw4w9WgXcQ",
    "https://www.youtube.com/watch?v=short",
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ\"><script>",
    "https://vimeo.com/channels/staffpicks",
    "https://www.instagram.com/tlob_usa/",
    "https://www.tiktok.com/@x/video/1",
    "data:text/html,hi",
    "not a url",
  ]) bad(u);
});

const bytes = (...xs: (number | string)[]) => new Uint8Array(xs.flatMap((x) => (typeof x === "string" ? [...x].map((c) => c.charCodeAt(0)) : [x])));

test("files are recognised by their bytes, not their names", () => {
  assert.deepEqual(sniffFile(bytes(0xff, 0xd8, 0xff, 0xe0)), { kind: "image", ext: "jpg" });
  assert.deepEqual(sniffFile(bytes(0x89, "PNG", 0x0d, 0x0a, 0x1a, 0x0a)), { kind: "image", ext: "png" });
  assert.deepEqual(sniffFile(bytes("RIFF", 0, 0, 0, 0, "WEBP")), { kind: "image", ext: "webp" });
  assert.deepEqual(sniffFile(bytes(0, 0, 0, 0x18, "ftyp", "isom")), { kind: "video", ext: "mp4" });
  assert.deepEqual(sniffFile(bytes(0, 0, 0, 0x14, "ftyp", "qt  ")), { kind: "video", ext: "mov" });
  assert.deepEqual(sniffFile(bytes(0, 0, 0, 0x18, "ftyp", "heic")), { kind: "image", ext: "heic" });
  assert.deepEqual(sniffFile(bytes(0x1a, 0x45, 0xdf, 0xa3, 0, 0, 0, 0, 0, 0, 0, 0)), { kind: "video", ext: "webm" });
  assert.equal(sniffFile(bytes("<svg xmlns")), null, "SVG can carry scripts");
  assert.equal(sniffFile(bytes("<html>")), null);
  assert.equal(sniffFile(bytes("GIF89a")), null);
  assert.equal(sniffFile(bytes("%PDF-1.7")), null);
});

test("size limits: 15 MB photos, 50 MB videos, nothing empty", () => {
  assert.equal(sizeProblem("image", MAX_IMAGE_BYTES), null);
  assert.ok(sizeProblem("image", MAX_IMAGE_BYTES + 1));
  assert.equal(sizeProblem("video", MAX_VIDEO_BYTES), null);
  assert.match(sizeProblem("video", MAX_VIDEO_BYTES + 1) ?? "", /YouTube/);
  assert.ok(sizeProblem("image", 0));
});

test("an upload path must be in the uploader's own folder with a safe name", () => {
  const me = "11111111-2222-3333-4444-555555555555";
  const file = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
  assert.ok(incomingPathOk(`${me}/${file}.jpg`, me));
  assert.ok(incomingPathOk(`${me}/${file}.mp4`, me));
  assert.ok(!incomingPathOk(`99999999-2222-3333-4444-555555555555/${file}.jpg`, me), "someone else's folder");
  assert.ok(!incomingPathOk(`${me}/../${file}.jpg`, me));
  assert.ok(!incomingPathOk(`${me}/${file}.svg`, me));
  assert.ok(!incomingPathOk(`${me}/${file}.jpg.exe`, me));
});

const id = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;

test("layouts are clamped to the allowed grid and refuse duplicates or unknown sections", () => {
  const r = normaliseLayout("gallery", [
    { media_id: id(1), col_span: 9, row_span: 0, focal_x: -5, focal_y: 130, zoom: 7, published: true },
    { media_id: id(2), col_span: 2, row_span: 2, focal_x: 30, focal_y: 70, zoom: 1.256, published: false },
  ]);
  assert.ok(!("error" in r));
  assert.deepEqual(r.items[0], { media_id: id(1), col_span: 4, row_span: 1, focal_x: 0, focal_y: 100, zoom: 2, published: true });
  assert.deepEqual(r.items[1], { media_id: id(2), col_span: 2, row_span: 2, focal_x: 30, focal_y: 70, zoom: 1.26, published: false });
  assert.ok("error" in normaliseLayout("gallery", [{ media_id: id(1) }, { media_id: id(1) }]));
  assert.ok("error" in normaliseLayout("admins", []));
  assert.ok("error" in normaliseLayout("gallery", [{ media_id: "1; drop table media" }]));
  assert.ok("error" in normaliseLayout("home_hero", [{ media_id: id(1) }, { media_id: id(2) }]), "the hero holds one photo");
});

test("site details are cleaned and checked", () => {
  const good = validateSettings({
    phone: "+1 (224) 258-3880", phone_display: "224.258.3880", email: "tlobcali@gmail.com",
    hero_headline: "Learn Bollywood from a film-industry performer.", tagline: "Authentic Bollywood dance for kids, teens and adults.",
    announcement: "  Spring term open\u0007  ", children_photos_cleared: "on",
  });
  assert.ok("values" in good);
  assert.equal(good.values.phone, "+12242583880");
  assert.equal(good.values.announcement, "Spring term open");
  assert.equal(good.values.children_photos_cleared, true);
  const badOne = validateSettings({ phone: "call me", phone_display: "x", email: "nope", hero_headline: "Hi", tagline: "short" });
  assert.ok("errors" in badOne);
  assert.deepEqual(Object.keys(badOne.errors).sort(), ["email", "hero_headline", "phone", "phone_display", "tagline"]);
});
