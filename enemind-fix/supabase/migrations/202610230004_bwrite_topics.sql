-- Daily Bwrite topics managed by Enemind admin.
create table if not exists public.bwrite_topics (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 1 and 180),
  category text not null check (length(category) between 1 and 80),
  brief text not null check (length(brief) between 1 and 1500),
  status text not null default 'published' check (status in ('published','archived')),
  created_by text not null,
  created_at timestamptz not null default now()
);
create index if not exists bwrite_topics_created_idx on public.bwrite_topics(created_at desc);
alter table public.bwrite_topics enable row level security;
revoke all on public.bwrite_topics from anon;
grant select, insert, update on public.bwrite_topics to authenticated;
drop policy if exists bwrite_topics_select_today on public.bwrite_topics;
create policy bwrite_topics_select_today on public.bwrite_topics for select to authenticated
using (created_at >= date_trunc('day', now()) and created_at < date_trunc('day', now()) + interval '1 day' or lower(coalesce(auth.jwt()->>'email','')) = 'enemindcompany@gmail.com');
drop policy if exists bwrite_topics_insert_admin on public.bwrite_topics;
create policy bwrite_topics_insert_admin on public.bwrite_topics for insert to authenticated
with check (lower(coalesce(auth.jwt()->>'email','')) = 'enemindcompany@gmail.com' and created_by = auth.jwt()->>'sub' and status = 'published');
drop policy if exists bwrite_topics_update_admin on public.bwrite_topics;
create policy bwrite_topics_update_admin on public.bwrite_topics for update to authenticated
using (lower(coalesce(auth.jwt()->>'email','')) = 'enemindcompany@gmail.com')
with check (lower(coalesce(auth.jwt()->>'email','')) = 'enemindcompany@gmail.com');

alter table public.bwrite_submissions add column if not exists topic_id uuid references public.bwrite_topics(id) on delete set null;
alter table public.bwrite_submissions add column if not exists topic_title text;
create index if not exists bwrite_submissions_topic_idx on public.bwrite_submissions(topic_id, created_at desc);
