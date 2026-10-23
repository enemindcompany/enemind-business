-- Separate identity-sync table for the Firebase-authenticated sign-in stage.
-- Browser clients must not read or write this table directly.
create table if not exists public.firebase_user_profiles (
  firebase_uid text primary key,
  email text not null,
  display_name text,
  photo_url text,
  created_at timestamptz not null default now(),
  last_sign_in_at timestamptz not null default now()
);

alter table public.firebase_user_profiles enable row level security;
-- Intentionally no anon/authenticated policies. Only the Edge Function's server-side
-- service role accesses this table. Never expose the service-role key in frontend code.
revoke all on table public.firebase_user_profiles from anon, authenticated;
