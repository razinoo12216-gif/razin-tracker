-- Run this once in Supabase SQL Editor to enable the Debts tab.

create table if not exists debts (
  id text primary key,
  creditor text not null,
  type text default 'other',
  original_amount text default '0',
  current_balance text default '0',
  monthly_payment text default '',
  interest_rate text default '',
  start_date date,
  due_date date,
  status text default 'active',
  priority text default 'normal',
  notes text default '',
  created_at timestamptz default now()
);

create table if not exists debt_payments (
  id text primary key,
  debt_id text references debts(id) on delete cascade,
  amount text not null,
  date date not null,
  notes text default '',
  created_at timestamptz default now()
);

alter table debts enable row level security;
alter table debt_payments enable row level security;

drop policy if exists "Public access" on debts;
drop policy if exists "Public access" on debt_payments;
create policy "Public access" on debts for all using (true) with check (true);
create policy "Public access" on debt_payments for all using (true) with check (true);

create index if not exists idx_debt_payments_debt on debt_payments(debt_id);
