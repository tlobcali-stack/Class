-- Make someone an admin of the website.
-- Run in Supabase → SQL Editor, after they exist under Authentication → Users
-- (Authentication → Users → "Invite user" sends them an email; they do not need a password).
-- Replace the address on the last line, then press Run.

insert into public.admins (user_id, email)
select id, email from auth.users where lower(email) = lower('someone@example.com')
on conflict (user_id) do nothing;

-- To remove an admin:
-- delete from public.admins where lower(email) = lower('someone@example.com');
