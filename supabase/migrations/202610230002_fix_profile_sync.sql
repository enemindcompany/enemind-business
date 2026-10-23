-- Repair profile-sync schema mismatches on existing deployments.
-- Safe to run more than once.
alter table public.firebase_user_profiles
  add column if not exists account_type text,
  add column if not exists whatsapp_group_link text,
  add column if not exists whatsapp_phone text,
  add column if not exists facebook_url text,
  add column if not exists wechat_contact text,
  add column if not exists instagram_url text,
  add column if not exists x_url text,
  add column if not exists paypal_email text,
  add column if not exists binance_uid text;

-- Older deployments may have a constraint that predates the Bwrite option.
alter table public.firebase_user_profiles
  drop constraint if exists firebase_user_profiles_account_type_check;
alter table public.firebase_user_profiles
  add constraint firebase_user_profiles_account_type_check
  check (account_type is null or account_type in ('buyer', 'seller', 'both', 'learner', 'worker', 'bwrite'));
