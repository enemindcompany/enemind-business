-- Buyer marketplace: admin-published offers from opted-in sellers and buyer order requests.
-- Apply after 202610230001_enemind_services.sql and 202610230002_fix_profile_sync.sql.
-- Seller offers are currently published/managed by Enemind admin; this does not claim a live Google Sheets sync.

create table if not exists public.buyer_marketplace_offers (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests(id) on delete cascade,
  seller_name text not null check (length(trim(seller_name)) between 1 and 160),
  country text not null default '',
  offer_title text not null check (length(trim(offer_title)) between 1 and 180),
  description text not null default '',
  price_usd numeric(12,2) not null check (price_usd >= 0),
  delivery_days integer check (delivery_days is null or delivery_days >= 0),
  terms text,
  status text not null default 'available' check (status in ('available','withdrawn','expired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists buyer_marketplace_offers_request_idx on public.buyer_marketplace_offers(request_id, status, created_at desc);
alter table public.buyer_marketplace_offers enable row level security;
revoke all on public.buyer_marketplace_offers from anon;
grant select, insert, update, delete on public.buyer_marketplace_offers to authenticated;
drop policy if exists buyer_offers_select_request_owner_or_admin on public.buyer_marketplace_offers;
create policy buyer_offers_select_request_owner_or_admin on public.buyer_marketplace_offers for select to authenticated
using (
  lower(coalesce(auth.jwt()->>'email','')) = 'enemindcompany@gmail.com'
  or exists (select 1 from public.service_requests r where r.id = request_id and r.user_id = (auth.jwt()->>'sub'))
);
drop policy if exists buyer_offers_admin_manage on public.buyer_marketplace_offers;
create policy buyer_offers_admin_manage on public.buyer_marketplace_offers for all to authenticated
using (lower(coalesce(auth.jwt()->>'email','')) = 'enemindcompany@gmail.com')
with check (lower(coalesce(auth.jwt()->>'email','')) = 'enemindcompany@gmail.com');

create table if not exists public.buyer_marketplace_orders (
  id uuid primary key default gen_random_uuid(),
  buyer_user_id text not null,
  buyer_email text not null default '',
  request_id uuid not null references public.service_requests(id) on delete restrict,
  offer_id uuid not null references public.buyer_marketplace_offers(id) on delete restrict,
  quantity integer not null default 1 check (quantity > 0),
  agreed_price_usd numeric(12,2) not null check (agreed_price_usd >= 0),
  status text not null default 'pending' check (status in ('pending','accepted','awaiting_payment','in_progress','delivered','completed','cancelled','disputed')),
  delivery_note text,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index if not exists buyer_marketplace_orders_buyer_idx on public.buyer_marketplace_orders(buyer_user_id, created_at desc);
create index if not exists buyer_marketplace_orders_offer_idx on public.buyer_marketplace_orders(offer_id, created_at desc);
alter table public.buyer_marketplace_orders enable row level security;
revoke all on public.buyer_marketplace_orders from anon;
grant select, insert, update on public.buyer_marketplace_orders to authenticated;
drop policy if exists buyer_orders_select_own_or_admin on public.buyer_marketplace_orders;
create policy buyer_orders_select_own_or_admin on public.buyer_marketplace_orders for select to authenticated
using (buyer_user_id = (auth.jwt()->>'sub') or lower(coalesce(auth.jwt()->>'email','')) = 'enemindcompany@gmail.com');
drop policy if exists buyer_orders_insert_own_valid_offer on public.buyer_marketplace_orders;
create policy buyer_orders_insert_own_valid_offer on public.buyer_marketplace_orders for insert to authenticated
with check (
  buyer_user_id = (auth.jwt()->>'sub')
  and status = 'pending'
  and exists (
    select 1 from public.service_requests r
    join public.buyer_marketplace_offers o on o.request_id = r.id
    where r.id = request_id and r.user_id = (auth.jwt()->>'sub')
      and o.id = offer_id and o.status = 'available'
  )
);
drop policy if exists buyer_orders_admin_update on public.buyer_marketplace_orders;
create policy buyer_orders_admin_update on public.buyer_marketplace_orders for update to authenticated
using (lower(coalesce(auth.jwt()->>'email','')) = 'enemindcompany@gmail.com')
with check (lower(coalesce(auth.jwt()->>'email','')) = 'enemindcompany@gmail.com');

-- Only the configured admin can publish/update offers or change order statuses.
-- Verify the admin email above matches the trusted owner account before applying.
