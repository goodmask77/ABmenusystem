// Script to seed menu items into Supabase
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rpbnexbvxgbjzslrunya.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwYm5leGJ2eGdianpzbHJ1bnlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2NzM3NTUsImV4cCI6MjA3ODI0OTc1NX0.tYWUb6ZmEPGCUYeHnQwE0PHlFBEzu-Mkcqm3kF_tKOg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const menuItems = [
  // New York-Style Pizza
  { category: 'New York-Style Pizza', name: '蒔蘿巧達海鮮濃湯披薩 Seafood Chowder with Dill Pizza', price: 480 },
  { category: 'New York-Style Pizza', name: '墨西哥哥火辣牛肉披薩 Mexico Spicy Beef Pizza', price: 480 },
  { category: 'New York-Style Pizza', name: '日式風章魚燒披薩 Japanese-style Takoyaki Pizza', price: 460 },
  { category: 'New York-Style Pizza', name: '普羅旺斯燉菜披薩 Provençal Ratatouille Pizza', price: 450 },
  { category: 'New York-Style Pizza', name: '四起司胡桃楓糖披薩 Four Cheese Walnut & Maple Syrup Pizza', price: 450 },
  { category: 'New York-Style Pizza', name: '經典紅醬起司臘腸披薩 Classic Tomato Sauce Cheese & Pepperoni Pizza', price: 430 },

  // Salads
  { category: 'Salads', name: '薄荷萊姆海鮮腰果綜合沙拉 Mint & Lime Seafood Salad', price: 480 },
  { category: 'Salads', name: '豐收希臘優格雞肉沙拉 Harvest Greek Yogurt Chicken Salad', price: 430 },
  { category: 'Salads', name: '經典藍起司凱薩沙拉 Classic Blue Cheese Caesar Salad', price: 420 },
  { category: 'Salads', name: '純素蔬果油醋沙拉 Vegan Garden Salad with Balsamic', price: 380 },

  // Soup
  { category: 'Soup', name: '海鮮巧達蛤蠣濃湯 Seafood Clam Chowder', price: 230 },
  { category: 'Soup', name: '地中海番茄牛肋蔬菜湯 Tomato Vegetable Beef Soup', price: 230 },
  { category: 'Soup', name: '卡布奇諾蘑菇濃湯 Cappuccino Mushroom Soup', price: 220 },

  // Appetizers
  { category: 'Appetizers', name: '菠菜青醬藤椒燒烤魷魚 Grilled Squid with Spinach Pesto & Green Sichuan Pepper', price: 360 },
  { category: 'Appetizers', name: '辣味酸奶韃靼鮭魚烤玉米脆片 Spicy Salmon Tartare with Sour Cream & Roasted Tortilla Chips', price: 350 },
  { category: 'Appetizers', name: '阿拉伯香料鷹嘴豆泥大蒜烤餅 Arabic Spiced Hummus with Garlic Flatbread', price: 330 },
  { category: 'Appetizers', name: '羅美斯科帕馬森脆烤節瓜 Crispy Roasted Zucchini with Parmesan & Romesco', price: 320 },
  { category: 'Appetizers', name: '紅椒青檸優格碳烤青花菜 Char-Grilled Broccoli with Paprika Lime Yogurt', price: 300 },
  { category: 'Appetizers', name: '白松露太陽蛋奶油薯泥蛋沙拉 White Truffle Sunny Egg Mashed Potato Salad', price: 300 },

  // All Day Brunch
  { category: 'All Day Brunch', name: '鹽漬生鮭歐姆蛋布里歐 Salt-Cured Salmon & Omelette Brioche', price: 430 },
  { category: 'All Day Brunch', name: '夏威夷海灘雙層純牛肉漢堡 Hawaiian Beach Double Beef Burger', price: 420 },
  { category: 'All Day Brunch', name: '藍起司帶皮雞胸堡 Blue Cheese Chicken Breast Burger', price: 390 },
  { category: 'All Day Brunch', name: '墨西哥辣味烤牛肉塔可碗 Mexican Spicy Grilled Beef Taco Bowl', price: 380 },
  { category: 'All Day Brunch', name: '煙燻火腿班尼迪克蛋 Smoked Ham Eggs Benedict', price: 330 },
  { category: 'All Day Brunch', name: '美式經典早餐 American Classic Brunch', price: 330 },
  { category: 'All Day Brunch', name: '奶油楓糖格子鬆餅 Creamy Maple Waffle', price: 320 },
  { category: 'All Day Brunch', name: '焦糖香蕉格子鬆餅 Caramel Banana Waffle', price: 320 },
  { category: 'All Day Brunch', name: "命中註定出現的那塊法式吐司 I'm the Best French Toast in TAIPEI", price: 320 },

  // La Pasta
  { category: 'La Pasta', name: '明太子鮭魚卵粉紅義大利麵 Mentaiko & Salmon Roe Tomato Pasta', price: 530 },
  { category: 'La Pasta', name: '蒜味檸檬鮮蝦義大利麵 Garlic & Lemon Shrimp Pasta', price: 520 },
  { category: 'La Pasta', name: '絲綢乳酪奶油番茄水管麵 Creamy Tomato Rigatoni with Stracciatella Cheese', price: 480 },
  { category: 'La Pasta', name: '黑松露熟成起司寬扁麵 Black Truffle & Aged Cheese Fettuccine', price: 470 },
  { category: 'La Pasta', name: '開心果菠菜奶油青醬管麵 Pistachio & Spinach Cream Pesto Rigatoni', price: 460 },
  { category: 'La Pasta', name: '日式拿坡里肉醬寬扁麵 Japanese-Style Neapolitan Meat Sauce Fettuccine', price: 430 },

  // Risotto
  { category: 'Risotto', name: '布拉塔起司羅美斯科燉飯 Romesco Risotto with Burrata Cheese', price: 530 },
  { category: 'Risotto', name: '奶油檸檬櫛瓜鮮蝦燉飯 Creamy Lemon Risotto with Zucchini & Shrimp', price: 490 },
  { category: 'Risotto', name: '溫泉蛋松露蘑菇燉飯 Truffle Mushroom Risotto with Onsen Egg', price: 480 },
  { category: 'Risotto', name: '脆洋蔥烤青花青醬燉飯 Pesto Risotto with Roasted Broccoli & Crispy Onions', price: 460 },

  // Main Dishes
  { category: 'Main Dishes', name: 'GFSI杉河農場天然飼養自然牛肋眼 Naturally Raised CEDAR RIVER FARMS Ribeye', price: 1280 },
  { category: 'Main Dishes', name: '榖飼黑豚帶骨法式薯泥豬排 Grain-Fed Black Pork Chop with Pommes Purée', price: 860 },
  { category: 'Main Dishes', name: '24小時爐烤牛排 24-Hour Slow-Roasted Steak', price: 680 },

  // Fried & Loved
  { category: 'Fried & Loved', name: '經典炸物拼盤 A Beach Combo', price: 650 },
  { category: 'Fried & Loved', name: '廣島酥炸生蠔 Crispy Fried Hiroshima Oysters', price: 320 },
  { category: 'Fried & Loved', name: '南洋風味香甜雞翅 Thai Sweet Chili Wings', price: 280 },
  { category: 'Fried & Loved', name: '加拿大楓糖辣雞翅 Maple Hot Syrup Wings', price: 280 },
  { category: 'Fried & Loved', name: '松露帕達諾起司薯條 Grana Padano Truffle Fries', price: 260 },
  { category: 'Fried & Loved', name: '舊金山香蒜薯條 San Francisco Garlic Fries', price: 250 },

  // Soft Drink
  { category: 'Soft Drink', name: '錫蘭紅茶 Ceylon Black Tea', price: 120 },
  { category: 'Soft Drink', name: '茉莉花綠茶 Jasmine Green Tea', price: 120 },
  { category: 'Soft Drink', name: '新鮮薄荷檸檬水 Fresh Mint & Lemon Water', price: 130 },
  { category: 'Soft Drink', name: '桂花蜜檸檬冰紅茶 Honey Lemon Black Tea', price: 150 },
  { category: 'Soft Drink', name: '熟成果香烏龍冰茶 Fruity Oolong Iced Tea', price: 150 },
  { category: 'Soft Drink', name: '龍眼木質高山鮮奶茶 High Mountain Milk Tea', price: 160 },
  { category: 'Soft Drink', name: '原香泰式手標冰奶茶 Royal Thai Silk Milk Tea', price: 160 },
  { category: 'Soft Drink', name: '清爽荔枝香茅氣泡飲 Refreshing Lychee Lemongrass Fizz', price: 160 },
  { category: 'Soft Drink', name: '酸甜鳳梨桂圓氣泡飲 Sweet & Tangy Pineapple Longan Fizz', price: 160 },
  { category: 'Soft Drink', name: '香檳葡萄烏龍茶氣泡飲 Grape Champagne Oolong Sparkling Tea', price: 160 },

  // COFFEE
  { category: 'COFFEE', name: '美式咖啡 Americano', price: 140 },
  { category: 'COFFEE', name: '拿鐵咖啡 Caffè Latte', price: 160 },
  { category: 'COFFEE', name: '越式冰咖啡 Vietnamese Iced Coffee', price: 160 },
  { category: 'COFFEE', name: '椰香白咖啡 Vietnamese White Coffee', price: 160 },
  { category: 'COFFEE', name: '荔枝西西里氣泡咖啡 Lychee Sicilian Sparkling Coffee', price: 160 },

  // Smoothies
  { category: 'Smoothies', name: '莓檸粉果昔 Berry Lemon Pink Smoothie', price: 180 },
  { category: 'Smoothies', name: '熱芒黃果昔 Tropical Mango Yellow Smoothie', price: 180 },
  { category: 'Smoothies', name: '火龍紫果昔 Dragonfruit Purple Smoothie', price: 180 },
  { category: 'Smoothies', name: '翡翠綠果昔 Emerald Green Smoothie', price: 180 },

  // Hot Tea
  { category: 'Hot Tea', name: '南非國寶茶 Rooibos Tea', price: 180 },
  { category: 'Hot Tea', name: '豐收蕎麥茶 Harvest Buckwheat Tea', price: 180 },
  { category: 'Hot Tea', name: '美顏紅棗茶 Rose & Jujube Herbal Tea', price: 180 },
  { category: 'Hot Tea', name: '洋甘菊薄荷茶 Chamomile Mint Tea', price: 180 },
  { category: 'Hot Tea', name: '山楂洛神玫瑰茶 Hawthorn, Rose & Roselle Herbal Tea', price: 180 },

  // Beer
  { category: 'Beer', name: '國產王者十八天 Taiwan No.1 Beer', price: 190 },
  { category: 'Beer', name: '龍洞窖藏拉格 Red Point Lager', price: 230 },

  // Draft Cocktail
  { category: 'Draft Cocktail', name: '長灘芒果冰沙 Mango Mango', price: 250 },
  { category: 'Draft Cocktail', name: '法式伯爵茶 French Earl Grey', price: 250 },
  { category: 'Draft Cocktail', name: '麝香葡萄薄荷莫西多 Muscat Grape Mint Mojito', price: 250 },
  { category: 'Draft Cocktail', name: '水蜜桃青梅桑格利亞 Peach Ume Sangria', price: 250 },
  { category: 'Draft Cocktail', name: '藍甘菊長島冰茶 Blue Chamomile Long Island Iced Tea', price: 250 },
  { category: 'Draft Cocktail', name: '貝里斯奶油夢境 Baileys Irish Creamy Dream', price: 250 },
  { category: 'Draft Cocktail', name: '微醺香料熱紅酒 Cinnamon Kissed Mulled Wine', price: 250 },
  { category: 'Draft Cocktail', name: "今日限量 Bartender's Idea", price: 200 },

  // HAPPY (Wine)
  { category: 'HAPPY (Wine)', name: '葵莎酒莊卡本內紅酒 Quasar Selection Cabernet Sauvignon', price: 1600 },
  { category: 'HAPPY (Wine)', name: '葵莎酒莊蘇維濃白酒 Quasar Selection Sauvignon Blanc', price: 1600 },
  { category: 'HAPPY (Wine)', name: '粉紅羽毛氣泡酒 Signature Wines Estate Range Moscato', price: 1600 },

  // Sweetie
  { category: 'Sweetie', name: '奶油的起司薄荷檸檬派 Cream Cheese Mint Lemon Pie', price: 250 },
  { category: 'Sweetie', name: '經典的特濃巧克力蛋糕 Signature Rich Chocolate Cake', price: 250 },
  { category: 'Sweetie', name: '道地的杏仁酒香提拉米蘇 Exquisite Amaretto Tiramisu', price: 250 },
];

async function seedMenuItems() {
  console.log('Clearing existing menu items...');
  
  // Delete all existing items
  const { error: deleteError } = await supabase
    .from('menu_items')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows
  
  if (deleteError) {
    console.error('Error deleting existing items:', deleteError);
    // Continue anyway - table might not exist or be empty
  }

  console.log('Inserting new menu items...');
  
  // Insert in batches of 50
  const batchSize = 50;
  for (let i = 0; i < menuItems.length; i += batchSize) {
    const batch = menuItems.slice(i, i + batchSize);
    const { error: insertError } = await supabase
      .from('menu_items')
      .insert(batch);
    
    if (insertError) {
      console.error(`Error inserting batch ${i / batchSize + 1}:`, insertError);
    } else {
      console.log(`Inserted batch ${i / batchSize + 1} (${batch.length} items)`);
    }
  }

  // Verify the count
  const { count, error: countError } = await supabase
    .from('menu_items')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('Error counting items:', countError);
  } else {
    console.log(`\nTotal menu items in database: ${count}`);
  }

  console.log('\nDone!');
}

seedMenuItems();
