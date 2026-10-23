alter table public.firebase_user_profiles
  add column if not exists whatsapp_group_link text,
  add column if not exists facebook_url text,
  add column if not exists wechat_contact text,
  add column if not exists instagram_url text,
  add column if not exists x_url text,
  add column if not exists paypal_email text,
  add column if not exists binance_uid text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'firebase_user_profiles_whatsapp_group_link_check' and conrelid = 'public.firebase_user_profiles'::regclass) then
    alter table public.firebase_user_profiles
      add constraint firebase_user_profiles_whatsapp_group_link_check
      check (whatsapp_group_link is null or (length(whatsapp_group_link) <= 2048 and whatsapp_group_link ~* '^https?://chat\.whatsapp\.com/[^[:space:]]+$'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'firebase_user_profiles_facebook_url_check' and conrelid = 'public.firebase_user_profiles'::regclass) then
    alter table public.firebase_user_profiles
      add constraint firebase_user_profiles_facebook_url_check
      check (facebook_url is null or (length(facebook_url) <= 2048 and facebook_url ~* '^https?://[^[:space:]]+$'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'firebase_user_profiles_wechat_contact_check' and conrelid = 'public.firebase_user_profiles'::regclass) then
    alter table public.firebase_user_profiles
      add constraint firebase_user_profiles_wechat_contact_check
      check (wechat_contact is null or (
        length(wechat_contact) <= 2048
        and (wechat_contact ~* '^https?://[^[:space:]]+$' or wechat_contact ~ '^[A-Za-z0-9_.-]{3,128}$')
      ));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'firebase_user_profiles_instagram_url_check' and conrelid = 'public.firebase_user_profiles'::regclass) then
    alter table public.firebase_user_profiles
      add constraint firebase_user_profiles_instagram_url_check
      check (instagram_url is null or (length(instagram_url) <= 2048 and instagram_url ~* '^https?://[^[:space:]]+$'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'firebase_user_profiles_x_url_check' and conrelid = 'public.firebase_user_profiles'::regclass) then
    alter table public.firebase_user_profiles
      add constraint firebase_user_profiles_x_url_check
      check (x_url is null or (length(x_url) <= 2048 and x_url ~* '^https?://[^[:space:]]+$'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'firebase_user_profiles_paypal_email_check' and conrelid = 'public.firebase_user_profiles'::regclass) then
    alter table public.firebase_user_profiles
      add constraint firebase_user_profiles_paypal_email_check
      check (paypal_email is null or (length(paypal_email) <= 254 and paypal_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'firebase_user_profiles_binance_uid_check' and conrelid = 'public.firebase_user_profiles'::regclass) then
    alter table public.firebase_user_profiles
      add constraint firebase_user_profiles_binance_uid_check
      check (binance_uid is null or (length(binance_uid) <= 100 and binance_uid ~ '^[A-Za-z0-9_-]+$'));
  end if;
end
$$;
