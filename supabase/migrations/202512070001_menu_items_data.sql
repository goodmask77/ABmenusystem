-- Create menu_items table and seed data
-- This migration creates the menu_items table for storing individual menu items

create table if not exists public.menu_items (
    id uuid primary key default uuid_generate_v4(),
    category text not null,
    name text not null,
    name_en text,
    price numeric(10,2),
    inserted_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.menu_items enable row level security;

-- Drop existing policies if they exist
do $$
begin
    if exists(select 1 from pg_policies where schemaname = 'public' and tablename = 'menu_items' and policyname = 'menu_items_select') then
        drop policy "menu_items_select" on public.menu_items;
    end if;
    if exists(select 1 from pg_policies where schemaname = 'public' and tablename = 'menu_items' and policyname = 'menu_items_insert') then
        drop policy "menu_items_insert" on public.menu_items;
    end if;
    if exists(select 1 from pg_policies where schemaname = 'public' and tablename = 'menu_items' and policyname = 'menu_items_update') then
        drop policy "menu_items_update" on public.menu_items;
    end if;
    if exists(select 1 from pg_policies where schemaname = 'public' and tablename = 'menu_items' and policyname = 'menu_items_delete') then
        drop policy "menu_items_delete" on public.menu_items;
    end if;
end $$;

-- Create RLS policies
create policy "menu_items_select" on public.menu_items for select using (true);
create policy "menu_items_insert" on public.menu_items for insert with check (true);
create policy "menu_items_update" on public.menu_items for update using (true);
create policy "menu_items_delete" on public.menu_items for delete using (true);

-- Clear existing data and insert new menu items
truncate table public.menu_items;

-- New York-Style Pizza
insert into public.menu_items (category, name, name_en, price) values
('New York-Style Pizza', '蒔蘿巧達海鮮濃湯披薩', 'Seafood Chowder with Dill Pizza', 480),
('New York-Style Pizza', '墨西哥哥火辣牛肉披薩', 'Mexico Spicy Beef Pizza', 480),
('New York-Style Pizza', '日式風章魚燒披薩', 'Japanese-style Takoyaki Pizza', 460),
('New York-Style Pizza', '普羅旺斯燉菜披薩', 'Provençal Ratatouille Pizza', 450),
('New York-Style Pizza', '四起司胡桃楓糖披薩', 'Four Cheese Walnut & Maple Syrup Pizza', 450),
('New York-Style Pizza', '經典紅醬起司臘腸披薩', 'Classic Tomato Sauce Cheese & Pepperoni Pizza', 430);

-- Salads
insert into public.menu_items (category, name, name_en, price) values
('Salads', '薄荷萊姆海鮮腰果綜合沙拉', 'Mint & Lime Seafood Salad', 480),
('Salads', '豐收希臘優格雞肉沙拉', 'Harvest Greek Yogurt Chicken Salad', 430),
('Salads', '經典藍起司凱薩沙拉', 'Classic Blue Cheese Caesar Salad', 420),
('Salads', '純素蔬果油醋沙拉', 'Vegan Garden Salad with Balsamic', 380);

-- Soup
insert into public.menu_items (category, name, name_en, price) values
('Soup', '海鮮巧達蛤蠣濃湯', 'Seafood Clam Chowder', 230),
('Soup', '地中海番茄牛肋蔬菜湯', 'Tomato Vegetable Beef Soup', 230),
('Soup', '卡布奇諾蘑菇濃湯', 'Cappuccino Mushroom Soup', 220);

-- Appetizers
insert into public.menu_items (category, name, name_en, price) values
('Appetizers', '菠菜青醬藤椒燒烤魷魚', 'Grilled Squid with Spinach Pesto & Green Sichuan Pepper', 360),
('Appetizers', '辣味酸奶韃靼鮭魚烤玉米脆片', 'Spicy Salmon Tartare with Sour Cream & Roasted Tortilla Chips', 350),
('Appetizers', '阿拉伯香料鷹嘴豆泥大蒜烤餅', 'Arabic Spiced Hummus with Garlic Flatbread', 330),
('Appetizers', '羅美斯科帕馬森脆烤節瓜', 'Crispy Roasted Zucchini with Parmesan & Romesco', 320),
('Appetizers', '紅椒青檸優格碳烤青花菜', 'Char-Grilled Broccoli with Paprika Lime Yogurt', 300),
('Appetizers', '白松露太陽蛋奶油薯泥蛋沙拉', 'White Truffle Sunny Egg Mashed Potato Salad', 300);

-- All Day Brunch
insert into public.menu_items (category, name, name_en, price) values
('All Day Brunch', '鹽漬生鮭歐姆蛋布里歐', 'Salt-Cured Salmon & Omelette Brioche', 430),
('All Day Brunch', '夏威夷海灘雙層純牛肉漢堡', 'Hawaiian Beach Double Beef Burger', 420),
('All Day Brunch', '藍起司帶皮雞胸堡', 'Blue Cheese Chicken Breast Burger', 390),
('All Day Brunch', '墨西哥辣味烤牛肉塔可碗', 'Mexican Spicy Grilled Beef Taco Bowl', 380),
('All Day Brunch', '煙燻火腿班尼迪克蛋', 'Smoked Ham Eggs Benedict', 330),
('All Day Brunch', '美式經典早餐', 'American Classic Brunch', 330),
('All Day Brunch', '奶油楓糖格子鬆餅', 'Creamy Maple Waffle', 320),
('All Day Brunch', '焦糖香蕉格子鬆餅', 'Caramel Banana Waffle', 320),
('All Day Brunch', '命中註定出現的那塊法式吐司', 'I''m the Best French Toast in TAIPEI', 320);

-- La Pasta
insert into public.menu_items (category, name, name_en, price) values
('La Pasta', '明太子鮭魚卵粉紅義大利麵', 'Mentaiko & Salmon Roe Tomato Pasta', 530),
('La Pasta', '蒜味檸檬鮮蝦義大利麵', 'Garlic & Lemon Shrimp Pasta', 520),
('La Pasta', '絲綢乳酪奶油番茄水管麵', 'Creamy Tomato Rigatoni with Stracciatella Cheese', 480),
('La Pasta', '黑松露熟成起司寬扁麵', 'Black Truffle & Aged Cheese Fettuccine', 470),
('La Pasta', '開心果菠菜奶油青醬管麵', 'Pistachio & Spinach Cream Pesto Rigatoni', 460),
('La Pasta', '日式拿坡里肉醬寬扁麵', 'Japanese-Style Neapolitan Meat Sauce Fettuccine', 430);

-- Risotto
insert into public.menu_items (category, name, name_en, price) values
('Risotto', '布拉塔起司羅美斯科燉飯', 'Romesco Risotto with Burrata Cheese', 530),
('Risotto', '奶油檸檬櫛瓜鮮蝦燉飯', 'Creamy Lemon Risotto with Zucchini & Shrimp', 490),
('Risotto', '溫泉蛋松露蘑菇燉飯', 'Truffle Mushroom Risotto with Onsen Egg', 480),
('Risotto', '脆洋蔥烤青花青醬燉飯', 'Pesto Risotto with Roasted Broccoli & Crispy Onions', 460);

-- Main Dishes
insert into public.menu_items (category, name, name_en, price) values
('Main Dishes', 'GFSI杉河農場天然飼養自然牛肋眼', 'Naturally Raised CEDAR RIVER FARMS Ribeye', 1280),
('Main Dishes', '榖飼黑豚帶骨法式薯泥豬排', 'Grain-Fed Black Pork Chop with Pommes Purée', 860),
('Main Dishes', '24小時爐烤牛排', '24-Hour Slow-Roasted Steak', 680);

-- Fried & Loved
insert into public.menu_items (category, name, name_en, price) values
('Fried & Loved', '經典炸物拼盤', 'A Beach Combo', 650),
('Fried & Loved', '廣島酥炸生蠔', 'Crispy Fried Hiroshima Oysters', 320),
('Fried & Loved', '南洋風味香甜雞翅', 'Thai Sweet Chili Wings', 280),
('Fried & Loved', '加拿大楓糖辣雞翅', 'Maple Hot Syrup Wings', 280),
('Fried & Loved', '松露帕達諾起司薯條', 'Grana Padano Truffle Fries', 260),
('Fried & Loved', '舊金山香蒜薯條', 'San Francisco Garlic Fries', 250);

-- Soft Drink
insert into public.menu_items (category, name, name_en, price) values
('Soft Drink', '錫蘭紅茶', 'Ceylon Black Tea', 120),
('Soft Drink', '茉莉花綠茶', 'Jasmine Green Tea', 120),
('Soft Drink', '新鮮薄荷檸檬水', 'Fresh Mint & Lemon Water', 130),
('Soft Drink', '桂花蜜檸檬冰紅茶', 'Honey Lemon Black Tea', 150),
('Soft Drink', '熟成果香烏龍冰茶', 'Fruity Oolong Iced Tea', 150),
('Soft Drink', '龍眼木質高山鮮奶茶', 'High Mountain Milk Tea', 160),
('Soft Drink', '原香泰式手標冰奶茶', 'Royal Thai Silk Milk Tea', 160),
('Soft Drink', '清爽荔枝香茅氣泡飲', 'Refreshing Lychee Lemongrass Fizz', 160),
('Soft Drink', '酸甜鳳梨桂圓氣泡飲', 'Sweet & Tangy Pineapple Longan Fizz', 160),
('Soft Drink', '香檳葡萄烏龍茶氣泡飲', 'Grape Champagne Oolong Sparkling Tea', 160);

-- COFFEE
insert into public.menu_items (category, name, name_en, price) values
('COFFEE', '美式咖啡', 'Americano', 140),
('COFFEE', '拿鐵咖啡', 'Caffè Latte', 160),
('COFFEE', '越式冰咖啡', 'Vietnamese Iced Coffee', 160),
('COFFEE', '椰香白咖啡', 'Vietnamese White Coffee', 160),
('COFFEE', '荔枝西西里氣泡咖啡', 'Lychee Sicilian Sparkling Coffee', 160);

-- Smoothies
insert into public.menu_items (category, name, name_en, price) values
('Smoothies', '莓檸粉果昔', 'Berry Lemon Pink Smoothie', 180),
('Smoothies', '熱芒黃果昔', 'Tropical Mango Yellow Smoothie', 180),
('Smoothies', '火龍紫果昔', 'Dragonfruit Purple Smoothie', 180),
('Smoothies', '翡翠綠果昔', 'Emerald Green Smoothie', 180);

-- Hot Tea
insert into public.menu_items (category, name, name_en, price) values
('Hot Tea', '南非國寶茶', 'Rooibos Tea', 180),
('Hot Tea', '豐收蕎麥茶', 'Harvest Buckwheat Tea', 180),
('Hot Tea', '美顏紅棗茶', 'Rose & Jujube Herbal Tea', 180),
('Hot Tea', '洋甘菊薄荷茶', 'Chamomile Mint Tea', 180),
('Hot Tea', '山楂洛神玫瑰茶', 'Hawthorn, Rose & Roselle Herbal Tea', 180);

-- Beer
insert into public.menu_items (category, name, name_en, price) values
('Beer', '國產王者十八天', 'Taiwan No.1 Beer', 190),
('Beer', '龍洞窖藏拉格', 'Red Point Lager', 230);

-- Draft Cocktail
insert into public.menu_items (category, name, name_en, price) values
('Draft Cocktail', '長灘芒果冰沙', 'Mango Mango', 250),
('Draft Cocktail', '法式伯爵茶', 'French Earl Grey', 250),
('Draft Cocktail', '麝香葡萄薄荷莫西多', 'Muscat Grape Mint Mojito', 250),
('Draft Cocktail', '水蜜桃青梅桑格利亞', 'Peach Ume Sangria', 250),
('Draft Cocktail', '藍甘菊長島冰茶', 'Blue Chamomile Long Island Iced Tea', 250),
('Draft Cocktail', '貝里斯奶油夢境', 'Baileys Irish Creamy Dream', 250),
('Draft Cocktail', '微醺香料熱紅酒', 'Cinnamon Kissed Mulled Wine', 250),
('Draft Cocktail', '今日限量', 'Bartender''s Idea', 200);

-- HAPPY (Wine)
insert into public.menu_items (category, name, name_en, price) values
('HAPPY (Wine)', '葵莎酒莊卡本內紅酒', 'Quasar Selection Cabernet Sauvignon', 1600),
('HAPPY (Wine)', '葵莎酒莊蘇維濃白酒', 'Quasar Selection Sauvignon Blanc', 1600),
('HAPPY (Wine)', '粉紅羽毛氣泡酒', 'Signature Wines Estate Range Moscato', 1600);

-- Sweetie
insert into public.menu_items (category, name, name_en, price) values
('Sweetie', '奶油的起司薄荷檸檬派', 'Cream Cheese Mint Lemon Pie', 250),
('Sweetie', '經典的特濃巧克力蛋糕', 'Signature Rich Chocolate Cake', 250),
('Sweetie', '道地的杏仁酒香提拉米蘇', 'Exquisite Amaretto Tiramisu', 250);
