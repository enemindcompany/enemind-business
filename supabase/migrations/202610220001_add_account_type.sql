alter table public.firebase_user_profiles
  add column if not exists account_type text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'firebase_user_profiles_account_type_check'
      and conrelid = 'public.firebase_user_profiles'::regclass
  ) then
    alter table public.firebase_user_profiles
      add constraint firebase_user_profiles_account_type_check
      check (account_type is null or account_type in ('buyer', 'seller', 'both', 'learner', 'worker', 'bwrite'));
  end if;
end
$$;
