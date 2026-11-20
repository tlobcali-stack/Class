-- The Legends of Bollywood: admin-managed media, page layout and site details.
--
-- Security model (enforced here, in the database, not only in the app):
--   * Visitors (anon) can READ only what is published: placements marked published, the
--     media they point to, and the public site settings. Photos marked shows_children are
--     hidden from visitors unless the children_photos_cleared setting is true.
--   * Only users listed in public.admins can WRITE anything. Being signed in is not enough.
--   * Nobody can add an admin through the API: admins are added with SQL by the owner
--     (see scripts/add-admin.sql). Sign-ups are disabled in supabase/config.toml.
--   * Uploads land in a private "incoming" bucket under the uploader's own folder; the server
--     cleans each file (images: resized, all metadata incl. GPS removed) into the public
--     "media" bucket, which only admins can write to.

-- ─── Admins ──────────────────────────────────────────────────────────────────
create table public.admins (
  user_id  uuid primary key references auth.users (id) on delete cascade,
  email    text not null,
  added_at timestamptz not null default now()
);
alter table public.admins enable row level security;

-- SECURITY DEFINER so policies can check membership without exposing the table.
create function public.is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create policy "admins can see the admin list" on public.admins
  for select to authenticated using ((select public.is_admin()));
-- No insert/update/delete policies: the admin list is changed with SQL only.

-- ─── Site settings ───────────────────────────────────────────────────────────
create table public.site_settings (
  key        text primary key check (key in (
               'phone', 'phone_display', 'email', 'hero_headline', 'tagline',
               'announcement', 'children_photos_cleared')),
  value      jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid()
);
alter table public.site_settings enable row level security;

create policy "anyone can read site settings" on public.site_settings
  for select to anon, authenticated using (true);
create policy "admins insert settings" on public.site_settings
  for insert to authenticated with check ((select public.is_admin()));
create policy "admins update settings" on public.site_settings
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admins delete settings" on public.site_settings
  for delete to authenticated using ((select public.is_admin()));

create function public.children_cleared() returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select value = 'true'::jsonb from public.site_settings where key = 'children_photos_cleared'),
    false);
$$;
revoke all on function public.children_cleared() from public;
grant execute on function public.children_cleared() to anon, authenticated;

-- ─── Media ───────────────────────────────────────────────────────────────────
create table public.media (
  id             uuid primary key default gen_random_uuid(),
  kind           text not null check (kind in ('image', 'video_file', 'video_embed')),
  -- 'static'  = a file shipped with the site, path like /images/tlob/gallery-1.jpg
  -- 'storage' = an object in the public "media" bucket, path like uploads/<uuid>.jpg
  -- 'embed'   = a YouTube / Vimeo / Instagram player URL in embed_url
  source         text not null check (source in ('static', 'storage', 'embed')),
  path           text check (
                   path is null
                   or (source = 'static'  and path ~ '^/images/[A-Za-z0-9][A-Za-z0-9/_.-]*\.(jpg|jpeg|png|webp)$' and path !~ '\.\.')
                   or (source = 'storage' and path ~ '^uploads/[0-9a-f-]{36}\.(jpg|png|mp4|webm|mov)$')),
  embed_url      text check (
                   embed_url is null
                   or embed_url ~ '^https://(www\.youtube-nocookie\.com/embed/[A-Za-z0-9_-]{11}|player\.vimeo\.com/video/[0-9]{1,12}|www\.instagram\.com/(p|reel)/[A-Za-z0-9_-]{1,40}/embed)$'),
  alt            text not null check (char_length(alt) between 10 and 300),
  caption        text check (caption is null or char_length(caption) <= 300),
  width          integer check (width is null or width between 1 and 10000),
  height         integer check (height is null or height between 1 and 10000),
  shows_children boolean not null default false,
  created_at     timestamptz not null default now(),
  created_by     uuid default auth.uid(),
  constraint media_source_matches_kind check (
    (kind = 'video_embed' and source = 'embed' and embed_url is not null and path is null)
    or (kind <> 'video_embed' and source <> 'embed' and path is not null and embed_url is null)),
  constraint media_static_is_image check (source <> 'static' or kind = 'image')
);
create unique index media_path_unique on public.media (path) where path is not null;
alter table public.media enable row level security;

-- ─── Placements: where an item appears, in what order, size and crop ─────────
create table public.placements (
  id         uuid primary key default gen_random_uuid(),
  media_id   uuid not null references public.media (id) on delete cascade,
  section    text not null check (section in (
               'home_hero', 'home_on_stage', 'about', 'gallery',
               'on_screen', 'recognition', 'earlier_website')),
  position   integer not null check (position >= 0),
  col_span   smallint not null default 1 check (col_span between 1 and 4),
  row_span   smallint not null default 1 check (row_span between 1 and 3),
  focal_x    smallint not null default 50 check (focal_x between 0 and 100),
  focal_y    smallint not null default 50 check (focal_y between 0 and 100),
  zoom       numeric(3, 2) not null default 1 check (zoom between 1 and 2),
  published  boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (section, media_id)
);
create index placements_section_position on public.placements (section, position);
create index placements_media on public.placements (media_id);
alter table public.placements enable row level security;

-- Is this media item visible to the public? SECURITY DEFINER avoids the two tables'
-- policies calling each other (which Postgres reports as infinite recursion).
create function public.media_visible(m_id uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.media m
    join public.placements p on p.media_id = m.id
    where m.id = m_id
      and p.published
      and (not m.shows_children or public.children_cleared()));
$$;
revoke all on function public.media_visible(uuid) from public;
grant execute on function public.media_visible(uuid) to anon, authenticated;

create policy "public reads visible media; admins read all" on public.media
  for select to anon, authenticated
  using ((select public.is_admin()) or public.media_visible(id));
create policy "admins insert media" on public.media
  for insert to authenticated with check ((select public.is_admin()));
create policy "admins update media" on public.media
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admins delete media" on public.media
  for delete to authenticated using ((select public.is_admin()));

create policy "public reads published placements; admins read all" on public.placements
  for select to anon, authenticated
  using ((select public.is_admin()) or (published and public.media_visible(media_id)));
create policy "admins insert placements" on public.placements
  for insert to authenticated with check ((select public.is_admin()));
create policy "admins update placements" on public.placements
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admins delete placements" on public.placements
  for delete to authenticated using ((select public.is_admin()));

-- Table privileges, stated explicitly rather than relying on Supabase's defaults (which newer
-- projects may not grant). Row-level security above still decides WHICH rows; these decide
-- which KINDS of statement can reach the policies at all.
revoke all on public.admins, public.site_settings, public.media, public.placements from anon, authenticated;
grant select on public.site_settings, public.media, public.placements to anon, authenticated;
grant insert, update, delete on public.site_settings, public.media, public.placements to authenticated;
grant select on public.admins to authenticated;

-- ─── Save a whole section's layout in one step ───────────────────────────────
-- p_items: [{ "media_id": uuid, "col_span": 1-4, "row_span": 1-3, "focal_x": 0-100,
--             "focal_y": 0-100, "zoom": 1-2, "published": bool }, ...] in display order.
-- SECURITY INVOKER: the caller's own permissions (the policies above) apply to every row.
create function public.save_section(p_section text, p_items jsonb) returns void
language plpgsql security invoker set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 500 then
    raise exception 'items must be an array of at most 500 entries' using errcode = '22023';
  end if;

  delete from public.placements
  where section = p_section
    and media_id not in (select (e ->> 'media_id')::uuid from jsonb_array_elements(p_items) e);

  insert into public.placements (media_id, section, position, col_span, row_span, focal_x, focal_y, zoom, published, updated_at)
  select (e ->> 'media_id')::uuid, p_section, (ord - 1)::int,
         (e ->> 'col_span')::smallint, (e ->> 'row_span')::smallint,
         (e ->> 'focal_x')::smallint, (e ->> 'focal_y')::smallint,
         (e ->> 'zoom')::numeric, (e ->> 'published')::boolean, now()
  from jsonb_array_elements(p_items) with ordinality as t(e, ord)
  on conflict (section, media_id) do update set
    position = excluded.position, col_span = excluded.col_span, row_span = excluded.row_span,
    focal_x = excluded.focal_x, focal_y = excluded.focal_y, zoom = excluded.zoom,
    published = excluded.published, updated_at = now();
end;
$$;
revoke all on function public.save_section(text, jsonb) from public, anon;
grant execute on function public.save_section(text, jsonb) to authenticated;

-- ─── Storage ─────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('incoming', 'incoming', false, 52428800,
   array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'video/mp4', 'video/webm', 'video/quicktime']),
  ('media', 'media', true, 52428800,
   array['image/jpeg', 'image/png', 'video/mp4', 'video/webm', 'video/quicktime']);

-- incoming: an admin may only touch files in their own folder: incoming/<their user id>/...
create policy "admins upload to own incoming folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'incoming' and (select public.is_admin())
              and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "admins read own incoming files" on storage.objects
  for select to authenticated
  using (bucket_id = 'incoming' and (select public.is_admin())
         and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "admins delete own incoming files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'incoming' and (select public.is_admin())
         and (storage.foldername(name))[1] = (select auth.uid())::text);

-- media: public bucket (anyone can view a file by its URL); only admins can write.
create policy "admins write media" on storage.objects
  for insert to authenticated with check (bucket_id = 'media' and (select public.is_admin()));
create policy "admins update media files" on storage.objects
  for update to authenticated using (bucket_id = 'media' and (select public.is_admin()))
  with check (bucket_id = 'media' and (select public.is_admin()));
create policy "admins delete media files" on storage.objects
  for delete to authenticated using (bucket_id = 'media' and (select public.is_admin()));
create policy "admins list media files" on storage.objects
  for select to authenticated using (bucket_id = 'media' and (select public.is_admin()));
