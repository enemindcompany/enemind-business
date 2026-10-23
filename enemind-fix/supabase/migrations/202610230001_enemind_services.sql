-- Extend the existing profile account-type constraint without changing existing records.
alter table public.firebase_user_profiles drop constraint if exists firebase_user_profiles_account_type_check;
alter table public.firebase_user_profiles add constraint firebase_user_profiles_account_type_check
  check (account_type is null or account_type in ('buyer','seller','both','learner','worker','bwrite'));

-- Enemind service operations: payment proof, CSV requests, Bwrite submissions, and referral attribution.
-- Apply after the existing firebase_user_profiles migrations. No card/crypto auto-payment is performed.

create table if not exists public.payment_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  email text not null default '',
  service_code text not null check (service_code in ('buyer_weekly','worker_monthly','learner_activation','bwrite_activation','csv_purchase')),
  amount_usd numeric(12,2) not null check (amount_usd > 0),
  currency text not null default 'USD' check (currency = 'USD'),
  transaction_reference text not null check (length(transaction_reference) between 1 and 160),
  note text,
  status text not null default 'pending' check (status in ('pending','approved','paid','rejected')),
  admin_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index if not exists payment_submissions_user_created_idx on public.payment_submissions(user_id, created_at desc);
create unique index if not exists payment_submissions_reference_unique_idx on public.payment_submissions(transaction_reference);
alter table public.payment_submissions enable row level security;
revoke all on public.payment_submissions from anon;
grant select, insert on public.payment_submissions to authenticated;
grant update on public.payment_submissions to authenticated;
drop policy if exists payment_submissions_select_own_or_admin on public.payment_submissions;
create policy payment_submissions_select_own_or_admin on public.payment_submissions for select to authenticated
using ((auth.jwt()->>'sub') = user_id or lower(coalesce(auth.jwt()->>'email','')) = 'enemindcompany@gmail.com');
drop policy if exists payment_submissions_insert_own_pending on public.payment_submissions;
create policy payment_submissions_insert_own_pending on public.payment_submissions for insert to authenticated
with check ((auth.jwt()->>'sub') = user_id and status = 'pending' and amount_usd > 0);
drop policy if exists payment_submissions_update_admin on public.payment_submissions;
create policy payment_submissions_update_admin on public.payment_submissions for update to authenticated
using (lower(coalesce(auth.jwt()->>'email','')) = 'enemindcompany@gmail.com')
with check (lower(coalesce(auth.jwt()->>'email','')) = 'enemindcompany@gmail.com');

create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  email text not null default '',
  request_type text not null check (request_type in ('seller_csv','buyer_request','worker_task','other')),
  details jsonb not null default '{}'::jsonb,
  status text not null default 'submitted' check (status in ('submitted','under_review','approved','fulfilled','rejected')),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists service_requests_user_created_idx on public.service_requests(user_id, created_at desc);
alter table public.service_requests enable row level security;
revoke all on public.service_requests from anon;
grant select, insert, update on public.service_requests to authenticated;
drop policy if exists service_requests_select_own_or_admin on public.service_requests;
create policy service_requests_select_own_or_admin on public.service_requests for select to authenticated
using ((auth.jwt()->>'sub') = user_id or lower(coalesce(auth.jwt()->>'email','')) = 'enemindcompany@gmail.com');
drop policy if exists service_requests_insert_own on public.service_requests;
create policy service_requests_insert_own on public.service_requests for insert to authenticated
with check ((auth.jwt()->>'sub') = user_id and status = 'submitted');
drop policy if exists service_requests_update_admin on public.service_requests;
create policy service_requests_update_admin on public.service_requests for update to authenticated
using (lower(coalesce(auth.jwt()->>'email','')) = 'enemindcompany@gmail.com')
with check (lower(coalesce(auth.jwt()->>'email','')) = 'enemindcompany@gmail.com');

create table if not exists public.bwrite_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  email text not null default '',
  title text not null check (length(title) between 1 and 180),
  category text not null,
  document_url text not null check (document_url ~* '^https://docs\.google\.com/document/d/'),
  description text not null check (length(description) between 1 and 1200),
  status text not null default 'submitted' check (status in ('submitted','under_review','revision_required','approved','published','rejected')),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists bwrite_submissions_user_created_idx on public.bwrite_submissions(user_id, created_at desc);
alter table public.bwrite_submissions enable row level security;
revoke all on public.bwrite_submissions from anon;
grant select, insert, update on public.bwrite_submissions to authenticated;
drop policy if exists bwrite_select_own_or_admin on public.bwrite_submissions;
create policy bwrite_select_own_or_admin on public.bwrite_submissions for select to authenticated
using ((auth.jwt()->>'sub') = user_id or lower(coalesce(auth.jwt()->>'email','')) = 'enemindcompany@gmail.com');
drop policy if exists bwrite_insert_own on public.bwrite_submissions;
create policy bwrite_insert_own on public.bwrite_submissions for insert to authenticated
with check ((auth.jwt()->>'sub') = user_id and status = 'submitted');
drop policy if exists bwrite_update_admin on public.bwrite_submissions;
create policy bwrite_update_admin on public.bwrite_submissions for update to authenticated
using (lower(coalesce(auth.jwt()->>'email','')) = 'enemindcompany@gmail.com')
with check (lower(coalesce(auth.jwt()->>'email','')) = 'enemindcompany@gmail.com');

create table if not exists public.referral_attributions (
  id uuid primary key default gen_random_uuid(),
  referrer_uid text not null,
  referred_uid text not null unique,
  track text not null check (track in ('buyer','worker','learner','bwrite')),
  status text not null default 'pending_review' check (status in ('pending_review','qualified','rejected','paid')),
  reward_usd numeric(12,2) not null default 1 check (reward_usd = 1),
  admin_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  check (referrer_uid <> referred_uid)
);
create index if not exists referral_attributions_referrer_idx on public.referral_attributions(referrer_uid, created_at desc);
alter table public.referral_attributions enable row level security;
revoke all on public.referral_attributions from anon;
grant select, insert, update on public.referral_attributions to authenticated;
drop policy if exists referral_select_parties_or_admin on public.referral_attributions;
create policy referral_select_parties_or_admin on public.referral_attributions for select to authenticated
using ((auth.jwt()->>'sub') = referrer_uid or (auth.jwt()->>'sub') = referred_uid or lower(coalesce(auth.jwt()->>'email','')) = 'enemindcompany@gmail.com');
drop policy if exists referral_insert_self_referred on public.referral_attributions;
create policy referral_insert_self_referred on public.referral_attributions for insert to authenticated
with check ((auth.jwt()->>'sub') = referred_uid and referrer_uid <> referred_uid and status = 'pending_review' and reward_usd = 1);
drop policy if exists referral_update_admin on public.referral_attributions;
create policy referral_update_admin on public.referral_attributions for update to authenticated
using (lower(coalesce(auth.jwt()->>'email','')) = 'enemindcompany@gmail.com')
with check (lower(coalesce(auth.jwt()->>'email','')) = 'enemindcompany@gmail.com');

-- Keep RLS enabled. The admin email in these policies must match the real owner/admin Google account.
-- If the admin email differs, update all policy checks before launch. This is a manual verification system;
-- never approve a transaction based only on the user's submitted reference or screenshot.

-- Service activation ledger. Only admin-confirmed payment rows can activate a service.
create table if not exists public.service_activations (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  service_code text not null check (service_code in ('buyer_weekly','worker_monthly','learner_activation','bwrite_activation')),
  status text not null default 'active' check (status in ('active','expired','suspended')),
  activated_at timestamptz not null default now(),
  expires_at timestamptz,
  source_payment_id uuid references public.payment_submissions(id),
  created_at timestamptz not null default now(),
  unique(user_id, service_code)
);
alter table public.service_activations enable row level security;
revoke all on public.service_activations from anon;
grant select on public.service_activations to authenticated;
drop policy if exists service_activations_select_own_or_admin on public.service_activations;
create policy service_activations_select_own_or_admin on public.service_activations for select to authenticated
using ((auth.jwt()->>'sub') = user_id or lower(coalesce(auth.jwt()->>'email','')) = 'enemindcompany@gmail.com');

create or replace function public.enemind_activate_service_after_verified_payment()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_expiry timestamptz;
begin
  if new.status = 'paid' and old.status is distinct from new.status and new.service_code <> 'csv_purchase' then
    if new.service_code = 'buyer_weekly' then v_expiry := now() + interval '7 days';
    elsif new.service_code = 'worker_monthly' then v_expiry := now() + interval '1 month';
    else v_expiry := null;
    end if;
    insert into public.service_activations(user_id,service_code,status,activated_at,expires_at,source_payment_id)
    values(new.user_id,new.service_code,'active',now(),v_expiry,new.id)
    on conflict(user_id,service_code) do update set status='active',activated_at=now(),expires_at=excluded.expires_at,source_payment_id=excluded.source_payment_id;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_enemind_activate_service_after_verified_payment on public.payment_submissions;
create trigger trg_enemind_activate_service_after_verified_payment
after update of status on public.payment_submissions
for each row execute function public.enemind_activate_service_after_verified_payment();

create table if not exists public.user_trials (
  user_id text primary key,
  started_at timestamptz not null default now(),
  ends_at timestamptz not null default (now() + interval '2 days'),
  created_at timestamptz not null default now()
);
alter table public.user_trials enable row level security;
revoke all on public.user_trials from anon;
grant select, insert on public.user_trials to authenticated;
drop policy if exists user_trials_select_own_or_admin on public.user_trials;
create policy user_trials_select_own_or_admin on public.user_trials for select to authenticated
using ((auth.jwt()->>'sub') = user_id or lower(coalesce(auth.jwt()->>'email','')) = 'enemindcompany@gmail.com');
drop policy if exists user_trials_insert_own on public.user_trials;
create policy user_trials_insert_own on public.user_trials for insert to authenticated
with check ((auth.jwt()->>'sub') = user_id);

-- Worker earnings and weekly withdrawal requests. Earnings must be credited by admin after QA.
create table if not exists public.worker_earnings (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  task_reference text,
  description text not null default '',
  amount_usd numeric(12,2) not null check (amount_usd > 0),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  admin_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index if not exists worker_earnings_user_idx on public.worker_earnings(user_id, created_at desc);
alter table public.worker_earnings enable row level security;
revoke all on public.worker_earnings from anon;
grant select, insert, update on public.worker_earnings to authenticated;
drop policy if exists worker_earnings_select_own_or_admin on public.worker_earnings;
create policy worker_earnings_select_own_or_admin on public.worker_earnings for select to authenticated
using ((auth.jwt()->>'sub') = user_id or lower(coalesce(auth.jwt()->>'email','')) = 'enemindcompany@gmail.com');
drop policy if exists worker_earnings_admin_write on public.worker_earnings;
create policy worker_earnings_admin_write on public.worker_earnings for all to authenticated
using (lower(coalesce(auth.jwt()->>'email','')) = 'enemindcompany@gmail.com')
with check (lower(coalesce(auth.jwt()->>'email','')) = 'enemindcompany@gmail.com');

create table if not exists public.withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  email text not null default '',
  amount_usd numeric(12,2) not null check (amount_usd > 0),
  payout_binance_uid text not null check (length(payout_binance_uid) between 1 and 100),
  note text,
  status text not null default 'pending' check (status in ('pending','approved','paid','rejected')),
  admin_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  paid_at timestamptz
);
create index if not exists withdrawal_requests_user_idx on public.withdrawal_requests(user_id, created_at desc);
alter table public.withdrawal_requests enable row level security;
revoke all on public.withdrawal_requests from anon;
grant select, insert, update on public.withdrawal_requests to authenticated;
drop policy if exists withdrawal_select_own_or_admin on public.withdrawal_requests;
create policy withdrawal_select_own_or_admin on public.withdrawal_requests for select to authenticated
using ((auth.jwt()->>'sub') = user_id or lower(coalesce(auth.jwt()->>'email','')) = 'enemindcompany@gmail.com');
drop policy if exists withdrawal_insert_own_pending on public.withdrawal_requests;
create policy withdrawal_insert_own_pending on public.withdrawal_requests for insert to authenticated
with check ((auth.jwt()->>'sub') = user_id and status = 'pending');
drop policy if exists withdrawal_update_admin on public.withdrawal_requests;
create policy withdrawal_update_admin on public.withdrawal_requests for update to authenticated
using (lower(coalesce(auth.jwt()->>'email','')) = 'enemindcompany@gmail.com')
with check (lower(coalesce(auth.jwt()->>'email','')) = 'enemindcompany@gmail.com');

create or replace function public.enemind_validate_withdrawal_request()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_earned numeric(12,2);
  v_reserved numeric(12,2);
  v_profile_binance text;
begin
  select coalesce(sum(amount_usd),0) into v_earned from public.worker_earnings where user_id = new.user_id and status = 'approved';
  select coalesce(sum(amount_usd),0) into v_reserved from public.withdrawal_requests where user_id = new.user_id and status in ('pending','approved','paid');
  select binance_uid into v_profile_binance from public.firebase_user_profiles where firebase_uid = new.user_id;
  if v_profile_binance is null or v_profile_binance <> new.payout_binance_uid then
    raise exception 'Payout Binance ID must match the ID saved in the Enemind profile';
  end if;
  if new.amount_usd > (v_earned - v_reserved) then
    raise exception 'Withdrawal exceeds available approved earnings';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_enemind_validate_withdrawal_request on public.withdrawal_requests;
create trigger trg_enemind_validate_withdrawal_request before insert on public.withdrawal_requests
for each row execute function public.enemind_validate_withdrawal_request();

create table if not exists public.learning_resources (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 1 and 180),
  category text not null,
  video_url text not null check (video_url ~* '^https://(www\.)?(youtube\.com|youtu\.be)/'),
  description text not null default '',
  status text not null default 'draft' check (status in ('draft','published','archived')),
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.learning_resources enable row level security;
revoke all on public.learning_resources from anon;
grant select, insert, update on public.learning_resources to authenticated;
drop policy if exists learning_resources_read_published_or_admin on public.learning_resources;
create policy learning_resources_read_published_or_admin on public.learning_resources for select to authenticated
using (status = 'published' or lower(coalesce(auth.jwt()->>'email','')) = 'enemindcompany@gmail.com');
drop policy if exists learning_resources_admin_write on public.learning_resources;
create policy learning_resources_admin_write on public.learning_resources for all to authenticated
using (lower(coalesce(auth.jwt()->>'email','')) = 'enemindcompany@gmail.com')
with check (lower(coalesce(auth.jwt()->>'email','')) = 'enemindcompany@gmail.com');
