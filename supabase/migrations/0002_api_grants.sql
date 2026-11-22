-- Table privileges for the Data API roles.
--
-- Older Supabase projects granted these automatically on every new table in `public`; newer projects
-- don't, which makes every request fail with 42501 "permission denied". Grants only open the door —
-- the RLS policies in 0001_init.sql still decide which rows each user can see or change.
-- Safe to run more than once.

grant usage on schema public to anon, authenticated, service_role;

-- Signed-in users: full CRUD on their own data (scoped by RLS)
grant select, insert, update, delete on public.trips          to authenticated;
grant select, insert, update, delete on public.destinations   to authenticated;
grant select, insert, update, delete on public.travel_photos  to authenticated;
grant select, insert, update, delete on public.travel_wrapped to authenticated;
grant select, insert, update, delete on public.invitations    to authenticated;
-- Profiles are created by the security-definer signup trigger; users only read/update their own.
grant select, update on public.profiles to authenticated;

-- Analytics: write-only from browsers (logged-out visitors included). Reads happen server-side via service_role.
grant insert on public.events to anon, authenticated;
grant usage on sequence public.events_id_seq to anon, authenticated;

-- Server-only admin client (/admin analytics, invite emails) bypasses RLS and needs table access too.
grant all on all tables    in schema public to service_role;
grant all on all sequences in schema public to service_role;
