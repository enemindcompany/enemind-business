-- Add learning metadata for class, curriculum, subject and career filters.
alter table public.store_products add column if not exists curriculum text;
alter table public.store_products add column if not exists class_level text;
alter table public.store_products add column if not exists subject text;
alter table public.store_products add column if not exists career_area text;

-- Include career development as a first-class resource category.
alter table public.store_products drop constraint if exists store_products_category_check;
alter table public.store_products add constraint store_products_category_check
  check (category in ('revision','teacher','parent','school','course','ebook','template','career','other'));

create index if not exists store_products_learning_filters_idx
  on public.store_products(status, curriculum, class_level, subject, career_area);
