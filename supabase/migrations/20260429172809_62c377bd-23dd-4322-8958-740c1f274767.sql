
-- Storage bucket for uploaded manual files
insert into storage.buckets (id, name, public)
values ('manuals', 'manuals', true)
on conflict (id) do nothing;

-- Allow public read + insert on the manuals bucket (training tool, no auth)
create policy "Public read manuals bucket"
  on storage.objects for select
  using (bucket_id = 'manuals');

create policy "Public upload manuals bucket"
  on storage.objects for insert
  with check (bucket_id = 'manuals');

-- Uploaded manuals registry
create table public.uploaded_manuals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  code text not null default 'USR',
  edition text not null default 'Uploaded',
  source_filename text not null,
  storage_path text not null,
  status text not null default 'processing',
  error text,
  chunk_count integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.uploaded_manuals enable row level security;

create policy "Anyone can read uploaded manuals"
  on public.uploaded_manuals for select using (true);

create policy "Anyone can insert uploaded manuals"
  on public.uploaded_manuals for insert with check (true);

create policy "Anyone can update uploaded manuals"
  on public.uploaded_manuals for update using (true);

-- Parsed chunks
create table public.manual_chunks (
  id uuid primary key default gen_random_uuid(),
  manual_id uuid not null references public.uploaded_manuals(id) on delete cascade,
  ordinal integer not null,
  section text not null default '',
  page integer not null default 1,
  heading text not null default '',
  text text not null,
  created_at timestamptz not null default now()
);

create index manual_chunks_manual_id_idx on public.manual_chunks(manual_id);

alter table public.manual_chunks enable row level security;

create policy "Anyone can read manual chunks"
  on public.manual_chunks for select using (true);

create policy "Anyone can insert manual chunks"
  on public.manual_chunks for insert with check (true);
