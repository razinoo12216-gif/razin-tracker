-- Paste this entire block into Supabase → SQL Editor → New query → Run.

create table projects (
  id text primary key,
  name text not null,
  status text default 'Active',
  revenue text default '',
  expenses text default '',
  tasks text default '',
  people text default '',
  notes text default '',
  created_at timestamptz default now()
);

alter table projects enable row level security;

create policy "Public access" on projects
  for all using (true) with check (true);
