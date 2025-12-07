-- Create menu_orders table for storing order records
-- This table stores all order information with customer details

create table if not exists public.menu_orders (
    id uuid primary key default gen_random_uuid(),
    company_name text,
    tax_id text,
    contact_name text,
    contact_phone text,
    industry text,
    venue_scope text,
    dining_style text,
    payment_method text,
    deposit_paid numeric(10,2) default 0,
    dining_datetime timestamptz,
    table_count integer default 1,
    people_count integer default 1,
    subtotal numeric(10,2) default 0,
    service_fee numeric(10,2) default 0,
    total numeric(10,2) default 0,
    per_person numeric(10,2) default 0,
    cart_items jsonb default '[]'::jsonb,
    created_by text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Create industry_options table for managing industry dropdown options
create table if not exists public.industry_options (
    id serial primary key,
    name text not null unique,
    sort_order integer default 0,
    created_at timestamptz not null default now()
);

-- Enable RLS on both tables
alter table public.menu_orders enable row level security;
alter table public.industry_options enable row level security;

-- Drop existing policies if they exist (menu_orders)
do $$
begin
    if exists(select 1 from pg_policies where schemaname = 'public' and tablename = 'menu_orders' and policyname = 'menu_orders_select') then
        drop policy "menu_orders_select" on public.menu_orders;
    end if;
    if exists(select 1 from pg_policies where schemaname = 'public' and tablename = 'menu_orders' and policyname = 'menu_orders_insert') then
        drop policy "menu_orders_insert" on public.menu_orders;
    end if;
    if exists(select 1 from pg_policies where schemaname = 'public' and tablename = 'menu_orders' and policyname = 'menu_orders_update') then
        drop policy "menu_orders_update" on public.menu_orders;
    end if;
    if exists(select 1 from pg_policies where schemaname = 'public' and tablename = 'menu_orders' and policyname = 'menu_orders_delete') then
        drop policy "menu_orders_delete" on public.menu_orders;
    end if;
end $$;

-- Drop existing policies if they exist (industry_options)
do $$
begin
    if exists(select 1 from pg_policies where schemaname = 'public' and tablename = 'industry_options' and policyname = 'industry_options_select') then
        drop policy "industry_options_select" on public.industry_options;
    end if;
    if exists(select 1 from pg_policies where schemaname = 'public' and tablename = 'industry_options' and policyname = 'industry_options_insert') then
        drop policy "industry_options_insert" on public.industry_options;
    end if;
    if exists(select 1 from pg_policies where schemaname = 'public' and tablename = 'industry_options' and policyname = 'industry_options_update') then
        drop policy "industry_options_update" on public.industry_options;
    end if;
    if exists(select 1 from pg_policies where schemaname = 'public' and tablename = 'industry_options' and policyname = 'industry_options_delete') then
        drop policy "industry_options_delete" on public.industry_options;
    end if;
end $$;

-- Create RLS policies for menu_orders (public access)
create policy "menu_orders_select" on public.menu_orders for select using (true);
create policy "menu_orders_insert" on public.menu_orders for insert with check (true);
create policy "menu_orders_update" on public.menu_orders for update using (true);
create policy "menu_orders_delete" on public.menu_orders for delete using (true);

-- Create RLS policies for industry_options (public access)
create policy "industry_options_select" on public.industry_options for select using (true);
create policy "industry_options_insert" on public.industry_options for insert with check (true);
create policy "industry_options_update" on public.industry_options for update using (true);
create policy "industry_options_delete" on public.industry_options for delete using (true);

-- Seed default industry options
insert into public.industry_options (name, sort_order) values
    ('科技業', 1),
    ('金融業', 2),
    ('製造業', 3),
    ('服務業', 4),
    ('餐飲業', 5),
    ('零售業', 6),
    ('醫療業', 7),
    ('教育業', 8),
    ('建築業', 9),
    ('其他', 10)
on conflict (name) do nothing;

-- Create index for faster lookups
create index if not exists idx_menu_orders_company_name on public.menu_orders(company_name);
create index if not exists idx_menu_orders_industry on public.menu_orders(industry);
create index if not exists idx_menu_orders_dining_datetime on public.menu_orders(dining_datetime);
create index if not exists idx_menu_orders_created_at on public.menu_orders(created_at);
