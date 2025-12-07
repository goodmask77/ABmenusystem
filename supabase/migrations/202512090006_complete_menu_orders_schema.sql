-- ============================================
-- 完整的 menu_orders 表結構遷移
-- 此 migration 會確保所有前端使用的欄位都存在
-- ============================================

-- 1. 確保表存在（如果不存在則建立）
create table if not exists public.menu_orders (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 2. 新增所有需要的欄位（使用 IF NOT EXISTS 避免重複新增）

-- 公司資訊
alter table public.menu_orders 
    add column if not exists company_name text,
    add column if not exists tax_id text;

-- 聯絡人資訊
alter table public.menu_orders 
    add column if not exists contact_name text,
    add column if not exists contact_phone text;

-- 訂單類型與方案
alter table public.menu_orders 
    add column if not exists plan_type text,
    add column if not exists line_name text,
    add column if not exists industry text;

-- 包場相關
alter table public.menu_orders 
    add column if not exists venue_content text,
    add column if not exists venue_scope text;

-- 用餐相關
alter table public.menu_orders 
    add column if not exists dining_style text,
    add column if not exists dining_datetime timestamptz;

-- 付款相關
alter table public.menu_orders 
    add column if not exists payment_method text,
    add column if not exists deposit_paid numeric(10,2) default 0;

-- 人數與桌數
alter table public.menu_orders 
    add column if not exists table_count integer default 1,
    add column if not exists people_count integer default 1;

-- 金額相關
alter table public.menu_orders 
    add column if not exists subtotal numeric(10,2) default 0,
    add column if not exists service_fee numeric(10,2) default 0,
    add column if not exists total numeric(10,2) default 0,
    add column if not exists per_person numeric(10,2) default 0;

-- 購物車內容
alter table public.menu_orders 
    add column if not exists cart_items jsonb default '[]'::jsonb;

-- 系統欄位
alter table public.menu_orders 
    add column if not exists created_by text,
    add column if not exists is_pinned boolean default false;

-- 3. 建立索引以提升查詢效能
create index if not exists idx_menu_orders_company_name on public.menu_orders(company_name);
create index if not exists idx_menu_orders_industry on public.menu_orders(industry);
create index if not exists idx_menu_orders_plan_type on public.menu_orders(plan_type);
create index if not exists idx_menu_orders_line_name on public.menu_orders(line_name);
create index if not exists idx_menu_orders_venue_content on public.menu_orders(venue_content);
create index if not exists idx_menu_orders_is_pinned on public.menu_orders(is_pinned);
create index if not exists idx_menu_orders_dining_datetime on public.menu_orders(dining_datetime);
create index if not exists idx_menu_orders_created_at on public.menu_orders(created_at);

-- 4. 確保 RLS 已啟用
alter table public.menu_orders enable row level security;

-- 5. 刪除舊的 policies（如果存在）
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

-- 6. 建立 RLS policies（允許公開存取）
create policy "menu_orders_select" on public.menu_orders for select using (true);
create policy "menu_orders_insert" on public.menu_orders for insert with check (true);
create policy "menu_orders_update" on public.menu_orders for update using (true);
create policy "menu_orders_delete" on public.menu_orders for delete using (true);

-- 7. 建立 updated_at 自動更新 trigger（如果不存在）
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

drop trigger if exists update_menu_orders_updated_at on public.menu_orders;
create trigger update_menu_orders_updated_at
    before update on public.menu_orders
    for each row
    execute function update_updated_at_column();

-- ============================================
-- 完成！所有欄位已確保存在
-- ============================================

