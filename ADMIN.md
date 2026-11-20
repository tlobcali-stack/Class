# Admin panel — setup and use

The admin panel lives at **/admin**. It lets admins upload photos and videos, add YouTube /
Vimeo / Instagram links, arrange every photo section by drag and drop (order, size, which part
of the photo stays in view, zoom, show/hide), and edit the site details (phone, email, headline,
tagline, announcement banner, children's-photos switch). Changes go live within seconds.

It needs a server, so it runs on **Vercel** with **Supabase** (database, sign-in, file storage).
The GitHub Pages copy (`.github/workflows/pages.yml`) shows the built-in content only.

## One-time setup (owner)

1. **Supabase** → create a project. Then, in its SQL Editor, run in this order:
   - `supabase/migrations/20261121000000_media_admin.sql` (tables, security rules, storage)
   - `supabase/seed.sql` (today's 133 photos and layout; safe to run twice)
2. **Supabase → Authentication → Providers → Email**: keep Email on, and turn **off**
   "Allow new users to sign up". Under **URL Configuration** set Site URL to the live address and
   add `https://<live address>/admin/auth/callback` to Redirect URLs.
3. **Add admins**: Authentication → Users → *Invite user* (their email). Then run
   `scripts/add-admin.sql` in the SQL Editor with their address. Repeat per admin.
4. **Vercel** → import the GitHub repo. Environment variables (see `env.example`):
   `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   Never add the Supabase *service_role* key to the website.
5. Visit `/admin`, enter your email, click the link in the email.

## Security, in short

- Only people in the `admins` table can change anything. This is enforced by the database
  itself (row-level security), again on the server for every action, and the proxy keeps
  signed-out visitors out of /admin.
- Nobody can sign themselves up; sign-in is by one-time email link (15 minutes).
- Uploaded photos are re-encoded: resized to 2000 px and **all hidden data removed, including
  GPS location**. Videos are stored as uploaded — phone videos can contain the location where
  they were filmed, so for those prefer a YouTube link, or turn off location for the camera.
- Files are checked by their content, not their name; SVG, HTML and other types are refused.

## Developing locally

```bash
npx supabase start          # local database (needs Docker)
npx supabase db reset       # applies the migration + seed
npm run dev                 # with NEXT_PUBLIC_SUPABASE_* from `npx supabase status` in .env.local
npm test                    # unit tests
npm run test:db             # database security tests (local Supabase only)
npm run seed:generate       # rebuild supabase/seed.sql from lib/photos.ts + lib/library.ts
```
Sign-in emails go to the local mailbox at http://127.0.0.1:54324.
