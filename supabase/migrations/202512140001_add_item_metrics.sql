-- Add weight/volume fields for menu items
alter table public.menu_items
    add column if not exists food_weight_g numeric(10,2),
    add column if not exists soft_drink_ml numeric(10,2),
    add column if not exists drink_ml numeric(10,2);

comment on column public.menu_items.food_weight_g is '餐點重量（g）';
comment on column public.menu_items.soft_drink_ml is '軟飲容量（ml）';
comment on column public.menu_items.drink_ml is '酒水容量（ml）';
