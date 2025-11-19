-- Create menu_state table to persist the entire menu snapshot shared by the front-end
create extension if not exists "uuid-ossp";

create table if not exists public.menu_state (
    name text primary key,
    payload jsonb not null,
    updated_at timestamptz not null default now()
);

-- Ensure RLS is enabled and grant open policies so the public anon key can read/write.
alter table public.menu_state enable row level security;

do $$
begin
    if exists(select 1 from pg_policies where schemaname = 'public' and tablename = 'menu_state' and policyname = 'menu_state_select') then
        drop policy "menu_state_select" on public.menu_state;
    end if;
    if exists(select 1 from pg_policies where schemaname = 'public' and tablename = 'menu_state' and policyname = 'menu_state_upsert') then
        drop policy "menu_state_upsert" on public.menu_state;
    end if;
    if exists(select 1 from pg_policies where schemaname = 'public' and tablename = 'menu_state' and policyname = 'menu_state_delete') then
        drop policy "menu_state_delete" on public.menu_state;
    end if;
end $$;

create policy "menu_state_select" on public.menu_state for select using (true);
create policy "menu_state_upsert" on public.menu_state for insert with check (true);
create policy "menu_state_delete" on public.menu_state for delete using (true);
create policy "menu_state_update" on public.menu_state for update using (true);
