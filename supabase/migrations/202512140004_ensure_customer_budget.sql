-- Ensure customer_budget exists and has default 0
alter table public.menu_orders
    add column if not exists customer_budget numeric(10,2);

alter table public.menu_orders
    alter column customer_budget set default 0;

update public.menu_orders
    set customer_budget = 0
    where customer_budget is null;

comment on column public.menu_orders.customer_budget is '客戶預算（數字）';
