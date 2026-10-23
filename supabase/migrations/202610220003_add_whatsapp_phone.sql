alter table public.firebase_user_profiles
  add column if not exists whatsapp_phone text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'firebase_user_profiles_whatsapp_phone_check'
      and conrelid = 'public.firebase_user_profiles'::regclass
  ) then
    alter table public.firebase_user_profiles
      add constraint firebase_user_profiles_whatsapp_phone_check
      check (
        whatsapp_phone is null
        or (
          length(whatsapp_phone) <= 16
          and whatsapp_phone ~ '^\+[1-9][0-9]{3,14}$'
        )
      );
  end if;
end
$$;
