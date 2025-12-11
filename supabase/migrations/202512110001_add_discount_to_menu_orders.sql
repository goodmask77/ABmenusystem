-- 新增折扣欄位，允許百分比或金額文字
alter table public.menu_orders
    add column if not exists discount text;

comment on column public.menu_orders.discount is '折扣，可填百分比(如 10%)或金額(如 500)';

