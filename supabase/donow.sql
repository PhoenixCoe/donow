-- Do Now: where each teacher's classes, topics and questions are kept.
-- One row per teacher. Only that teacher can read or change their own row.
-- Safe to run more than once.

create table if not exists public.donow (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb check (octet_length(data::text) < 5000000),
  updated timestamptz not null default now()
);

alter table public.donow enable row level security;

drop policy if exists "own donow" on public.donow;
create policy "own donow" on public.donow
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

revoke all on public.donow from anon;
grant select, insert, update, delete on public.donow to authenticated;
