-- Run this once in Supabase SQL Editor to enable the Today tab.

create table if not exists tasks (
  id text primary key,
  day date not null,
  title text not null,
  time text default '',
  icon text default '',
  notes text default '',
  done boolean default false,
  created_at timestamptz default now()
);

alter table tasks enable row level security;

drop policy if exists "Public access" on tasks;
create policy "Public access" on tasks for all using (true) with check (true);

create index if not exists idx_tasks_day on tasks(day);
