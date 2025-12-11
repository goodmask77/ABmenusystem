-- 確保 menu_orders 存在 discount 欄位（文字型態，儲存「10%」或金額字串）
alter table public.menu_orders
    add column if not exists discount text;

comment on column public.menu_orders.discount is '折扣（顯示用，可輸入百分比或金額字串）';

