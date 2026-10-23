-- Fix admin product insert/update failures when Supabase receives Firebase ID tokens.
-- Keep RLS enabled. The policy is applicable to the request role, but writes still
-- require the signed Firebase JWT to contain the verified admin email claim.

alter table public.store_products enable row level security;

-- Remove the earlier role-scoped policy so this single explicit admin policy is used.
drop policy if exists "Enemind admin manages store products" on public.store_products;
drop policy if exists "Enemind admin manages store products via Firebase JWT" on public.store_products;

create policy "Enemind admin manages store products via Firebase JWT"
  on public.store_products
  for all
  to public
  using (
    lower(coalesce(auth.jwt() ->> 'email', auth.jwt() -> 'user_metadata' ->> 'email', '')) = 'enemindcompany@gmail.com'
  )
  with check (
    lower(coalesce(auth.jwt() ->> 'email', auth.jwt() -> 'user_metadata' ->> 'email', '')) = 'enemindcompany@gmail.com'
  );

-- SQL privileges are required in addition to an RLS policy. RLS still blocks
-- non-admin requests, even though the API roles have table privileges.
grant select on public.store_products to anon, authenticated;
grant insert, update, delete on public.store_products to anon, authenticated;

-- Ensure the storefront can query the table while RLS filters rows to published products.
drop policy if exists "Public can view published store products" on public.store_products;
create policy "Public can view published store products"
  on public.store_products
  for select
  to anon, authenticated
  using (status = 'published');
