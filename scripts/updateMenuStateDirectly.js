// Script to directly update menu_state with the new menu data
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rpbnexbvxgbjzslrunya.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwYm5leGJ2eGdianpzbHJ1bnlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2NzM3NTUsImV4cCI6MjA3ODI0OTc1NX0.tYWUb6ZmEPGCUYeHnQwE0PHlFBEzu-Mkcqm3kF_tKOg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const MENU_STATE_KEY = 'MENU_STATE';

// New menu categories with items
const newCategories = [
  {
    id: 'ny-style-pizza',
    name: 'NY-Style Pizza',
    items: [
      { id: 'pizza-1', name: '蒔蘿巧達海鮮濃湯披薩', enName: 'Seafood Chowder with Dill Pizza', price: 480, isNew: false, isHot: false },
      { id: 'pizza-2', name: '墨西哥哥火辣牛肉披薩', enName: 'Mexico Spicy Beef Pizza', price: 480, isNew: false, isHot: false },
      { id: 'pizza-3', name: '日式風章魚燒披薩', enName: 'Japanese-style Takoyaki Pizza', price: 460, isNew: false, isHot: false },
      { id: 'pizza-4', name: '普羅旺斯燉菜披薩', enName: 'Provençal Ratatouille Pizza', price: 450, isNew: false, isHot: false },
      { id: 'pizza-5', name: '四起司胡桃楓糖披薩', enName: 'Four Cheese Walnut & Maple Syrup Pizza', price: 450, isNew: false, isHot: false },
      { id: 'pizza-6', name: '經典紅醬起司臘腸披薩', enName: 'Classic Tomato Sauce Cheese & Pepperoni Pizza', price: 430, isNew: false, isHot: false },
    ]
  },
  {
    id: 'salads-soup',
    name: 'Salads & Soup',
    items: [
      { id: 'salad-1', name: '薄荷萊姆海鮮腰果綜合沙拉', enName: 'Mint & Lime Seafood Salad', price: 480, isNew: false, isHot: false },
      { id: 'salad-2', name: '豐收希臘優格雞肉沙拉', enName: 'Harvest Greek Yogurt Chicken Salad', price: 430, isNew: false, isHot: false },
      { id: 'salad-3', name: '經典藍起司凱薩沙拉', enName: 'Classic Blue Cheese Caesar Salad', price: 420, isNew: false, isHot: false },
      { id: 'salad-4', name: '純素蔬果油醋沙拉', enName: 'Vegan Garden Salad with Balsamic', price: 380, isNew: true, isHot: false },
      { id: 'soup-1', name: '海鮮巧達蛤蠣濃湯', enName: 'Seafood Clam Chowder', price: 230, isNew: false, isHot: false },
      { id: 'soup-2', name: '地中海番茄牛肋蔬菜湯', enName: 'Tomato Vegetable Beef Soup', price: 230, isNew: false, isHot: false },
      { id: 'soup-3', name: '卡布奇諾蘑菇濃湯', enName: 'Cappuccino Mushroom Soup', price: 220, isNew: false, isHot: false },
    ]
  },
  {
    id: 'appetizers',
    name: 'Appetizers',
    items: [
      { id: 'app-1', name: '菠菜青醬藤椒燒烤魷魚', enName: 'Grilled Squid with Spinach Pesto & Green Sichuan Pepper', price: 360, isNew: false, isHot: false },
      { id: 'app-2', name: '辣味酸奶韃靼鮭魚烤玉米脆片', enName: 'Spicy Salmon Tartare with Sour Cream & Roasted Tortilla Chips', price: 350, isNew: false, isHot: false },
      { id: 'app-3', name: '阿拉伯香料鷹嘴豆泥大蒜烤餅', enName: 'Arabic Spiced Hummus with Garlic Flatbread', price: 330, isNew: false, isHot: false },
      { id: 'app-4', name: '羅美斯科帕馬森脆烤節瓜', enName: 'Crispy Roasted Zucchini with Parmesan & Romesco', price: 320, isNew: false, isHot: false },
      { id: 'app-5', name: '紅椒青檸優格碳烤青花菜', enName: 'Char-Grilled Broccoli with Paprika Lime Yogurt', price: 300, isNew: false, isHot: false },
      { id: 'app-6', name: '白松露太陽蛋奶油薯泥蛋沙拉', enName: 'White Truffle Sunny Egg Mashed Potato Salad', price: 300, isNew: false, isHot: false },
    ]
  },
  {
    id: 'all-day-brunch',
    name: 'All Day Brunch',
    items: [
      { id: 'brunch-1', name: '鹽漬生鮭歐姆蛋布里歐', enName: 'Salt-Cured Salmon & Omelette Brioche', price: 430, isNew: false, isHot: false },
      { id: 'brunch-2', name: '夏威夷海灘雙層純牛肉漢堡', enName: 'Hawaiian Beach Double Beef Burger', price: 420, isNew: false, isHot: false },
      { id: 'brunch-3', name: '藍起司帶皮雞胸堡', enName: 'Blue Cheese Chicken Breast Burger', price: 390, isNew: false, isHot: false },
      { id: 'brunch-4', name: '墨西哥辣味烤牛肉塔可碗', enName: 'Mexican Spicy Grilled Beef Taco Bowl', price: 380, isNew: false, isHot: false },
      { id: 'brunch-5', name: '煙燻火腿班尼迪克蛋', enName: 'Smoked Ham Eggs Benedict', price: 330, isNew: false, isHot: false },
      { id: 'brunch-6', name: '美式經典早餐', enName: 'American Classic Brunch', price: 330, isNew: false, isHot: false },
      { id: 'brunch-7', name: '奶油楓糖格子鬆餅', enName: 'Creamy Maple Waffle', price: 320, isNew: false, isHot: false },
      { id: 'brunch-8', name: '焦糖香蕉格子鬆餅', enName: 'Caramel Banana Waffle', price: 320, isNew: false, isHot: false },
      { id: 'brunch-9', name: '命中註定出現的那塊法式吐司', enName: "I'm the Best French Toast in TAIPEI", price: 320, isNew: false, isHot: false },
    ]
  },
  {
    id: 'la-pasta',
    name: 'La Pasta',
    items: [
      { id: 'pasta-1', name: '明太子鮭魚卵粉紅義大利麵', enName: 'Mentaiko & Salmon Roe Tomato Pasta', price: 530, isNew: false, isHot: false },
      { id: 'pasta-2', name: '蒜味檸檬鮮蝦義大利麵', enName: 'Garlic & Lemon Shrimp Pasta', price: 520, isNew: false, isHot: false },
      { id: 'pasta-3', name: '絲綢乳酪奶油番茄水管麵', enName: 'Creamy Tomato Rigatoni with Stracciatella Cheese', price: 480, isNew: false, isHot: false },
      { id: 'pasta-4', name: '黑松露熟成起司寬扁麵', enName: 'Black Truffle & Aged Cheese Fettuccine', price: 470, isNew: false, isHot: false },
      { id: 'pasta-5', name: '開心果菠菜奶油青醬管麵', enName: 'Pistachio & Spinach Cream Pesto Rigatoni', price: 460, isNew: false, isHot: false },
      { id: 'pasta-6', name: '日式拿坡里肉醬寬扁麵', enName: 'Japanese-Style Neapolitan Meat Sauce Fettuccine', price: 430, isNew: false, isHot: false },
    ]
  },
  {
    id: 'risotto-main-dishes',
    name: 'Risotto & Main Dishes',
    items: [
      { id: 'risotto-1', name: '布拉塔起司羅美斯科燉飯', enName: 'Romesco Risotto with Burrata Cheese', price: 530, isNew: false, isHot: false },
      { id: 'risotto-2', name: '奶油檸檬櫛瓜鮮蝦燉飯', enName: 'Creamy Lemon Risotto with Zucchini & Shrimp', price: 490, isNew: false, isHot: false },
      { id: 'risotto-3', name: '溫泉蛋松露蘑菇燉飯', enName: 'Truffle Mushroom Risotto with Onsen Egg', price: 480, isNew: false, isHot: false },
      { id: 'risotto-4', name: '脆洋蔥烤青花青醬燉飯', enName: 'Pesto Risotto with Roasted Broccoli & Crispy Onions', price: 460, isNew: false, isHot: false },
      { id: 'main-1', name: 'GFSI杉河農場天然飼養自然牛肋眼', enName: 'Naturally Raised CEDAR RIVER FARMS Ribeye', price: 1280, isNew: false, isHot: true },
      { id: 'main-2', name: '榖飼黑豚帶骨法式薯泥豬排', enName: 'Grain-Fed Black Pork Chop with Pommes Purée', price: 860, isNew: false, isHot: false },
      { id: 'main-3', name: '24小時爐烤牛排', enName: '24-Hour Slow-Roasted Steak', price: 680, isNew: false, isHot: false },
    ]
  },
  {
    id: 'fried-loved',
    name: 'Fried & Loved',
    items: [
      { id: 'fried-1', name: '經典炸物拼盤', enName: 'A Beach Combo', price: 650, isNew: false, isHot: false },
      { id: 'fried-2', name: '廣島酥炸生蠔', enName: 'Crispy Fried Hiroshima Oysters', price: 320, isNew: false, isHot: false },
      { id: 'fried-3', name: '南洋風味香甜雞翅', enName: 'Thai Sweet Chili Wings', price: 280, isNew: false, isHot: false },
      { id: 'fried-4', name: '加拿大楓糖辣雞翅', enName: 'Maple Hot Syrup Wings', price: 280, isNew: false, isHot: false },
      { id: 'fried-5', name: '松露帕達諾起司薯條', enName: 'Grana Padano Truffle Fries', price: 260, isNew: false, isHot: false },
      { id: 'fried-6', name: '舊金山香蒜薯條', enName: 'San Francisco Garlic Fries', price: 250, isNew: false, isHot: false },
    ]
  },
  {
    id: 'soft-drink',
    name: 'Soft Drink',
    items: [
      { id: 'drink-1', name: '錫蘭紅茶', enName: 'Ceylon Black Tea', price: 120, isNew: false, isHot: false },
      { id: 'drink-2', name: '茉莉花綠茶', enName: 'Jasmine Green Tea', price: 120, isNew: false, isHot: false },
      { id: 'drink-3', name: '新鮮薄荷檸檬水', enName: 'Fresh Mint & Lemon Water', price: 130, isNew: false, isHot: false },
      { id: 'drink-4', name: '桂花蜜檸檬冰紅茶', enName: 'Honey Lemon Black Tea', price: 150, isNew: false, isHot: false },
      { id: 'drink-5', name: '熟成果香烏龍冰茶', enName: 'Fruity Oolong Iced Tea', price: 150, isNew: false, isHot: false },
      { id: 'drink-6', name: '龍眼木質高山鮮奶茶', enName: 'High Mountain Milk Tea', price: 160, isNew: false, isHot: false },
      { id: 'drink-7', name: '原香泰式手標冰奶茶', enName: 'Royal Thai Silk Milk Tea', price: 160, isNew: false, isHot: false },
      { id: 'drink-8', name: '清爽荔枝香茅氣泡飲', enName: 'Refreshing Lychee Lemongrass Fizz', price: 160, isNew: false, isHot: false },
      { id: 'drink-9', name: '酸甜鳳梨桂圓氣泡飲', enName: 'Sweet & Tangy Pineapple Longan Fizz', price: 160, isNew: false, isHot: false },
      { id: 'drink-10', name: '香檳葡萄烏龍茶氣泡飲', enName: 'Grape Champagne Oolong Sparkling Tea', price: 160, isNew: false, isHot: false },
    ]
  },
  {
    id: 'coffee',
    name: 'COFFEE',
    items: [
      { id: 'coffee-1', name: '美式咖啡', enName: 'Americano', price: 140, isNew: false, isHot: false },
      { id: 'coffee-2', name: '拿鐵咖啡', enName: 'Caffè Latte', price: 160, isNew: false, isHot: false },
      { id: 'coffee-3', name: '越式冰咖啡', enName: 'Vietnamese Iced Coffee', price: 160, isNew: false, isHot: false },
      { id: 'coffee-4', name: '椰香白咖啡', enName: 'Vietnamese White Coffee', price: 160, isNew: false, isHot: false },
      { id: 'coffee-5', name: '荔枝西西里氣泡咖啡', enName: 'Lychee Sicilian Sparkling Coffee', price: 160, isNew: false, isHot: false },
    ]
  },
  {
    id: 'smoothies',
    name: 'Smoothies',
    items: [
      { id: 'smoothie-1', name: '莓檸粉果昔', enName: 'Berry Lemon Pink Smoothie', price: 180, isNew: false, isHot: false },
      { id: 'smoothie-2', name: '熱芒黃果昔', enName: 'Tropical Mango Yellow Smoothie', price: 180, isNew: false, isHot: false },
      { id: 'smoothie-3', name: '火龍紫果昔', enName: 'Dragonfruit Purple Smoothie', price: 180, isNew: false, isHot: false },
      { id: 'smoothie-4', name: '翡翠綠果昔', enName: 'Emerald Green Smoothie', price: 180, isNew: false, isHot: false },
    ]
  },
  {
    id: 'hot-tea',
    name: 'Hot Tea',
    items: [
      { id: 'tea-1', name: '南非國寶茶', enName: 'Rooibos Tea', price: 180, isNew: false, isHot: false },
      { id: 'tea-2', name: '豐收蕎麥茶', enName: 'Harvest Buckwheat Tea', price: 180, isNew: false, isHot: false },
      { id: 'tea-3', name: '美顏紅棗茶', enName: 'Rose & Jujube Herbal Tea', price: 180, isNew: false, isHot: false },
      { id: 'tea-4', name: '洋甘菊薄荷茶', enName: 'Chamomile Mint Tea', price: 180, isNew: false, isHot: false },
      { id: 'tea-5', name: '山楂洛神玫瑰茶', enName: 'Hawthorn, Rose & Roselle Herbal Tea', price: 180, isNew: false, isHot: false },
    ]
  },
  {
    id: 'beer',
    name: 'Beer',
    items: [
      { id: 'beer-1', name: '國產王者十八天', enName: 'Taiwan No.1 Beer', price: 190, isNew: false, isHot: false },
      { id: 'beer-2', name: '龍洞窖藏拉格', enName: 'Red Point Lager', price: 230, isNew: false, isHot: false },
    ]
  },
  {
    id: 'draft-cocktail',
    name: 'Draft Cocktail',
    items: [
      { id: 'cocktail-1', name: '長灘芒果冰沙', enName: 'Mango Mango', price: 250, isNew: false, isHot: false },
      { id: 'cocktail-2', name: '法式伯爵茶', enName: 'French Earl Grey', price: 250, isNew: false, isHot: false },
      { id: 'cocktail-3', name: '麝香葡萄薄荷莫西多', enName: 'Muscat Grape Mint Mojito', price: 250, isNew: false, isHot: false },
      { id: 'cocktail-4', name: '水蜜桃青梅桑格利亞', enName: 'Peach Ume Sangria', price: 250, isNew: false, isHot: false },
      { id: 'cocktail-5', name: '藍甘菊長島冰茶', enName: 'Blue Chamomile Long Island Iced Tea', price: 250, isNew: false, isHot: false },
      { id: 'cocktail-6', name: '貝里斯奶油夢境', enName: 'Baileys Irish Creamy Dream', price: 250, isNew: false, isHot: false },
      { id: 'cocktail-7', name: '微醺香料熱紅酒', enName: 'Cinnamon Kissed Mulled Wine', price: 250, isNew: false, isHot: false },
      { id: 'cocktail-8', name: '今日限量', enName: "Bartender's Idea", price: 200, isNew: false, isHot: false },
    ]
  },
  {
    id: 'happy-wine',
    name: 'HAPPY (Wine)',
    items: [
      { id: 'wine-1', name: '葵莎酒莊卡本內紅酒', enName: 'Quasar Selection Cabernet Sauvignon', price: 1600, isNew: false, isHot: false },
      { id: 'wine-2', name: '葵莎酒莊蘇維濃白酒', enName: 'Quasar Selection Sauvignon Blanc', price: 1600, isNew: false, isHot: false },
      { id: 'wine-3', name: '粉紅羽毛氣泡酒', enName: 'Signature Wines Estate Range Moscato', price: 1600, isNew: false, isHot: false },
    ]
  },
  {
    id: 'sweetie',
    name: 'Sweetie',
    items: [
      { id: 'sweet-1', name: '奶油的起司薄荷檸檬派', enName: 'Cream Cheese Mint Lemon Pie', price: 250, isNew: false, isHot: false },
      { id: 'sweet-2', name: '經典的特濃巧克力蛋糕', enName: 'Signature Rich Chocolate Cake', price: 250, isNew: false, isHot: false },
      { id: 'sweet-3', name: '道地的杏仁酒香提拉米蘇', enName: 'Exquisite Amaretto Tiramisu', price: 250, isNew: false, isHot: false },
    ]
  }
];

async function updateMenuState() {
  console.log('Fetching existing menu_state...');
  
  // Fetch existing menu_state to preserve other settings
  const { data: existingState, error: stateError } = await supabase
    .from('menu_state')
    .select('payload')
    .eq('name', MENU_STATE_KEY)
    .maybeSingle();

  if (stateError) {
    console.error('Error fetching menu_state:', stateError);
    return;
  }

  let payload;
  if (existingState && existingState.payload) {
    // Update existing payload with new categories
    payload = { ...existingState.payload };
    payload.menu = payload.menu || {};
    payload.menu.categories = newCategories;
    payload.updatedAt = new Date().toISOString();
    console.log('Updating existing menu_state with new categories...');
  } else {
    // Create new payload
    payload = {
      menu: {
        categories: newCategories
      },
      updatedAt: new Date().toISOString()
    };
    console.log('Creating new menu_state...');
  }

  // Upsert to menu_state
  const { error: upsertError } = await supabase
    .from('menu_state')
    .upsert({
      name: MENU_STATE_KEY,
      payload: payload,
      updated_at: new Date().toISOString()
    }, { onConflict: 'name' });

  if (upsertError) {
    console.error('Error updating menu_state:', upsertError);
    return;
  }

  // Count total items
  const totalItems = newCategories.reduce((sum, cat) => sum + cat.items.length, 0);

  console.log('\n✅ Successfully updated menu_state!');
  console.log(`Total categories: ${newCategories.length}`);
  console.log(`Total items: ${totalItems}`);
  newCategories.forEach(cat => {
    console.log(`  - ${cat.name}: ${cat.items.length} items`);
  });
}

updateMenuState();
