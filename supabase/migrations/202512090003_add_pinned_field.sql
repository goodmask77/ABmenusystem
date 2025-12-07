-- Add is_pinned field to menu_orders table for pinning orders
alter table public.menu_orders 
add column if not exists is_pinned boolean default false;

-- Create index for faster lookups on pinned orders
create index if not exists idx_menu_orders_is_pinned on public.menu_orders(is_pinned);

