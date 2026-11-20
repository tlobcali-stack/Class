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
2. **Supabase → Authentication** (settings, not code — all four matter):
   - **Sign In / Providers → Email**: keep Email on. Turn **off** "Allow new users to sign up",
     and keep anonymous sign-ins off.
   - **URL Configuration**: Site URL = the live address. Redirect URLs: add exactly
     `https://<live address>/admin/auth/callback` — the **exact** address, **no wildcards**
     (`*`). A wildcard would let an attacker send an admin a real sign-in email that hands
     the session to the attacker's site.
   - **Emails → SMTP**: set up custom SMTP (e.g. the domain's email provider or Resend).
     Supabase's built-in mailer sends only a couple of emails per hour for the whole
     project, so anyone hammering the sign-in form could block admins from getting links.
   - **Attack Protection**: turn on CAPTCHA (Cloudflare Turnstile) once the login form has
     been given its Turnstile key (a small follow-up change), and keep the email rate limit.
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
- **Deleting or hiding is not instant everywhere**: an uploaded file is cached for up to an
  hour (browsers, Supabase's CDN, Vercel's image cache) after it is deleted. The website
  itself stops showing it straight away.
- If the database cannot be reached, pages keep showing their last good version; they never
  fall back to the built-in photo list, so hidden or deleted photos cannot reappear.
- Files from an upload that was abandoned half-way stay in the private `incoming` bucket
  (visible only to the uploader). Clear it now and then in Supabase → Storage → incoming.

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
