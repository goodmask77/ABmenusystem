-- Add status column for history orders (常用/重要/待辦/完成)
alter table public.menu_orders
    add column if not exists status text default '待辦';

comment on column public.menu_orders.status is '訂單狀態：常用/重要/待辦/完成';
