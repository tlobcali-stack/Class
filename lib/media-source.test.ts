import { test } from "node:test";
import assert from "node:assert/strict";
import { builtinSection, mediaFromRows } from "./media-source.ts";
import { settingsFromRows, builtinSettings } from "./settings-source.ts";
import { SECTIONS } from "./media-validate.ts";

const row = (over: Record<string, unknown> = {}, media: Record<string, unknown> = {}) => ({
  col_span: 2, row_span: 1, focal_x: 20, focal_y: 80, zoom: "1.50",
  media: { id: "m1", kind: "image", source: "static", path: "/images/a.jpg", embed_url: null, alt: "A dancer on stage", caption: null, width: 800, height: 600, shows_children: false, ...media },
  ...over,
});

test("database rows become what the page draws, with size, focus and zoom", () => {
  const [m] = mediaFromRows([row()] as never);
  assert.equal(m.src, "/images/a.jpg");
  assert.equal(m.colSpan, 2);
  assert.equal(m.focalX, 20);
  assert.equal(m.focalY, 80);
  assert.equal(m.zoom, 1.5);
});

test("uploaded files point at the public storage bucket; embeds keep their player address", () => {
  const [up] = mediaFromRows([row({}, { source: "storage", path: "uploads/x.jpg" })] as never);
  assert.match(up.src, /\/storage\/v1\/object\/public\/media\/uploads\/x\.jpg$/);
  const [v] = mediaFromRows([row({}, { kind: "video_embed", source: "embed", path: null, embed_url: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ" })] as never);
  assert.equal(v.kind, "video_embed");
  assert.equal(v.embedUrl, "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
});

test("broken rows are skipped instead of drawing empty boxes", () => {
  assert.equal(mediaFromRows([row({}, { path: null })] as never).length, 0);
  assert.equal(mediaFromRows([row({}, { kind: "video_embed", source: "embed", path: null, embed_url: null })] as never).length, 0);
  assert.equal(mediaFromRows([{ ...row(), media: null }] as never).length, 0);
});

test("every section has built-in content for when there is no database", () => {
  for (const s of SECTIONS) assert.ok(builtinSection(s).length > 0, s);
  assert.equal(builtinSection("home_hero").length, 1);
});

test("site settings fall back field by field to the built-in values", () => {
  const s = settingsFromRows([{ key: "email", value: "new@example.com" }, { key: "tagline", value: "" }, { key: "children_photos_cleared", value: false }]);
  assert.equal(s.email, "new@example.com");
  assert.equal(s.tagline, builtinSettings.tagline, "an empty tagline falls back");
  assert.equal(s.phone, builtinSettings.phone);
  assert.equal(s.childrenPhotosCleared, false);
  assert.deepEqual(settingsFromRows([]), builtinSettings);
});
