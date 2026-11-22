-- Travel Wrapped — initial schema
-- Run in the Supabase SQL editor (or `supabase db push`). Idempotent where practical.

-- gen_random_uuid() is built into Postgres 13+ (no extension needed)

-- ─────────────────────────────────────────────────────────────
-- Helpers
-- ─────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ─────────────────────────────────────────────────────────────
-- profiles (1:1 with auth.users)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  full_name     text check (char_length(full_name) <= 80),
  email         text,
  avatar_url    text,
  home_city     text check (char_length(home_city) <= 80),
  referral_code text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
  referred_by   uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- trips
-- ─────────────────────────────────────────────────────────────
create table if not exists public.trips (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null default auth.uid() references auth.users (id) on delete cascade,
  trip_name            text not null check (char_length(trip_name) between 1 and 120),
  start_date           date not null,
  end_date             date not null,
  trip_type            text not null check (trip_type in ('Solo','Friends','Family','Couple','Work')),
  travel_category      text not null check (travel_category in ('Adventure','Leisure','Backpacking','Spiritual','Business','Road Trip')),
  notes                text check (char_length(notes) <= 2000),
  memorable_experience text check (char_length(memorable_experience) <= 500),
  distance_km          numeric(9,1) check (distance_km >= 0 and distance_km < 100000),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint trips_dates_ok check (end_date >= start_date and end_date - start_date <= 366)
);
create index if not exists trips_user_start_idx on public.trips (user_id, start_date);

drop trigger if exists trips_updated_at on public.trips;
create trigger trips_updated_at before update on public.trips
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- destinations (ordered stops within a trip)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.destinations (
  id                     uuid primary key default gen_random_uuid(),
  trip_id                uuid not null references public.trips (id) on delete cascade,
  user_id                uuid not null default auth.uid() references auth.users (id) on delete cascade,
  position               smallint not null default 0,
  city                   text not null check (char_length(city) between 1 and 100),
  state                  text check (char_length(state) <= 100),
  country                text not null default 'India' check (char_length(country) <= 80),
  latitude               double precision check (latitude between -90 and 90),
  longitude              double precision check (longitude between -180 and 180),
  tags                   text[] not null default '{}',
  distance_from_previous numeric(9,1) check (distance_from_previous >= 0),
  created_at             timestamptz not null default now()
);
create index if not exists destinations_trip_idx on public.destinations (trip_id, position);
create index if not exists destinations_user_idx on public.destinations (user_id);
-- No duplicate stop inside the same trip
create unique index if not exists destinations_unique_stop
  on public.destinations (trip_id, lower(city), lower(coalesce(state, '')));

-- ─────────────────────────────────────────────────────────────
-- travel_photos (files live in the private `travel-photos` bucket)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.travel_photos (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  trip_id        uuid not null references public.trips (id) on delete cascade,
  destination_id uuid references public.destinations (id) on delete set null,
  storage_path   text not null unique,
  caption        text check (char_length(caption) <= 200),
  created_at     timestamptz not null default now()
);
create index if not exists travel_photos_trip_idx on public.travel_photos (trip_id);

-- ─────────────────────────────────────────────────────────────
-- travel_wrapped (one recap per user per year; `stats` is the public-safe snapshot)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.travel_wrapped (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  year        smallint not null check (year between 2000 and 2100),
  title       text check (char_length(title) <= 120),
  personality text,
  stats       jsonb not null default '{}'::jsonb,
  public_slug text unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 10),
  is_public   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, year)
);
create index if not exists travel_wrapped_public_idx on public.travel_wrapped (public_slug) where is_public;

drop trigger if exists travel_wrapped_updated_at on public.travel_wrapped;
create trigger travel_wrapped_updated_at before update on public.travel_wrapped
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- invitations
-- ─────────────────────────────────────────────────────────────
create table if not exists public.invitations (
  id              uuid primary key default gen_random_uuid(),
  sender_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  recipient_email text not null check (recipient_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(recipient_email) <= 254),
  referral_code   text not null,
  message         text check (char_length(message) <= 600),
  status          text not null default 'pending' check (status in ('pending','sent','accepted','failed')),
  created_at      timestamptz not null default now(),
  accepted_at     timestamptz
);
create unique index if not exists invitations_unique_recipient
  on public.invitations (sender_id, lower(recipient_email));
create index if not exists invitations_sender_idx on public.invitations (sender_id, created_at desc);

-- Basic abuse protection: max 25 invitations per sender per rolling 24h
create or replace function public.invitations_rate_limit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.invitations
      where sender_id = new.sender_id and created_at > now() - interval '24 hours') >= 25 then
    raise exception 'RATE_LIMIT: You can send up to 25 invitations per day.' using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists invitations_rate_limit on public.invitations;
create trigger invitations_rate_limit before insert on public.invitations
  for each row execute function public.invitations_rate_limit();

-- ─────────────────────────────────────────────────────────────
-- events (product analytics; write-only from clients)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.events (
  id         bigint generated always as identity primary key,
  name       text not null check (name in (
               'landing_view','signup','login','trip_created','wrapped_generated','story_download',
               'share_click','public_view','invite_sent','referral_signup','demo_view')),
  user_id    uuid references auth.users (id) on delete set null,
  anon_id    text check (char_length(anon_id) <= 64),
  props      jsonb not null default '{}'::jsonb check (pg_column_size(props) < 2048),
  path       text check (char_length(path) <= 300),
  created_at timestamptz not null default now()
);
create index if not exists events_name_time_idx on public.events (name, created_at desc);

-- ─────────────────────────────────────────────────────────────
-- New-user bootstrap: create profile, mark matching invitations accepted
-- ─────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  )
  on conflict (id) do nothing;

  update public.invitations
     set status = 'accepted', accepted_at = now()
   where lower(recipient_email) = lower(new.email) and status <> 'accepted';
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Attribute a signup to a referral code (called by the client right after first login)
create or replace function public.claim_referral(code text)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  referrer uuid;
  me uuid := auth.uid();
begin
  if me is null or code is null then return false; end if;
  select id into referrer from public.profiles where referral_code = code;
  if referrer is null or referrer = me then return false; end if;

  update public.profiles set referred_by = referrer
   where id = me and referred_by is null
     and created_at > now() - interval '7 days';  -- only fresh signups can be attributed
  if not found then return false; end if;

  update public.invitations
     set status = 'accepted', accepted_at = coalesce(accepted_at, now())
   where sender_id = referrer
     and lower(recipient_email) = lower((select email from auth.users where id = me));

  insert into public.events (name, user_id, props)
  values ('referral_signup', me, jsonb_build_object('referrer', referrer));
  return true;
end $$;

-- Public, read-only view of a published wrapped (no private fields)
create or replace function public.get_public_wrapped(slug text)
returns table (year smallint, title text, personality text, stats jsonb, updated_at timestamptz)
language sql stable security definer set search_path = public as $$
  select w.year, w.title, w.personality, w.stats, w.updated_at
    from public.travel_wrapped w
   where w.public_slug = slug and w.is_public
   limit 1;
$$;

grant execute on function public.claim_referral(text) to authenticated;
grant execute on function public.get_public_wrapped(text) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────
alter table public.profiles       enable row level security;
alter table public.trips          enable row level security;
alter table public.destinations   enable row level security;
alter table public.travel_photos  enable row level security;
alter table public.travel_wrapped enable row level security;
alter table public.invitations    enable row level security;
alter table public.events         enable row level security;

-- profiles: owner only
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select to authenticated using (id = auth.uid());
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- trips: owner only
drop policy if exists "trips_owner_all" on public.trips;
create policy "trips_owner_all" on public.trips for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- destinations: owner only, and the parent trip must belong to the owner
drop policy if exists "destinations_owner_all" on public.destinations;
create policy "destinations_owner_all" on public.destinations for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and exists (
    select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid()));

-- photos: owner only
drop policy if exists "photos_owner_all" on public.travel_photos;
create policy "photos_owner_all" on public.travel_photos for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and exists (
    select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid()));

-- wrapped: owner only. Published recaps are read exclusively via get_public_wrapped(slug),
-- so nobody can enumerate other people's public Wrapped through the table API.
drop policy if exists "wrapped_owner_all" on public.travel_wrapped;
create policy "wrapped_owner_all" on public.travel_wrapped for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "wrapped_public_read" on public.travel_wrapped;

-- invitations: sender only (status changes happen via security-definer functions / service role)
drop policy if exists "invitations_select_own" on public.invitations;
create policy "invitations_select_own" on public.invitations for select to authenticated using (sender_id = auth.uid());
drop policy if exists "invitations_insert_own" on public.invitations;
create policy "invitations_insert_own" on public.invitations for insert to authenticated
  with check (sender_id = auth.uid() and status in ('pending'));
-- Senders may record delivery outcome, but can never self-mark an invitation as accepted
drop policy if exists "invitations_update_own" on public.invitations;
create policy "invitations_update_own" on public.invitations for update to authenticated
  using (sender_id = auth.uid() and status <> 'accepted')
  with check (sender_id = auth.uid() and status in ('pending','sent','failed'));
drop policy if exists "invitations_delete_own" on public.invitations;
create policy "invitations_delete_own" on public.invitations for delete to authenticated using (sender_id = auth.uid());

-- events: anyone may insert their own events; nobody can read via the API (admin uses service role)
drop policy if exists "events_insert" on public.events;
create policy "events_insert" on public.events for insert to anon, authenticated
  with check (user_id is null or user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- Storage: private bucket, files namespaced by user id: <uid>/<trip_id>/<file>
-- ─────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('travel-photos', 'travel-photos', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

drop policy if exists "photos_read_own" on storage.objects;
create policy "photos_read_own" on storage.objects for select to authenticated
  using (bucket_id = 'travel-photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "photos_insert_own" on storage.objects;
create policy "photos_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'travel-photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "photos_delete_own" on storage.objects;
create policy "photos_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'travel-photos' and (storage.foldername(name))[1] = auth.uid()::text);
