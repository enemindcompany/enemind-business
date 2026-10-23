-- Fix storage RLS when Firebase ID tokens are forwarded with a non-Supabase role claim.
-- Policies apply to the request role but still require the exact admin email claim.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('store-product-images', 'store-product-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "Public can view Enemind product images" on storage.objects;
create policy "Public can view Enemind product images" on storage.objects for select to public
using (bucket_id = 'store-product-images');
drop policy if exists "Enemind admin uploads product images" on storage.objects;
create policy "Enemind admin uploads product images" on storage.objects for insert to public
with check (bucket_id = 'store-product-images' and lower(coalesce(auth.jwt()->>'email','')) = 'enemindcompany@gmail.com');
drop policy if exists "Enemind admin updates product images" on storage.objects;
create policy "Enemind admin updates product images" on storage.objects for update to public
using (bucket_id = 'store-product-images' and lower(coalesce(auth.jwt()->>'email','')) = 'enemindcompany@gmail.com')
with check (bucket_id = 'store-product-images' and lower(coalesce(auth.jwt()->>'email','')) = 'enemindcompany@gmail.com');
drop policy if exists "Enemind admin deletes product images" on storage.objects;
create policy "Enemind admin deletes product images" on storage.objects for delete to public
using (bucket_id = 'store-product-images' and lower(coalesce(auth.jwt()->>'email','')) = 'enemindcompany@gmail.com');

-- Expand the store's supported categories.
alter table public.store_products drop constraint if exists store_products_category_check;
alter table public.store_products add constraint store_products_category_check
  check (category in ('revision','teacher','parent','school','course','ebook','template','career','online-earning','selling-prompts','other'));

-- Admin-managed curated YouTube video links. Only metadata/URLs are stored, not copied video files.
create table if not exists public.store_youtube_videos (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 2 and 180),
  video_url text not null check (video_url ~* '^https://(www\.)?(youtube\.com/watch\?v=[A-Za-z0-9_-]{6,}|youtu\.be/[A-Za-z0-9_-]{6,}|www\.youtube\.com/embed/[A-Za-z0-9_-]{6,}|youtube\.com/shorts/[A-Za-z0-9_-]{6,})'),
  topic text,
  description text,
  status text not null default 'draft' check (status in ('draft','published')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.store_youtube_videos enable row level security;
drop policy if exists "Public can view published Enemind YouTube videos" on public.store_youtube_videos;
create policy "Public can view published Enemind YouTube videos" on public.store_youtube_videos for select to anon, authenticated using (status = 'published');
drop policy if exists "Enemind admin manages YouTube videos" on public.store_youtube_videos;
create policy "Enemind admin manages YouTube videos" on public.store_youtube_videos for all to public
using (lower(coalesce(auth.jwt()->>'email','')) = 'enemindcompany@gmail.com')
with check (lower(coalesce(auth.jwt()->>'email','')) = 'enemindcompany@gmail.com');
grant select on public.store_youtube_videos to anon, authenticated;
grant insert, update, delete on public.store_youtube_videos to anon, authenticated;
