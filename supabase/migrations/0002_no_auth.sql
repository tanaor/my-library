-- Single-user personal app: drop Supabase Auth entirely. Data is keyed by book only,
-- with permissive RLS so the publishable (anon) key can read/write. No login, no users.
-- (Reading positions + highlights on public books are non-sensitive.)

drop table if exists highlights;
drop table if exists reading_progress;

create table reading_progress (
  book_id text primary key,
  "offset" int not null default 0,
  updated_at timestamptz not null default now()
);

create table highlights (
  id uuid primary key default gen_random_uuid(),
  book_id text not null,
  start_off int not null,
  end_off int not null,
  quote text not null default '',
  note text,
  color text not null default 'yellow',
  created_at timestamptz not null default now()
);
create index highlights_book_idx on highlights (book_id);

alter table reading_progress enable row level security;
alter table highlights enable row level security;

create policy "public rw progress" on reading_progress for all using (true) with check (true);
create policy "public rw highlights" on highlights for all using (true) with check (true);
