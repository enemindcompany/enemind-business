-- Public product thumbnails; uploads and changes are restricted to the configured Enemind admin Firebase JWT email.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('store-product-images', 'store-product-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "Public can view Enemind product images" on storage.objects;
create policy "Public can view Enemind product images" on storage.objects for select to anon, authenticated
using (bucket_id = 'store-product-images');

drop policy if exists "Enemind admin uploads product images" on storage.objects;
create policy "Enemind admin uploads product images" on storage.objects for insert to authenticated
with check (bucket_id = 'store-product-images' and lower(coalesce(auth.jwt()->>'email','')) = 'enemindcompany@gmail.com');

drop policy if exists "Enemind admin updates product images" on storage.objects;
create policy "Enemind admin updates product images" on storage.objects for update to authenticated
using (bucket_id = 'store-product-images' and lower(coalesce(auth.jwt()->>'email','')) = 'enemindcompany@gmail.com')
with check (bucket_id = 'store-product-images' and lower(coalesce(auth.jwt()->>'email','')) = 'enemindcompany@gmail.com');

drop policy if exists "Enemind admin deletes product images" on storage.objects;
create policy "Enemind admin deletes product images" on storage.objects for delete to authenticated
using (bucket_id = 'store-product-images' and lower(coalesce(auth.jwt()->>'email','')) = 'enemindcompany@gmail.com');
