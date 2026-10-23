-- Enemind secure profile schema for Firebase Third-Party Auth.
-- Run in Supabase Dashboard > SQL Editor as project owner/postgres.
-- RLS stays enabled. Browser clients use the publishable/anon key + a Firebase ID token.
--
-- IMPORTANT: Firebase UIDs are NOT UUIDs, so auth.uid() (which casts `sub` to uuid) must not
-- be used here. Policies compare the text `sub` claim from auth.jwt() instead.

create table if not exists public.profiles (
  id text primary key,
  display_name text,
  email text,
  avatar_url text,
  role text not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists role text not null default 'user';
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('user', 'admin'));
alter table public.profiles enable row level security;

-- Grants: browser users can never write the role column.
-- NOTE: PostgREST upsert emits "ON CONFLICT (id) DO UPDATE SET id = EXCLUDED.id, ...", so
-- UPDATE on id must be granted too. The policies below still force id = the caller's own sub.
revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
grant insert (id, display_name, email, avatar_url, updated_at) on public.profiles to authenticated;
grant update (id, display_name, email, avatar_url, updated_at) on public.profiles to authenticated;

drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
  on public.profiles for select to authenticated
  using (id = (select auth.jwt() ->> 'sub'));

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert to authenticated
  with check (id = (select auth.jwt() ->> 'sub'));

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.jwt() ->> 'sub'))
  with check (id = (select auth.jwt() ->> 'sub'));

-- Security: stop a user from claiming someone else's email (e.g. the admin's) in their own row.
-- For browser requests, email is taken from the verified Firebase token, not from the payload.
-- Requests with no JWT (SQL editor / service role) are left untouched.
create or replace function public.profiles_enforce_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  token_email text := nullif(auth.jwt() ->> 'email', '');
begin
  if (select auth.jwt() ->> 'sub') is not null then
    new.email := lower(token_email);
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_enforce_identity on public.profiles;
create trigger profiles_enforce_identity
  before insert or update on public.profiles
  for each row execute function public.profiles_enforce_identity();

-- After enemindcompany@gmail.com has signed in at least once and its profile row exists,
-- run this trusted statement to promote it. Safe because email comes from the verified token.
update public.profiles
set role = 'admin'
where lower(email) = lower('enemindcompany@gmail.com');

-- Verify. Zero rows means: sign in as the admin first, then rerun the UPDATE above.
select id, email, role from public.profiles
where lower(email) = lower('enemindcompany@gmail.com');
