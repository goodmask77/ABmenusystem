-- Add new fields to menu_orders table
alter table public.menu_orders 
add column if not exists plan_type text,
add column if not exists line_name text;

-- Create index for faster lookups on new fields
create index if not exists idx_menu_orders_plan_type on public.menu_orders(plan_type);
create index if not exists idx_menu_orders_line_name on public.menu_orders(line_name);

