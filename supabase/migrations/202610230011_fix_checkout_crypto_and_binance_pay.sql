-- Fix checkout on Supabase projects where pgcrypto's gen_random_bytes/digest
-- functions are not on the function search_path. Use PostgreSQL's built-in
-- gen_random_uuid() and md5() instead; the lookup token is high-entropy UUID data.

alter table public.store_orders
  add column if not exists payment_method text not null default 'mpesa';

alter table public.store_orders drop constraint if exists store_orders_payment_method_check;
alter table public.store_orders add constraint store_orders_payment_method_check
  check (payment_method in ('mpesa','binance'));

create or replace function public.store_create_guest_order(
 p_product_id uuid,
 p_buyer_name text,
 p_buyer_phone text,
 p_buyer_email text default null,
 p_delivery_method text default 'download'
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
 p public.store_products%rowtype;
 v_ref text;
 v_token text;
 v_order_id uuid;
begin
 if length(trim(coalesce(p_buyer_name,''))) < 2 or length(trim(coalesce(p_buyer_phone,''))) < 7 then
   raise exception 'Enter your name and a valid phone number';
 end if;
 if p_delivery_method not in ('download','whatsapp') then
   raise exception 'Invalid delivery preference';
 end if;
 select * into p from public.store_products where id=p_product_id and status='published';
 if not found then raise exception 'This product is not available for purchase'; end if;
 v_ref := 'EN-' || to_char(now() at time zone 'Africa/Nairobi','YYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
 v_token := replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','');
 insert into public.store_orders(order_reference,lookup_token_hash,product_id,product_title,buyer_name,buyer_phone,buyer_email,amount,currency,delivery_method,payment_method)
 values(v_ref,md5(v_token),p.id,p.title,trim(p_buyer_name),trim(p_buyer_phone),nullif(trim(coalesce(p_buyer_email,'')),''),p.price,p.currency,p_delivery_method,'mpesa')
 returning id into v_order_id;
 return jsonb_build_object('order_id',v_order_id,'order_reference',v_ref,'lookup_token',v_token,'amount',p.price,'currency',p.currency);
end $$;

-- Remove the older three-argument function so PostgREST resolves the new signature.
drop function if exists public.store_submit_payment_reference(text,text,text);
create or replace function public.store_submit_payment_reference(
 p_order_reference text,
 p_lookup_token text,
 p_transaction_code text,
 p_payment_method text default 'mpesa'
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
 if p_payment_method not in ('mpesa','binance') then raise exception 'Choose a supported payment method'; end if;
 if length(trim(coalesce(p_transaction_code,''))) < 5 or length(trim(p_transaction_code)) > 160 then
   raise exception 'Enter a valid payment transaction reference';
 end if;
 update public.store_orders
 set payment_reference=upper(trim(p_transaction_code)),payment_method=p_payment_method,payment_status='submitted',status='payment_review',updated_at=now()
 where order_reference=trim(p_order_reference) and lookup_token_hash=md5(coalesce(p_lookup_token,''))
   and payment_status in ('pending','rejected')
 returning id into v_id;
 if v_id is null then raise exception 'Order not found or payment reference cannot be changed'; end if;
 return jsonb_build_object('submitted',true,'payment_method',p_payment_method);
end $$;

create or replace function public.store_lookup_guest_order(p_order_reference text,p_lookup_token text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare o public.store_orders%rowtype;
begin
 select * into o from public.store_orders
 where order_reference=trim(p_order_reference) and lookup_token_hash=md5(coalesce(p_lookup_token,''));
 if not found then return null; end if;
 return jsonb_build_object(
   'order_reference',o.order_reference,'product_title',o.product_title,'amount',o.amount,'currency',o.currency,
   'status',o.status,'payment_status',o.payment_status,'payment_method',o.payment_method,
   'delivery_method',o.delivery_method,'delivery_status',o.delivery_status,
   'delivery_url',case when o.payment_status='verified' and o.delivery_status='ready' and o.delivery_method='download' then o.delivery_url else null end
 );
end $$;

revoke all on function public.store_create_guest_order(uuid,text,text,text,text) from public;
grant execute on function public.store_create_guest_order(uuid,text,text,text,text) to anon, authenticated;
revoke all on function public.store_submit_payment_reference(text,text,text,text) from public;
grant execute on function public.store_submit_payment_reference(text,text,text,text) to anon, authenticated;
revoke all on function public.store_lookup_guest_order(text,text) from public;
grant execute on function public.store_lookup_guest_order(text,text) to anon, authenticated;
