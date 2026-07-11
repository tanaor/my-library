create table if not exists reading_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  book_id text not null,
  "offset" int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, book_id)
);

create table if not exists highlights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  book_id text not null,
  start_off int not null,
  end_off int not null,
  quote text not null default '',
  note text,
  color text not null default 'yellow',
  created_at timestamptz not null default now()
);
create index if not exists highlights_user_book_idx on highlights (user_id, book_id);

alter table reading_progress enable row level security;
alter table highlights enable row level security;

create policy "own progress" on reading_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own highlights" on highlights
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
