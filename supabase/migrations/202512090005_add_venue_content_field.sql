-- Add venue_content field to menu_orders table
alter table public.menu_orders 
add column if not exists venue_content text;

-- Create index for faster lookups
create index if not exists idx_menu_orders_venue_content on public.menu_orders(venue_content);

-- Create venue_content_options table for managing venue content dropdown options
create table if not exists public.venue_content_options (
    id serial primary key,
    name text not null unique,
    sort_order integer default 0,
    created_at timestamptz not null default now()
);

-- Enable RLS on venue_content_options table
alter table public.venue_content_options enable row level security;

-- Drop existing policies if they exist
do $$
begin
    if exists(select 1 from pg_policies where schemaname = 'public' and tablename = 'venue_content_options' and policyname = 'venue_content_options_select') then
        drop policy "venue_content_options_select" on public.venue_content_options;
    end if;
    if exists(select 1 from pg_policies where schemaname = 'public' and tablename = 'venue_content_options' and policyname = 'venue_content_options_insert') then
        drop policy "venue_content_options_insert" on public.venue_content_options;
    end if;
    if exists(select 1 from pg_policies where schemaname = 'public' and tablename = 'venue_content_options' and policyname = 'venue_content_options_update') then
        drop policy "venue_content_options_update" on public.venue_content_options;
    end if;
    if exists(select 1 from pg_policies where schemaname = 'public' and tablename = 'venue_content_options' and policyname = 'venue_content_options_delete') then
        drop policy "venue_content_options_delete" on public.venue_content_options;
    end if;
end $$;

-- Create RLS policies for venue_content_options (public access)
create policy "venue_content_options_select" on public.venue_content_options for select using (true);
create policy "venue_content_options_insert" on public.venue_content_options for insert with check (true);
create policy "venue_content_options_update" on public.venue_content_options for update using (true);
create policy "venue_content_options_delete" on public.venue_content_options for delete using (true);

-- Seed default venue content options
insert into public.venue_content_options (name, sort_order) values
    ('產品發表', 1),
    ('婚禮派對', 2),
    ('春酒尾牙', 3),
    ('公司聚餐', 4)
on conflict (name) do nothing;

