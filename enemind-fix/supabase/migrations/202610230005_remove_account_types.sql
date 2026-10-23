-- Enemind now uses one Google sign-in account for everyone.
-- Remove legacy account-type fields while preserving the separate user/admin authorization role.
alter table if exists public.firebase_user_profiles
  drop constraint if exists firebase_user_profiles_account_type_check;
alter table if exists public.firebase_user_profiles
  drop column if exists account_type;
alter table if exists public.profiles
  drop column if exists account_type;
