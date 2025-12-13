-- 添加 is_completed 欄位到 menu_orders 表
-- 用於標記訂單是否已完成

ALTER TABLE menu_orders
ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT FALSE;

-- 添加索引以優化查詢
CREATE INDEX IF NOT EXISTS idx_menu_orders_is_completed ON menu_orders(is_completed);

-- 添加註釋
COMMENT ON COLUMN menu_orders.is_completed IS '訂單是否已完成（完成後會自動排序到底部）';

