-- Run in Supabase Dashboard > SQL Editor after configuring Firebase as a Third-Party Auth provider.
create table if not exists public.profiles (
  id text primary key,
  display_name text,
  email text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Firebase user ID is expected in the JWT `sub` claim, exposed by auth.uid().
-- If your Supabase Firebase integration maps UID differently, adjust these policies accordingly.
drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
  on public.profiles for select
  using (id = auth.uid()::text);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (id = auth.uid()::text);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (id = auth.uid()::text)
  with check (id = auth.uid()::text);
