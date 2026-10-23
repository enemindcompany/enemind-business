-- Enemind digital-products storefront, guest checkout and manual delivery activation.
create extension if not exists pgcrypto;

create table if not exists public.store_products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null check (length(title) between 2 and 180),
  short_description text,
  description text,
  category text not null check (category in ('revision','teacher','parent','school','course','ebook','template','other')),
  audience text,
  price numeric(12,2) not null check (price >= 0),
  currency text not null default 'KES' check (currency in ('KES','USD')),
  preview_image_url text,
  preview_url text,
  license_type text not null default 'single_user' check (license_type in ('single_user','teacher','school')),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text
);
create index if not exists store_products_public_idx on public.store_products(status, featured desc, created_at desc);

create table if not exists public.store_orders (
  id uuid primary key default gen_random_uuid(),
  order_reference text not null unique,
  lookup_token_hash text not null,
  product_id uuid references public.store_products(id) on delete set null,
  product_title text not null,
  buyer_name text not null,
  buyer_phone text not null,
  buyer_email text,
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'KES',
  delivery_method text not null default 'download' check (delivery_method in ('download','whatsapp')),
  delivery_status text not null default 'locked' check (delivery_status in ('locked','ready','delivered','failed')),
  delivery_url text,
  payment_status text not null default 'pending' check (payment_status in ('pending','submitted','verified','rejected','refunded')),
  payment_reference text,
  status text not null default 'awaiting_payment' check (status in ('awaiting_payment','payment_review','paid','fulfilled','cancelled','refunded')),
  verified_at timestamptz,
  verified_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint delivery_url_https check (delivery_url is null or delivery_url ~ '^https://')
);
create index if not exists store_orders_created_idx on public.store_orders(created_at desc);
create index if not exists store_orders_payment_idx on public.store_orders(payment_status, created_at desc);

create table if not exists public.store_school_quotes (
  id uuid primary key default gen_random_uuid(),
  school_name text not null,
  contact_name text not null,
  phone text not null,
  email text,
  needs text not null,
  status text not null default 'new' check (status in ('new','contacted','quoted','accepted','declined')),
  admin_notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.store_contributors (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  email text,
  contributor_type text not null check (contributor_type in ('teacher_creator','designer','affiliate','school_ambassador','other')),
  experience text,
  portfolio_url text,
  status text not null default 'pending' check (status in ('pending','approved','declined','paused')),
  created_at timestamptz not null default now()
);

create table if not exists public.store_commissions (
  id uuid primary key default gen_random_uuid(),
  contributor_id uuid references public.store_contributors(id) on delete set null,
  order_id uuid references public.store_orders(id) on delete set null,
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'KES',
  status text not null default 'pending' check (status in ('pending','approved','paid','reversed')),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create table if not exists public.store_payouts (
  id uuid primary key default gen_random_uuid(),
  contributor_id uuid not null references public.store_contributors(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'KES',
  payout_method text not null default 'mpesa',
  payout_reference text,
  status text not null default 'requested' check (status in ('requested','approved','paid','rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

alter table public.store_products enable row level security;
alter table public.store_orders enable row level security;
alter table public.store_school_quotes enable row level security;
alter table public.store_contributors enable row level security;
alter table public.store_commissions enable row level security;
alter table public.store_payouts enable row level security;

drop policy if exists "Public can view published store products" on public.store_products;
create policy "Public can view published store products" on public.store_products for select to anon, authenticated using (status = 'published');
drop policy if exists "Enemind admin manages store products" on public.store_products;
create policy "Enemind admin manages store products" on public.store_products for all to authenticated
using (lower(coalesce(auth.jwt()->>'email','')) = 'enemindcompany@gmail.com')
with check (lower(coalesce(auth.jwt()->>'email','')) = 'enemindcompany@gmail.com');

drop policy if exists "Enemind admin reads orders" on public.store_orders;
create policy "Enemind admin reads orders" on public.store_orders for select to authenticated using (lower(coalesce(auth.jwt()->>'email','')) = 'enemindcompany@gmail.com');
drop policy if exists "Enemind admin updates orders" on public.store_orders;
create policy "Enemind admin updates orders" on public.store_orders for update to authenticated
using (lower(coalesce(auth.jwt()->>'email','')) = 'enemindcompany@gmail.com')
with check (lower(coalesce(auth.jwt()->>'email','')) = 'enemindcompany@gmail.com');

drop policy if exists "Enemind admin manages school quotes" on public.store_school_quotes;
create policy "Enemind admin manages school quotes" on public.store_school_quotes for all to authenticated
using (lower(coalesce(auth.jwt()->>'email','')) = 'enemindcompany@gmail.com')
with check (lower(coalesce(auth.jwt()->>'email','')) = 'enemindcompany@gmail.com');
drop policy if exists "Enemind admin manages contributors" on public.store_contributors;
create policy "Enemind admin manages contributors" on public.store_contributors for all to authenticated
using (lower(coalesce(auth.jwt()->>'email','')) = 'enemindcompany@gmail.com')
with check (lower(coalesce(auth.jwt()->>'email','')) = 'enemindcompany@gmail.com');
drop policy if exists "Enemind admin manages commissions" on public.store_commissions;
create policy "Enemind admin manages commissions" on public.store_commissions for all to authenticated
using (lower(coalesce(auth.jwt()->>'email','')) = 'enemindcompany@gmail.com')
with check (lower(coalesce(auth.jwt()->>'email','')) = 'enemindcompany@gmail.com');
drop policy if exists "Enemind admin manages payouts" on public.store_payouts;
create policy "Enemind admin manages payouts" on public.store_payouts for all to authenticated
using (lower(coalesce(auth.jwt()->>'email','')) = 'enemindcompany@gmail.com')
with check (lower(coalesce(auth.jwt()->>'email','')) = 'enemindcompany@gmail.com');

create or replace function public.store_create_guest_order(
 p_product_id uuid, p_buyer_name text, p_buyer_phone text, p_buyer_email text default null, p_delivery_method text default 'download'
) returns jsonb language plpgsql security definer set search_path=public as $$
declare p public.store_products%rowtype; v_ref text; v_token text; v_order_id uuid;
begin
 if length(trim(coalesce(p_buyer_name,''))) < 2 or length(trim(coalesce(p_buyer_phone,''))) < 7 then raise exception 'Enter your name and a valid phone number'; end if;
 if p_delivery_method not in ('download','whatsapp') then raise exception 'Invalid delivery preference'; end if;
 select * into p from public.store_products where id=p_product_id and status='published';
 if not found then raise exception 'This product is not available for purchase'; end if;
 v_ref := 'EN-' || to_char(now() at time zone 'Africa/Nairobi','YYMMDD') || '-' || upper(substr(encode(gen_random_bytes(6),'hex'),1,8));
 v_token := encode(gen_random_bytes(24),'hex');
 insert into public.store_orders(order_reference,lookup_token_hash,product_id,product_title,buyer_name,buyer_phone,buyer_email,amount,currency,delivery_method)
 values(v_ref,encode(digest(v_token,'sha256'),'hex'),p.id,p.title,trim(p_buyer_name),trim(p_buyer_phone),nullif(trim(coalesce(p_buyer_email,'')),''),p.price,p.currency,p_delivery_method)
 returning id into v_order_id;
 return jsonb_build_object('order_id',v_order_id,'order_reference',v_ref,'lookup_token',v_token,'amount',p.price,'currency',p.currency);
end $$;

create or replace function public.store_submit_payment_reference(p_order_reference text,p_lookup_token text,p_transaction_code text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
 if length(trim(coalesce(p_transaction_code,''))) < 5 or length(trim(p_transaction_code)) > 32 then raise exception 'Enter a valid M-Pesa transaction code'; end if;
 update public.store_orders set payment_reference=upper(trim(p_transaction_code)),payment_status='submitted',status='payment_review',updated_at=now()
 where order_reference=trim(p_order_reference) and lookup_token_hash=encode(digest(coalesce(p_lookup_token,''),'sha256'),'hex')
 and payment_status in ('pending','rejected') returning id into v_id;
 if v_id is null then raise exception 'Order not found or payment reference cannot be changed'; end if;
 return jsonb_build_object('submitted',true);
end $$;

create or replace function public.store_lookup_guest_order(p_order_reference text,p_lookup_token text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare o public.store_orders%rowtype;
begin
 select * into o from public.store_orders where order_reference=trim(p_order_reference)
 and lookup_token_hash=encode(digest(coalesce(p_lookup_token,''),'sha256'),'hex');
 if not found then return null; end if;
 return jsonb_build_object('order_reference',o.order_reference,'product_title',o.product_title,'amount',o.amount,'currency',o.currency,'status',o.status,'payment_status',o.payment_status,'delivery_method',o.delivery_method,'delivery_status',o.delivery_status,'delivery_url',case when o.payment_status='verified' and o.delivery_status='ready' and o.delivery_method='download' then o.delivery_url else null end);
end $$;

create or replace function public.store_submit_school_quote(p_school_name text,p_contact_name text,p_phone text,p_email text,p_needs text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
 if length(trim(coalesce(p_school_name,'')))<2 or length(trim(coalesce(p_contact_name,'')))<2 or length(trim(coalesce(p_phone,'')))<7 or length(trim(coalesce(p_needs,'')))<5 then raise exception 'Complete the school, contact, phone and needs fields'; end if;
 insert into public.store_school_quotes(school_name,contact_name,phone,email,needs) values(trim(p_school_name),trim(p_contact_name),trim(p_phone),nullif(trim(coalesce(p_email,'')),''),trim(p_needs)) returning id into v_id;
 return jsonb_build_object('received',true,'request_id',v_id);
end $$;

revoke all on function public.store_create_guest_order(uuid,text,text,text,text) from public;
grant execute on function public.store_create_guest_order(uuid,text,text,text,text) to anon, authenticated;
revoke all on function public.store_submit_payment_reference(text,text,text) from public;
grant execute on function public.store_submit_payment_reference(text,text,text) to anon, authenticated;
revoke all on function public.store_lookup_guest_order(text,text) from public;
grant execute on function public.store_lookup_guest_order(text,text) to anon, authenticated;
revoke all on function public.store_submit_school_quote(text,text,text,text,text) from public;
grant execute on function public.store_submit_school_quote(text,text,text,text,text) to anon, authenticated;

comment on table public.store_products is 'Public metadata only for digital products; paid files must be stored in private storage and served only after payment verification.';
comment on table public.store_orders is 'Guest orders. Customer data is never exposed publicly; order lookup requires a high-entropy private token.';

create or replace function public.store_submit_contributor_application(
 p_full_name text,p_phone text,p_email text,p_contributor_type text,p_experience text,p_portfolio_url text
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
 if length(trim(coalesce(p_full_name,'')))<2 or length(trim(coalesce(p_phone,'')))<7 then raise exception 'Enter your name and phone number'; end if;
 if p_contributor_type not in ('teacher_creator','designer','affiliate','school_ambassador','other') then raise exception 'Invalid contributor type'; end if;
 if p_portfolio_url is not null and p_portfolio_url !~ '^https://' then raise exception 'Portfolio link must use HTTPS'; end if;
 insert into public.store_contributors(full_name,phone,email,contributor_type,experience,portfolio_url)
 values(trim(p_full_name),trim(p_phone),nullif(trim(coalesce(p_email,'')),''),p_contributor_type,nullif(trim(coalesce(p_experience,'')),''),nullif(trim(coalesce(p_portfolio_url,'')),''))
 returning id into v_id;
 return jsonb_build_object('received',true,'application_id',v_id);
end $$;
revoke all on function public.store_submit_contributor_application(text,text,text,text,text,text) from public;
grant execute on function public.store_submit_contributor_application(text,text,text,text,text,text) to anon, authenticated;

-- Prevent one M-Pesa transaction code from being reused across multiple orders.
create unique index if not exists store_orders_unique_payment_reference on public.store_orders (upper(payment_reference)) where payment_reference is not null;
