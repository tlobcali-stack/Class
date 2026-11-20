/**
 * Security tests for the database rules, run against a real (local) Supabase:
 *
 *   npx supabase start && npx supabase db reset
 *   npm run test:db
 *
 * They create throwaway users, act as a visitor, a signed-in non-admin and an admin, and
 * check that only the admin can change anything. Never point these at production.
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  Object.entries(JSON.parse(execFileSync("npx", ["supabase", "status", "-o", "json"], { encoding: "utf8" })) as Record<string, string>),
);
const URL_ = env.API_URL;
assert.match(URL_, /^http:\/\/(127\.0\.0\.1|localhost):/, "refusing to run security tests anywhere but a local Supabase");
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const service = createClient(URL_, env.SERVICE_ROLE_KEY, opts);
const anon = createClient(URL_, env.ANON_KEY, opts);

const stamp = Date.now();
const ADMIN = { email: `admin-${stamp}@example.test`, password: `pw-${stamp}-A!x9` };
const OTHER = { email: `user-${stamp}@example.test`, password: `pw-${stamp}-B!x9` };
let admin: SupabaseClient, other: SupabaseClient, adminId = "", otherId = "";
const tiny = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46]);

async function signedIn(u: { email: string; password: string }) {
  const c = createClient(URL_, env.ANON_KEY, opts);
  const { error } = await c.auth.signInWithPassword(u);
  assert.ifError(error);
  return c;
}

before(async () => {
  const a = await service.auth.admin.createUser({ ...ADMIN, email_confirm: true });
  const o = await service.auth.admin.createUser({ ...OTHER, email_confirm: true });
  assert.ifError(a.error);
  assert.ifError(o.error);
  adminId = a.data.user!.id;
  otherId = o.data.user!.id;
  assert.ifError((await service.from("admins").insert({ user_id: adminId, email: ADMIN.email })).error);
  admin = await signedIn(ADMIN);
  other = await signedIn(OTHER);
});

after(async () => {
  await service.from("media").delete().like("alt", `rls-test-${stamp}%`);
  await service.storage.from("incoming").remove([`${adminId}/rls-${stamp}.jpg`]);
  await service.storage.from("media").remove([`uploads/rls-${stamp}.jpg`]);
  await service.auth.admin.deleteUser(adminId);
  await service.auth.admin.deleteUser(otherId);
});

const sampleMedia = () => ({ kind: "image", source: "static", path: `/images/rls-${stamp}-${Math.random().toString(36).slice(2)}.jpg`, alt: `rls-test-${stamp} sample photo`, width: 10, height: 10 });

test("visitors can read the published site", async () => {
  const m = await anon.from("media").select("id", { count: "exact", head: true });
  assert.ifError(m.error);
  assert.ok((m.count ?? 0) > 100, `expected the seeded photos, got ${m.count}`);
  const s = await anon.from("site_settings").select("key");
  assert.ok((s.data ?? []).length >= 7);
});

for (const [who, client] of [["a visitor", () => anon], ["a signed-in non-admin", () => other]] as const) {
  test(`${who} cannot change anything`, async () => {
    const c = client();
    const ins = await c.from("media").insert(sampleMedia()).select();
    assert.ok(ins.error || (ins.data ?? []).length === 0, "insert media");

    const any = (await service.from("media").select("id").limit(1)).data![0].id;
    const upd = await c.from("media").update({ alt: "defaced by an attacker!!" }).eq("id", any).select();
    assert.ok(upd.error || (upd.data ?? []).length === 0, "update media");
    const del = await c.from("media").delete().eq("id", any).select();
    assert.ok(del.error || (del.data ?? []).length === 0, "delete media");

    const pl = await c.from("placements").update({ published: false }).eq("section", "gallery").select();
    assert.ok(pl.error || (pl.data ?? []).length === 0, "update placements");
    const st = await c.from("site_settings").update({ value: '"hacked@example.com"' }).eq("key", "email").select();
    assert.ok(st.error || (st.data ?? []).length === 0, "update settings");
    const rpc = await c.rpc("save_section", { p_section: "gallery", p_items: [] });
    assert.ok(rpc.error, "save_section must refuse");
    const adm = await c.from("admins").insert({ user_id: otherId, email: OTHER.email });
    assert.ok(adm.error, "cannot make themselves an admin");

    const up = await c.storage.from("media").upload(`uploads/rls-${stamp}.jpg`, tiny, { contentType: "image/jpeg" });
    assert.ok(up.error, "cannot upload to the public media bucket");
    const inc = await c.storage.from("incoming").upload(`${otherId}/rls-${stamp}.jpg`, tiny, { contentType: "image/jpeg" });
    assert.ok(inc.error, "cannot upload to incoming");

    const after = await service.from("site_settings").select("value").eq("key", "email").single();
    assert.notEqual(after.data!.value, "hacked@example.com");
    assert.equal((await service.from("placements").select("id", { count: "exact", head: true }).eq("published", false)).count, 0);
  });
}

test("a signed-in non-admin cannot see the admin list", async () => {
  const r = await other.from("admins").select("*");
  assert.equal((r.data ?? []).length, 0);
});

test("nobody can sign themselves up", async () => {
  const r = await anon.auth.signUp({ email: `stranger-${stamp}@example.test`, password: "whatever-123456" });
  assert.ok(r.error, "sign-ups must be disabled");
});

test("an admin can add, arrange, hide and delete", async () => {
  const ins = await admin.from("media").insert(sampleMedia()).select().single();
  assert.ifError(ins.error);
  const id = ins.data.id as string;

  const before = (await admin.from("placements").select("media_id, position").eq("section", "recognition").order("position")).data!;
  const items = [{ media_id: id, col_span: 2, row_span: 1, focal_x: 20, focal_y: 80, zoom: 1.5, published: false },
    ...before.map((p) => ({ media_id: p.media_id, col_span: 1, row_span: 1, focal_x: 50, focal_y: 50, zoom: 1, published: true }))];
  assert.ifError((await admin.rpc("save_section", { p_section: "recognition", p_items: items })).error);

  const mine = await admin.from("placements").select("*").eq("section", "recognition").eq("media_id", id).single();
  assert.equal(mine.data!.position, 0);
  assert.equal(mine.data!.col_span, 2);
  assert.equal(Number(mine.data!.zoom), 1.5);

  // Hidden (unpublished) items are invisible to visitors.
  const seen = await anon.from("placements").select("id").eq("media_id", id);
  assert.equal((seen.data ?? []).length, 0, "an unpublished placement must not be public");
  const seenMedia = await anon.from("media").select("id").eq("id", id);
  assert.equal((seenMedia.data ?? []).length, 0, "media only placed unpublished must not be public");

  // Out-of-range values are refused by the database itself.
  const badSpan = await admin.rpc("save_section", { p_section: "recognition", p_items: [{ ...items[0], col_span: 9 }] });
  assert.ok(badSpan.error, "col_span 9 must be refused");
  const badEmbed = await admin.from("media").insert({ kind: "video_embed", source: "embed", embed_url: "https://evil.example/x", alt: `rls-test-${stamp} bad embed` });
  assert.ok(badEmbed.error, "an embed from an unknown host must be refused");

  // Restore the section and remove the test item.
  assert.ifError((await admin.rpc("save_section", { p_section: "recognition", p_items: items.slice(1) })).error);
  assert.ifError((await admin.from("media").delete().eq("id", id)).error);
});

test("an admin uploads only into their own incoming folder, and into media", async () => {
  const mine = await admin.storage.from("incoming").upload(`${adminId}/rls-${stamp}.jpg`, tiny, { contentType: "image/jpeg" });
  assert.ifError(mine.error);
  const theirs = await admin.storage.from("incoming").upload(`${otherId}/rls-${stamp}.jpg`, tiny, { contentType: "image/jpeg" });
  assert.ok(theirs.error, "not into another user's folder");
  const pub = await admin.storage.from("media").upload(`uploads/rls-${stamp}.jpg`, tiny, { contentType: "image/jpeg" });
  assert.ifError(pub.error);
  const svg = await admin.storage.from("media").upload(`uploads/rls-${stamp}.svg`, new TextEncoder().encode("<svg/>"), { contentType: "image/svg+xml" });
  assert.ok(svg.error, "SVG (which can carry scripts) is not an allowed type");
});

test("children's photos disappear for visitors when the switch is off", async () => {
  const kids = (await service.from("media").select("id", { count: "exact", head: true }).eq("shows_children", true)).count ?? 0;
  assert.ok(kids > 0);
  try {
    assert.ifError((await admin.from("site_settings").update({ value: false }).eq("key", "children_photos_cleared")).error);
    const visible = await anon.from("media").select("id").eq("shows_children", true);
    assert.equal((visible.data ?? []).length, 0);
    const placed = await anon.from("placements").select("media_id, media!inner(shows_children)").eq("media.shows_children", true);
    assert.equal((placed.data ?? []).length, 0);
  } finally {
    await admin.from("site_settings").update({ value: true }).eq("key", "children_photos_cleared");
  }
});
