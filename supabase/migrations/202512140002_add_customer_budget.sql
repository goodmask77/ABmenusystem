-- Add customer budget to menu_orders for persistence
alter table public.menu_orders
    add column if not exists customer_budget numeric(10,2);

comment on column public.menu_orders.customer_budget is '客戶預算（數字）';
