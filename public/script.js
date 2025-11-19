// 全域變數
let isAdminMode = false;
let cart = [];
let peopleCount = 1;
let tableCount = 1;
let editingItem = null;
let activeCategory = 'all';
let editingCategory = null;

// Sortable 實例追蹤
let sortableInstances = [];

// 歷史紀錄排序狀態
let historySort = {
    field: 'date',
    direction: 'desc'
};

const MENU_STATE_KEY = 'MENU_STATE';
let supabaseClient = null;
let supabaseSyncQueue = Promise.resolve();
let supabaseInitialized = false;
let syncStatusTimer = null;

let menuData = {
    categories: [
        {
            id: 'fried-loved',
            name: 'Fried & Loved',
            items: [
                {
                    id: 'garlic-fries',
                    name: '☘️舊金山香蒜薯條',
                    nameEn: 'San Francisco Garlic Fries',
                    price: 220,
                    description: ''
                },
                {
                    id: 'truffle-fries',
                    name: '松露帕達諾起司薯條',
                    nameEn: 'Grana Padano Truffle Fries',
                    price: 230,
                    description: ''
                },
                {
                    id: 'thai-sweet-wings',
                    name: '南洋風味香甜雞翅',
                    nameEn: 'Thai Sweet Chili Wings',
                    price: 230,
                    description: ''
                },
                {
                    id: 'maple-hot-wings',
                    name: '加拿大楓糖辣雞翅',
                    nameEn: 'Maple Hot Syrup Wings',
                    price: 230,
                    description: ''
                },
                {
                    id: 'hiroshima-oysters',
                    name: '廣島酥炸生蠔',
                    nameEn: 'Crispy Fried Hiroshima Oysters',
                    price: 250,
                    description: ''
                },
                {
                    id: 'tartare-shrimp',
                    name: '雞尾酒琥珀塔塔蝦',
                    nameEn: 'Tartare Shrimp with Cocktail Sauce',
                    price: 250,
                    description: ''
                },
                {
                    id: 'golden-aji',
                    name: '日式黃金竹莢魚',
                    nameEn: 'Crispy Golden Aji',
                    price: 250,
                    description: ''
                },
                {
                    id: 'beach-combo',
                    name: '經典炸物拼盤',
                    nameEn: 'A Beach Combo',
                    price: 650,
                    description: ''
                },
                {
                    id: 'seafood-combo',
                    name: '海鮮炸物拼盤',
                    nameEn: 'Seafood Combo',
                    price: 680,
                    description: ''
                }
            ]
        },
        {
            id: 'salads-soup',
            name: 'Salads & Soup',
            items: [
                {
                    id: 'vegan-garden-salad',
                    name: '☘️純素蔬果油醋沙拉',
                    nameEn: 'Vegan Garden Salad with Balsamic',
                    price: 300,
                    description: ''
                },
                {
                    id: 'silly-soba-salad',
                    name: '小傻瓜蕎麥麵沙拉',
                    nameEn: 'Silly Soba Noodle Salad',
                    price: 350,
                    description: ''
                },
                {
                    id: 'caesar-salad',
                    name: '經典藍起司凱薩沙拉',
                    nameEn: 'Classic Blue Cheese Caesar Salad',
                    price: 350,
                    description: ''
                },
                {
                    id: 'warm-squid-salad',
                    name: '海味中卷時蔬溫沙拉',
                    nameEn: 'Warm Squid & Seasonal Vegetable Salad',
                    price: 380,
                    description: ''
                },
                {
                    id: 'mint-lime-seafood',
                    name: '薄荷萊姆海鮮腰果綜合沙拉',
                    nameEn: 'Mint & Lime Seafood Salad',
                    price: 390,
                    description: ''
                },
                {
                    id: 'greek-quinoa-chicken',
                    name: '希臘彩虹藜麥雞肉沙拉',
                    nameEn: 'Greek  Quinoa Chicken Salad',
                    price: 360,
                    description: ''
                },
                {
                    id: 'tomato-beef-soup',
                    name: '地中海番茄牛肋蔬菜湯',
                    nameEn: 'Tomato Vegetable Beef Soup',
                    price: 220,
                    description: ''
                },
                {
                    id: 'seafood-clam-chowder',
                    name: '海鮮巧達蛤蠣濃湯',
                    nameEn: 'Seafood Clam Chowder',
                    price: 230,
                    description: ''
                }
            ]
        },
        {
            id: 'ny-style-pizza',
            name: 'NY-Style Pizza',
            items: [
                {
                    id: 'classic-pepperoni',
                    name: '經典紅醬起司臘腸披薩',
                    nameEn: 'Classic Tomato Sauce Cheese & Pepperoni Pizza',
                    price: 430,
                    description: ''
                },
                {
                    id: 'seafood-chowder',
                    name: '蒔蘿巧達海鮮濃湯披薩',
                    nameEn: 'Seafood Chowder with Dill Pizza',
                    price: 470,
                    description: ''
                },
                {
                    id: 'amigo-beef',
                    name: '阿米哥火辣牛肉披薩',
                    nameEn: 'Amigo Spicy Beef Pizza',
                    price: 480,
                    description: ''
                },
                {
                    id: 'provencal-ratatouille',
                    name: '☘️普羅旺斯燉菜披薩',
                    nameEn: 'Provençal Ratatouille Pizza',
                    price: 450,
                    description: ''
                },
                {
                    id: 'takoyaki-pizza',
                    name: '日式風章魚燒披薩',
                    nameEn: 'Japanese-style Takoyaki Pizza',
                    price: 460,
                    description: ''
                },
                {
                    id: 'four-cheese-walnut',
                    name: '☘️四起司胡桃楓糖披薩',
                    nameEn: 'Four Cheese Walnut & Maple Syrup Pizza',
                    price: 450,
                    description: ''
                }
            ]
        },
        {
            id: 'la-pasta',
            name: 'La Pasta',
            items: [
                {
                    id: 'garlic-lemon-shrimp',
                    name: '蒜味檸檬鮮蝦義大利麵',
                    nameEn: 'Garlic Lemon Shrimp Pasta',
                    price: 450,
                    description: ''
                },
                {
                    id: 'mentaiko-salmon',
                    name: '明太子鮭魚卵粉紅義大利麵',
                    nameEn: 'Creamy Mentaiko Salmon Pasta',
                    price: 480,
                    description: ''
                },
                {
                    id: 'oregano-vegetable',
                    name: '☘️奧勒岡慢烤時蔬義大利麵',
                    nameEn: 'Oregano-Roasted Vegetable Pasta',
                    price: 430,
                    description: ''
                },
                {
                    id: 'truffle-cheese',
                    name: '黑松露熟成起司義大利麵',
                    nameEn: 'Black Truffle Aged Cheese Pasta',
                    price: 460,
                    description: '可做☘️蛋奶素'
                },
                {
                    id: 'cream-tomato-chicken',
                    name: '奶油起司番茄雞肉義大利麵',
                    nameEn: 'Creamy Cheese Tomato Chicken Pasta',
                    price: 430,
                    description: ''
                }
            ]
        },
        {
            id: 'soft-drink',
            name: 'Soft Drink',
            items: [
                {
                    id: 'honey-lemon-black-tea',
                    name: '桂花蜜檸檬冰紅茶(壺)',
                    nameEn: 'Honey Lemon Black Tea',
                    price: 600,
                    description: ''
                },
                {
                    id: 'fruity-oolong-iced-tea',
                    name: '熟成果香烏龍冰茶(壺)',
                    nameEn: 'Fruity Oolong Iced Tea',
                    price: 600,
                    description: ''
                },
                {
                    id: 'royal-thai-silk-milk-tea',
                    name: '原香泰式手標冰奶茶(壺)',
                    nameEn: 'Royal Thai Silk Milk Tea',
                    price: 600,
                    description: ''
                },
                {
                    id: 'pineapple-longan-fizz',
                    name: '酸甜鳳梨桂圓氣泡飲(壺)',
                    nameEn: 'Sweet & Tangy Pineapple Longan Fizz',
                    price: 600,
                    description: ''
                },
                {
                    id: 'grape-champagne-oolong',
                    name: '香檳葡萄烏龍茶氣泡飲(壺)',
                    nameEn: 'Grape Champagne Oolong Sparkling Tea',
                    price: 600,
                    description: ''
                },
                {
                    id: 'ceylon-black-tea',
                    name: '錫蘭紅茶(壺)',
                    nameEn: 'Ceylon Black Tea',
                    price: 400,
                    description: ''
                },
                {
                    id: 'jasmine-green-tea',
                    name: '茉莉花綠茶(壺)',
                    nameEn: 'Jasmine Green Tea',
                    price: 400,
                    description: ''
                },
                {
                    id: 'fresh-mint-lemon-water',
                    name: '新鮮薄荷檸檬水(壺)',
                    nameEn: 'Fresh Mint & Lemon Water',
                    price: 400,
                    description: ''
                },
                {
                    id: 'harvest-buckwheat-tea',
                    name: '豐收蕎麥茶(壺)',
                    nameEn: 'Harvest Buckwheat Tea',
                    price: 400,
                    description: ''
                },
                {
                    id: 'iced-americano',
                    name: '美式冰咖啡(壺)',
                    nameEn: 'Iced Americano',
                    price: 400,
                    description: ''
                }
            ]
        },
        {
            id: 'risotto-main',
            name: 'Risotto & Main Dishes',
            items: [
                {
                    id: 'truffle-mushroom-risotto',
                    name: '溫泉蛋松露蘑菇燉飯',
                    nameEn: 'Truffle Mushroom Risotto with Soft-Boiled Egg',
                    price: 450,
                    description: '可做☘️蛋奶素'
                },
                {
                    id: 'red-prawn-risotto',
                    name: '生食級紅蝦蝦膏起司燉飯',
                    nameEn: 'Sashimi-Grade Red Prawn Roe Risotto with Cheese',
                    price: 480,
                    description: ''
                },
                {
                    id: 'lemon-zucchini-risotto',
                    name: '奶油檸檬櫛瓜鮮蝦燉飯',
                    nameEn: 'Creamy Lemon Zucchini Shrimp Risotto',
                    price: 460,
                    description: ''
                },
                {
                    id: 'black-pork-chop',
                    name: '榖飼黑豚帶骨法式薯泥豬排',
                    nameEn: 'Grain-Fed Black Pork Chop with Pommes Purée',
                    price: 680,
                    description: ''
                },
                {
                    id: 'cedar-river-ribeye',
                    name: 'GFSI杉河農場天然飼養自然牛肋眼',
                    nameEn: 'Naturally Raised CEDAR RIVER FARMS Ribeye',
                    price: 990,
                    description: ''
                }
            ]
        },
        {
            id: 'sweetie',
            name: 'Sweetie',
            items: [
                {
                    id: 'cream-cheese-pie',
                    name: '奶油的起司薄荷檸檬派',
                    nameEn: 'Cream Cheese Mint Lemon Pie',
                    price: 250,
                    description: ''
                },
                {
                    id: 'chocolate-cake',
                    name: '☘️經典的特濃巧克力蛋糕',
                    nameEn: 'Signature Rich Chocolate Cake',
                    price: 250,
                    description: ''
                },
                {
                    id: 'amaretto-tiramisu',
                    name: '道地的杏仁酒香提拉米蘇',
                    nameEn: 'Exquisite Amaretto Tiramisu',
                    price: 250,
                    description: ''
                },
                {
                    id: 'best-french-toast-sweet',
                    name: '☘️命中註定出現的那塊法式吐司',
                    nameEn: "I'm the Best French Toast in TAIPEI",
                    price: 280,
                    description: ''
                }
            ]
        },
        {
            id: 'happy',
            name: 'HAPPY',
            items: [
                {
                    id: 'quasar-cabernet-sauvignon',
                    name: '葵莎酒莊卡本內紅酒',
                    nameEn: 'Quasar Selection Cabernet Sauvignon',
                    price: 1600,
                    description: ''
                },
                {
                    id: 'quasar-sauvignon-blanc',
                    name: '葵莎酒莊蘇維濃白酒',
                    nameEn: 'Quasar Selection Sauvignon Blanc',
                    price: 1600,
                    description: ''
                },
                {
                    id: 'signature-moscato',
                    name: '粉紅羽毛氣泡酒',
                    nameEn: 'Signature Wines Estate Range Moscato',
                    price: 1600,
                    description: ''
                },
                {
                    id: 'craft-beer-cocktail',
                    name: '飲品｜18天生啤｜調酒任選',
                    nameEn: 'Craft Beer｜Cocktail',
                    price: 230,
                    description: ''
                },
                {
                    id: 'happy-more-buy-3-get-1',
                    name: '快樂一點 買三送一',
                    nameEn: 'Happy More buy 3 get 1 free',
                    price: 168,
                    description: ''
                },
                {
                    id: '100-cup-drinks',
                    name: '100杯調酒',
                    nameEn: '100 cup',
                    price: 15000,
                    description: ''
                }
            ]
        },
        {
            id: 'all-day-brunch',
            name: 'All Day Brunch',
            items: [
                {
                    id: 'american-classic',
                    name: '美式經典早餐',
                    nameEn: 'American Classic Brunch',
                    price: 350,
                    description: ''
                },
                {
                    id: 'soul-chicken-waffle',
                    name: '靈魂炸雞鬆餅',
                    nameEn: 'Soul Fried Chicken Waffle',
                    price: 350,
                    description: ''
                },
                {
                    id: 'hawaiian-burger',
                    name: '夏威夷海灘漢堡',
                    nameEn: 'Hawaiian Beach Burger',
                    price: 350,
                    description: ''
                },
                {
                    id: 'eggs-benedict',
                    name: '煙燻火腿班尼迪克蛋',
                    nameEn: 'Smoked Ham Eggs Benedict',
                    price: 350,
                    description: ''
                },
                {
                    id: 'salmon-omelette',
                    name: '鹽漬生鮭歐姆蛋布里歐',
                    nameEn: 'Salt-Cured Salmon & Omelette Brioche',
                    price: 350,
                    description: ''
                },
                {
                    id: 'spicy-chicken-quesadilla',
                    name: '辣味花生醬開心果起司雞肉薄餅',
                    nameEn: 'Spicy Peanut Pistachio Chicken Quesadilla',
                    price: 350,
                    description: ''
                },
                {
                    id: 'jalapeno-beef-tacos',
                    name: '墨西哥辣椒香脆牛肉塔可',
                    nameEn: 'Crispy Jalapeño Beef Cheek Tacos',
                    price: 350,
                    description: ''
                },
                {
                    id: 'maple-pancakes',
                    name: '☘️奶油楓糖美式煎餅',
                    nameEn: 'Buttery Maple Syrup Pancakes',
                    price: 350,
                    description: ''
                },
                {
                    id: 'waffles-combo',
                    name: '☘️格子鬆餅# 巧克力莓果│焦糖香蕉',
                    nameEn: 'Waffles – Chocolate Berry / Caramel Banana',
                    price: 350,
                    description: ''
                },
                {
                    id: 'best-french-toast',
                    name: '☘️命中註定出現的那塊法式吐司',
                    nameEn: "I'm the Best French Toast in TAIPEI",
                    price: 350,
                    description: ''
                }
            ]
        }
    ],
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
};

// DOM 元素
const elements = {
    toggleMode: document.getElementById('toggleMode'),
    syncCloud: document.getElementById('syncCloud'),
    addCategory: document.getElementById('addCategory'),
    importMenu: document.getElementById('importMenu'),
    exportCartExcel: document.getElementById('exportCartExcel'),
    exportCartImage: document.getElementById('exportCartImage'),
    saveMenu: document.getElementById('saveMenu'),
    loadMenu: document.getElementById('loadMenu'),
    categoryTabs: document.getElementById('categoryTabs'),
    menuCategories: document.getElementById('menuCategories'),
    cartItems: document.getElementById('cartItems'),
    peopleCountInput: document.getElementById('peopleCount'),
    decreasePeople: document.getElementById('decreasePeople'),
    increasePeople: document.getElementById('increasePeople'),
    tableCountInput: document.getElementById('tableCount'),
    decreaseTable: document.getElementById('decreaseTable'),
    increaseTable: document.getElementById('increaseTable'),
    clearCart: document.getElementById('clearCart'),
    subtotal: document.getElementById('subtotal'),
    serviceFee: document.getElementById('serviceFee'),
    total: document.getElementById('total'),
    perPerson: document.getElementById('perPerson'),
    totalItems: document.getElementById('totalItems')
};
// 初始化應用程式
document.addEventListener('DOMContentLoaded', async function() {
    await prepareInitialState();
    initializeApp();
    bindEvents();
});

function initializeApp() {
    // 渲染介面
    renderMenu();
    renderCart();
    updateCartSummary();
    
    // 初始化桌數輸入框
    elements.tableCountInput.value = tableCount;
    
    // 設定拖曳排序（在渲染完成後）
    setTimeout(() => {
        setupSortable();
    }, 100);
    
    // 延遲綁定控制按鈕事件（確保DOM完全載入）
    setTimeout(() => {
        // 清除按鈕
        const clearButton = document.getElementById('clearCart');
        if (clearButton) {
            clearButton.addEventListener('click', clearCart);
            console.log('延遲綁定清除菜單按鈕成功');
        }
        
        // 人數控制按鈕
        const decreasePeople = document.getElementById('decreasePeople');
        const increasePeople = document.getElementById('increasePeople');
        if (decreasePeople && increasePeople) {
            decreasePeople.addEventListener('click', () => changePeopleCount(-1));
            increasePeople.addEventListener('click', () => changePeopleCount(1));
            console.log('延遲綁定人數控制按鈕成功');
        }
        
        // 桌數控制按鈕
        const decreaseTable = document.getElementById('decreaseTable');
        const increaseTable = document.getElementById('increaseTable');
        if (decreaseTable && increaseTable) {
            decreaseTable.addEventListener('click', () => changeTableCount(-1));
            increaseTable.addEventListener('click', () => changeTableCount(1));
            console.log('延遲綁定桌數控制按鈕成功');
        }
    }, 100);
}

async function prepareInitialState() {
    const localRestored = restoreFromLocalStorage();
    await initSupabaseClient();
    const remoteRestored = await loadStateFromSupabase();
    if (!remoteRestored && !localRestored) {
        // 將預設資料同步到本機與遠端，確保後續操作有一致基準
        saveToStorage();
    }
}

async function fetchSupabaseConfig() {
    const sources = ['/api/env', 'env.json', '/env.json'];
    for (const source of sources) {
        try {
            const response = await fetch(source);
            if (!response.ok) continue;
            const data = await response.json();
            if (data?.supabaseUrl && data?.supabaseAnonKey) {
                return data;
            }
        } catch (error) {
            console.warn(`讀取 Supabase 設定失敗 (${source})：`, error);
        }
    }
    return null;
}

async function initSupabaseClient() {
    if (supabaseInitialized) {
        return supabaseClient;
    }
    if (typeof window === 'undefined' || !window.supabase) {
        console.error('Supabase SDK 未載入');
        return null;
    }
    try {
        const config = await fetchSupabaseConfig();
        if (!config) {
            throw new Error('無法取得 Supabase 設定');
        }
        const { supabaseUrl, supabaseAnonKey } = config;
        supabaseClient = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
        supabaseInitialized = true;
        return supabaseClient;
    } catch (error) {
        console.error('初始化 Supabase 失敗：', error);
        return null;
    }
}

async function loadStateFromSupabase() {
    if (!supabaseClient) return false;
    try {
        const { data, error } = await supabaseClient
            .from('menu_state')
            .select('payload')
            .eq('name', MENU_STATE_KEY)
            .maybeSingle();
        if (error) {
            if (error.code !== 'PGRST116') {
                console.error('讀取 Supabase 狀態失敗：', error);
            }
            return false;
        }
        if (!data || !data.payload) {
            return false;
        }
        applyStatePayload(data.payload);
        localStorage.setItem('currentMenu', JSON.stringify(data.payload));
        return true;
    } catch (error) {
        console.error('處理 Supabase 狀態時發生錯誤：', error);
        return false;
    }
}

function applyStatePayload(payload) {
    if (payload?.menu?.categories) {
        menuData = {
            ...menuData,
            ...payload.menu,
            categories: payload.menu.categories
        };
    }
    cart = Array.isArray(payload?.cart) ? payload.cart : [];
    peopleCount = Number(payload?.peopleCount) > 0 ? payload.peopleCount : 1;
    tableCount = Number(payload?.tableCount) > 0 ? payload.tableCount : 1;
}

function restoreFromLocalStorage() {
    try {
        const raw = localStorage.getItem('currentMenu');
        if (!raw) return false;
        const payload = JSON.parse(raw);
        applyStatePayload(payload);
        return true;
    } catch (error) {
        console.warn('載入本機儲存資料失敗：', error);
        return false;
    }
}

function getCurrentStatePayload() {
    return {
        menu: menuData,
        cart: cart,
        peopleCount: peopleCount,
        tableCount: tableCount,
        updatedAt: new Date().toISOString()
    };
}

function showSyncStatus(message, status = 'pending') {
    if (typeof document === 'undefined') return;
    let toast = document.getElementById('syncStatusToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'syncStatusToast';
        toast.className = 'sync-status-toast';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.remove('status-pending', 'status-success', 'status-error');
    toast.classList.add(`status-${status}`);
    toast.classList.add('visible');
    if (status === 'pending') {
        if (syncStatusTimer) {
            clearTimeout(syncStatusTimer);
            syncStatusTimer = null;
        }
        return;
    }
    if (syncStatusTimer) {
        clearTimeout(syncStatusTimer);
    }
    syncStatusTimer = setTimeout(() => {
        toast.classList.remove('visible');
        syncStatusTimer = null;
    }, 2000);
}

function syncStateToSupabase(statePayload) {
    supabaseSyncQueue = supabaseSyncQueue
        .then(async () => {
            const client = supabaseClient || await initSupabaseClient();
            if (!client) {
                throw new Error('Supabase 客戶端尚未就緒');
            }
            showSyncStatus('儲存中…', 'pending');
            await persistStateToSupabase(statePayload);
            showSyncStatus('儲存完成', 'success');
        })
        .catch(error => {
            console.error('Supabase 同步排程錯誤：', error);
            showSyncStatus('儲存失敗，請稍後再試', 'error');
        });
}

async function persistStateToSupabase(statePayload) {
    try {
        const { error } = await supabaseClient
            .from('menu_state')
            .upsert({ name: MENU_STATE_KEY, payload: statePayload, updated_at: new Date().toISOString() }, { onConflict: 'name' });
        if (error) {
            throw error;
        }
    } catch (error) {
        console.error('同步 Supabase 失敗：', error);
        throw error;
    }
}

function bindEvents() {
    // 模式切換
    elements.toggleMode.addEventListener('click', toggleMode);
    if (elements.syncCloud) {
        elements.syncCloud.addEventListener('click', manualCloudSave);
    }
    
    // 類別管理
    elements.addCategory.addEventListener('click', showCategoryModal);
    
    // 匯入匯出
    elements.importMenu.addEventListener('click', showImportModal);
    elements.exportCartExcel.addEventListener('click', exportCartToExcel);
    elements.exportCartImage.addEventListener('click', exportCartToImage);
    
    // 儲存載入
    elements.saveMenu.addEventListener('click', saveMenuToStorage);
    elements.loadMenu.addEventListener('click', showHistoryModal);
    
    // 人數控制
    if (elements.decreasePeople && elements.increasePeople) {
        elements.decreasePeople.addEventListener('click', () => {
            console.log('人數減少按鈕被點擊');
            changePeopleCount(-1);
        });
        elements.increasePeople.addEventListener('click', () => {
            console.log('人數增加按鈕被點擊');
            changePeopleCount(1);
        });
        console.log('人數控制按鈕事件已綁定');
    } else {
        console.error('人數控制按鈕元素未找到');
    }
    
    if (elements.peopleCountInput) {
        elements.peopleCountInput.addEventListener('change', updatePeopleCount);
    }
    
    // 桌數控制
    if (elements.decreaseTable && elements.increaseTable) {
        elements.decreaseTable.addEventListener('click', () => {
            console.log('桌數減少按鈕被點擊');
            changeTableCount(-1);
        });
        elements.increaseTable.addEventListener('click', () => {
            console.log('桌數增加按鈕被點擊');
            changeTableCount(1);
        });
        console.log('桌數控制按鈕事件已綁定');
    } else {
        console.error('桌數控制按鈕元素未找到');
    }
    
    if (elements.tableCountInput) {
        elements.tableCountInput.addEventListener('change', updateTableCount);
    }
    
    // 清除購物車
    if (elements.clearCart) {
        elements.clearCart.addEventListener('click', clearCart);
        console.log('清除菜單按鈕事件已綁定');
    } else {
        console.error('清除菜單按鈕元素未找到');
        // 嘗試直接查找元素
        const clearButton = document.getElementById('clearCart');
        if (clearButton) {
            clearButton.addEventListener('click', clearCart);
            console.log('直接綁定清除菜單按鈕成功');
        }
    }
    
    // 模態對話框
    bindModalEvents();
}

function setupSortable() {
    // 先銷毀所有現有的 Sortable 實例
    destroySortableInstances();
    
    // 只在後台模式下啟用拖曳排序
    if (!isAdminMode) return;
    
    // 類別標籤排序
    const categoryTabs = document.getElementById('categoryTabs');
    if (categoryTabs) {
        const instance = new Sortable(categoryTabs, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            dragClass: 'sortable-drag',
            filter: '.category-tab.active', // 防止拖拽 "全部" 標籤
            onEnd: function(evt) {
                // 跳過 "全部" 標籤 (index 0)
                if (evt.oldIndex > 0 && evt.newIndex > 0) {
                    reorderCategories(evt.oldIndex - 1, evt.newIndex - 1);
                }
            }
        });
        sortableInstances.push(instance);
    }
    
    // 菜單項目內排序（在每個類別內）
    const menuCategories = document.getElementById('menuCategories');
    if (menuCategories) {
        // 為每個類別設置項目排序
        setupCategoryItemSortable();
    }
    
    // 購物車排序
    if (elements.cartItems) {
        const instance = new Sortable(elements.cartItems, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            dragClass: 'sortable-drag',
            filter: '.empty-cart',
            onEnd: function(evt) {
                reorderCartItems(evt.oldIndex, evt.newIndex);
            }
        });
        sortableInstances.push(instance);
    }
}

function setupCategoryItemSortable() {
    // 為每個類別的項目列表設置拖曳排序
    menuData.categories.forEach(category => {
        const itemsList = document.getElementById(`category-${category.id}`);
        if (itemsList) {
            const instance = new Sortable(itemsList, {
                animation: 150,
                ghostClass: 'sortable-ghost',
                dragClass: 'sortable-drag',
                group: 'menu-items',
                onEnd: function(evt) {
                    reorderCategoryItems(category.id, evt.oldIndex, evt.newIndex);
                }
            });
            sortableInstances.push(instance);
        }
    });
}

// 銷毀所有 Sortable 實例
function destroySortableInstances() {
    sortableInstances.forEach(instance => {
        if (instance && instance.destroy) {
            instance.destroy();
        }
    });
    sortableInstances = [];
}

// 模式切換
function toggleMode() {
    isAdminMode = !isAdminMode;
    const adminControls = document.querySelectorAll('.admin-controls');
    const itemControls = document.querySelectorAll('.item-controls');
    const modeBtn = elements.toggleMode;
    
    if (isAdminMode) {
        adminControls.forEach(el => el.style.display = 'flex');
        itemControls.forEach(el => el.style.display = 'block');
        modeBtn.innerHTML = '<i class="fas fa-toggle-on"></i><span>切換至前台</span>';
        modeBtn.classList.remove('btn-mode');
        modeBtn.classList.add('btn-primary');
        // 啟用拖曳排序
        setupSortable();
    } else {
        adminControls.forEach(el => el.style.display = 'none');
        itemControls.forEach(el => el.style.display = 'none');
        modeBtn.innerHTML = '<i class="fas fa-toggle-off"></i><span>切換至後台</span>';
        modeBtn.classList.remove('btn-primary');
        modeBtn.classList.add('btn-mode');
        // 禁用拖曳排序（銷毀所有 Sortable 實例）
        destroySortableInstances();
    }
}

// 類別管理
function showCategoryModal() {
    editingCategory = null;
    document.getElementById('categoryName').value = '';
    document.getElementById('categoryModal').style.display = 'block';
}

function addCategory() {
    const categoryName = document.getElementById('categoryName').value.trim();
    if (!categoryName) {
        alert('請輸入類別名稱');
        return;
    }
    
    const newCategory = {
        id: generateId(),
        name: categoryName,
        items: []
    };
    
    menuData.categories.push(newCategory);
    renderMenu();
    document.getElementById('categoryModal').style.display = 'none';
    saveToStorage();
}

function editCategory(categoryId) {
    const category = menuData.categories.find(c => c.id === categoryId);
    if (!category) return;
    
    editingCategory = categoryId;
    document.getElementById('categoryName').value = category.name;
    document.getElementById('categoryModal').style.display = 'block';
}

function updateCategory() {
    if (!editingCategory) return addCategory();
    
    const categoryName = document.getElementById('categoryName').value.trim();
    if (!categoryName) {
        alert('請輸入類別名稱');
        return;
    }
    
    const category = menuData.categories.find(c => c.id === editingCategory);
    if (category) {
        category.name = categoryName;
        renderMenu();
        document.getElementById('categoryModal').style.display = 'none';
        saveToStorage();
    }
}

function deleteCategory(categoryId) {
    if (confirm('確定要刪除此類別？此操作無法復原。')) {
        menuData.categories = menuData.categories.filter(c => c.id !== categoryId);
        // 同時移除購物車中該類別的品項
        cart = cart.filter(item => {
            const category = menuData.categories.find(c => 
                c.items.some(i => i.id === item.id)
            );
            return category !== undefined;
        });
        renderMenu();
        renderCart();
        updateCartSummary();
        saveToStorage();
    }
}

// 品項管理
function showItemModal(categoryId = null) {
    editingItem = { categoryId, itemId: null };
    document.getElementById('itemModalTitle').textContent = '新增品項';
    document.getElementById('itemName').value = '';
    document.getElementById('itemNameEn').value = '';
    document.getElementById('itemDescription').value = '';
    document.getElementById('itemPrice').value = '';
    document.getElementById('itemModal').style.display = 'block';
}

function editItem(categoryId, itemId) {
    const category = menuData.categories.find(c => c.id === categoryId);
    const item = category?.items.find(i => i.id === itemId);
    if (!item) return;
    
    editingItem = { categoryId, itemId };
    document.getElementById('itemModalTitle').textContent = '編輯品項';
    document.getElementById('itemName').value = item.name;
    document.getElementById('itemNameEn').value = item.nameEn || '';
    document.getElementById('itemDescription').value = item.description || '';
    document.getElementById('itemPrice').value = item.price;
    document.getElementById('itemModal').style.display = 'block';
}

function saveItem() {
    const name = document.getElementById('itemName').value.trim();
    const nameEn = document.getElementById('itemNameEn').value.trim();
    const description = document.getElementById('itemDescription').value.trim();
    const price = parseFloat(document.getElementById('itemPrice').value);
    
    if (!name || isNaN(price) || price < 0) {
        alert('請輸入有效的品項名稱和價格');
        return;
    }
    
    const category = menuData.categories.find(c => c.id === editingItem.categoryId);
    if (!category) return;
    
    if (editingItem.itemId) {
        // 編輯現有品項
        const item = category.items.find(i => i.id === editingItem.itemId);
        if (item) {
            item.name = name;
            item.nameEn = nameEn;
            item.description = description;
            item.price = price;
            
            // 更新購物車中的品項資訊
            cart.forEach(cartItem => {
                if (cartItem.id === editingItem.itemId) {
                    cartItem.name = name;
                    cartItem.nameEn = nameEn;
                    cartItem.price = price;
                }
            });
        }
    } else {
        // 新增品項
        const newItem = {
            id: generateId(),
            name,
            nameEn,
            description,
            price
        };
        category.items.push(newItem);
    }
    
    renderMenu();
    renderCart();
    updateCartSummary();
    document.getElementById('itemModal').style.display = 'none';
    saveToStorage();
}

function deleteItem(categoryId, itemId) {
    if (confirm('確定要刪除此品項？')) {
        const category = menuData.categories.find(c => c.id === categoryId);
        if (category) {
            category.items = category.items.filter(i => i.id !== itemId);
            // 從購物車移除
            cart = cart.filter(item => item.id !== itemId);
            renderMenu();
            renderCart();
            updateCartSummary();
            saveToStorage();
        }
    }
}

// 購物車功能
function addToCart(categoryId, itemId) {
    const category = menuData.categories.find(c => c.id === categoryId);
    const item = category?.items.find(i => i.id === itemId);
    if (!item) return;
    
    const existingItem = cart.find(cartItem => cartItem.id === itemId);
    if (existingItem) {
        // 如果已存在，移除該品項（按需求：再點一次消除該品項）
        removeFromCart(itemId);
    } else {
        // 新增到購物車
        const cartItem = {
            id: itemId,
            name: item.name,
            nameEn: item.nameEn,
            price: item.price,
            quantity: tableCount, // 使用桌數作為初始數量
            categoryId: categoryId
        };
        cart.push(cartItem);
    }
    
    renderCart();
    renderMenu(); // 重新渲染菜單以更新選中狀態
    updateCartSummary();
    saveToStorage();
}

function removeFromCart(itemId) {
    cart = cart.filter(item => item.id !== itemId);
    renderCart();
    renderMenu(); // 重新渲染菜單以更新選中狀態
    updateCartSummary();
    saveToStorage();
}

function updateCartItemQuantity(itemId, quantity) {
    const cartItem = cart.find(item => item.id === itemId);
    if (cartItem) {
        if (quantity <= 0) {
            removeFromCart(itemId);
        } else {
            cartItem.quantity = quantity;
            renderCart();
            updateCartSummary();
            saveToStorage();
        }
    }
}

function changePeopleCount(delta) {
    console.log(`changePeopleCount 被呼叫，delta: ${delta}, 目前人數: ${peopleCount}`);
    const newCount = peopleCount + delta;
    if (newCount >= 1 && newCount <= 99) {
        peopleCount = newCount;
        elements.peopleCountInput.value = peopleCount;
        console.log(`人數已更改為: ${peopleCount}`);
        updateCartSummary();
        saveToStorage();
    }
}

function updatePeopleCount() {
    const count = parseInt(elements.peopleCountInput.value);
    if (count >= 1 && count <= 99) {
        peopleCount = count;
        updateCartSummary();
        saveToStorage();
    } else {
        elements.peopleCountInput.value = peopleCount;
    }
}

// 桌數控制
function changeTableCount(delta) {
    const newCount = tableCount + delta;
    if (newCount >= 1 && newCount <= 99) {
        const oldTableCount = tableCount;
        tableCount = newCount;
        elements.tableCountInput.value = tableCount;
        
        // 調整購物車中所有品項的數量
        cart.forEach(item => {
            item.quantity = newCount;
        });
        
        renderCart();
        updateCartSummary();
        saveToStorage();
    }
}

function updateTableCount() {
    const count = parseInt(elements.tableCountInput.value);
    if (count >= 1 && count <= 99) {
        const oldTableCount = tableCount;
        tableCount = count;
        
        // 調整購物車中所有品項的數量
        cart.forEach(item => {
            item.quantity = count;
        });
        
        renderCart();
        updateCartSummary();
        saveToStorage();
    } else {
        elements.tableCountInput.value = tableCount;
    }
}

// 清除購物車
function clearCart() {
    if (cart.length === 0) {
        return;
    }
    
    cart = [];
    renderCart();
    renderMenu(); // 重新渲染菜單以移除選中狀態
    updateCartSummary();
    saveToStorage();
}

// 計算購物車摘要
function updateCartSummary() {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const serviceFee = Math.round(subtotal * 0.1); // 10% 服務費，四捨五入至整數
    const total = subtotal + serviceFee;
    const perPerson = Math.round(total / peopleCount); // 人均，四捨五入至整數
    const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0); // 總餐點數量
    
    console.log(`計算詳情 - 小計: $${subtotal}, 服務費: $${serviceFee}, 總計: $${total}, 人數: ${peopleCount}, 人均: $${perPerson}`);
    
    elements.subtotal.textContent = `$${subtotal}`;
    elements.serviceFee.textContent = `$${serviceFee}`;
    elements.total.textContent = `$${total}`;
    elements.perPerson.textContent = `$${perPerson}`;
    elements.totalItems.textContent = totalItemsCount;
}

// 排序功能
function reorderCategories(oldIndex, newIndex) {
    const [movedCategory] = menuData.categories.splice(oldIndex, 1);
    menuData.categories.splice(newIndex, 0, movedCategory);
    saveToStorage();
}

function reorderCartItems(oldIndex, newIndex) {
    const [movedItem] = cart.splice(oldIndex, 1);
    cart.splice(newIndex, 0, movedItem);
    saveToStorage();
}

function reorderCategoryItems(categoryId, oldIndex, newIndex) {
    const category = menuData.categories.find(c => c.id === categoryId);
    if (category) {
        const [movedItem] = category.items.splice(oldIndex, 1);
        category.items.splice(newIndex, 0, movedItem);
        saveToStorage();
    }
}

// 搜尋功能
function searchItems(query) {
    const searchTerm = query.toLowerCase().trim();
    const categories = document.querySelectorAll('.category');
    
    categories.forEach(categoryEl => {
        const items = categoryEl.querySelectorAll('.menu-item');
        let hasVisibleItems = false;
        
        items.forEach(itemEl => {
            const name = itemEl.querySelector('.item-name').textContent.toLowerCase();
            const nameEn = itemEl.querySelector('.item-name-en')?.textContent.toLowerCase() || '';
            const description = itemEl.querySelector('.item-description')?.textContent.toLowerCase() || '';
            
            const isVisible = !searchTerm || 
                name.includes(searchTerm) || 
                nameEn.includes(searchTerm) || 
                description.includes(searchTerm);
                
            itemEl.style.display = isVisible ? 'block' : 'none';
            if (isVisible) hasVisibleItems = true;
        });
        
        categoryEl.style.display = !searchTerm || hasVisibleItems ? 'block' : 'none';
    });
}

// 批量匯入功能
function showImportModal() {
    document.getElementById('importText').value = '';
    document.getElementById('importModal').style.display = 'block';
}

function processImport() {
    const importText = document.getElementById('importText').value.trim();
    const importMode = document.querySelector('input[name="importMode"]:checked').value;
    
    if (!importText) {
        alert('請輸入匯入資料');
        return;
    }
    
    try {
        const result = parseImportText(importText, importMode);
        if (result.success) {
            renderMenu();
            document.getElementById('importModal').style.display = 'none';
            saveToStorage();
            alert(`成功匯入 ${result.categoriesAdded} 個類別，${result.itemsAdded} 個品項`);
        } else {
            alert(`匯入失敗：${result.error}`);
        }
    } catch (error) {
        alert(`匯入失敗：${error.message}`);
    }
}

function parseImportText(text, mode) {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    let currentCategory = null;
    let categoriesAdded = 0;
    let itemsAdded = 0;
    
    for (const line of lines) {
        // 檢查是否為類別行（不包含空格分隔的價格）
        const parts = line.split(/\s+/);
        if (parts.length === 1 || (parts.length > 1 && isNaN(parseFloat(parts[parts.length - 1])))) {
            // 這是類別
            const categoryName = line;
            let category = menuData.categories.find(c => c.name === categoryName);
            
            if (!category) {
                category = {
                    id: generateId(),
                    name: categoryName,
                    items: []
                };
                menuData.categories.push(category);
                categoriesAdded++;
            }
            currentCategory = category;
        } else if (parts.length >= 2 && currentCategory) {
            // 這是品項
            const price = parseFloat(parts[parts.length - 1]);
            if (isNaN(price)) continue;
            
            const nameParts = parts.slice(0, -1);
            let name, nameEn;
            
            if (nameParts.length === 1) {
                name = nameParts[0];
                nameEn = '';
            } else {
                name = nameParts[0];
                nameEn = nameParts.slice(1).join(' ');
            }
            
            const existingItem = currentCategory.items.find(item => item.name === name);
            
            if (existingItem) {
                if (mode === 'update') {
                    existingItem.nameEn = nameEn;
                    existingItem.price = price;
                }
                // 如果是 skip 模式，則不做任何事
            } else {
                const newItem = {
                    id: generateId(),
                    name,
                    nameEn,
                    price,
                    description: ''
                };
                currentCategory.items.push(newItem);
                itemsAdded++;
            }
        }
    }
    
    return { success: true, categoriesAdded, itemsAdded };
}

// 按類別排序購物車項目的輔助函數
function getSortedCartByCategory() {
    // 按類別順序分組購物車項目
    const cartByCategory = {};
    
    // 將購物車項目按類別分組
    cart.forEach(item => {
        if (!cartByCategory[item.categoryId]) {
            cartByCategory[item.categoryId] = [];
        }
        cartByCategory[item.categoryId].push(item);
    });
    
    // 按照menuData.categories的當前順序排序
    let sortedCart = [];
    menuData.categories.forEach(category => {
        const categoryId = category.id;
        if (cartByCategory[categoryId] && cartByCategory[categoryId].length > 0) {
            sortedCart = sortedCart.concat(cartByCategory[categoryId]);
        }
    });
    
    return sortedCart;
}

// 匯出購物車功能
function exportCartToExcel() {
    if (cart.length === 0) {
        alert('購物車是空的，無法匯出');
        return;
    }
    
    const workbook = XLSX.utils.book_new();
    
    // 使用按類別排序的購物車項目
    const sortedCart = getSortedCartByCategory();
    
    // 購物車工作表
    const cartData_flat = sortedCart.map(item => ({
        '品項名稱': item.name,
        '英文名稱': item.nameEn || '',
        '單價': item.price,
        '數量': item.quantity,
        '小計': item.price * item.quantity
    }));
    
    // 加入摘要
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const serviceFee = Math.round(subtotal * 0.1);
    const total = subtotal + serviceFee;
    const perPerson = Math.round(total / peopleCount);
    
    cartData_flat.push({});
    cartData_flat.push({ '品項名稱': '小計', '小計': subtotal });
    cartData_flat.push({ '品項名稱': '服務費 (10%)', '小計': serviceFee });
    cartData_flat.push({ '品項名稱': '總計', '小計': total });
    cartData_flat.push({ '品項名稱': `人均 (${peopleCount}人)`, '小計': perPerson });
    
    const cartSheet = XLSX.utils.json_to_sheet(cartData_flat);
    XLSX.utils.book_append_sheet(workbook, cartSheet, '購物車明細');
    
    const fileName = `購物車明細_${formatDate(new Date())}.xlsx`;
    XLSX.writeFile(workbook, fileName);
}

function exportCartToImage() {
    if (cart.length === 0) {
        alert('購物車是空的，無法匯出');
        return;
    }
    
    const container = document.createElement('div');
    container.style.cssText = `
        background: white;
        width: 800px;
        padding: 30px;
        font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        color: #333;
        box-sizing: border-box;
        margin: 0 auto;
    `;
    container.innerHTML = generateCartImageContent();
    
    // 暫時添加到頁面但隱藏
    container.style.position = 'fixed';
    container.style.top = '-9999px';
    container.style.left = '-9999px';
    document.body.appendChild(container);
    
    html2canvas(container, {
        backgroundColor: 'white',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        width: 860,
        height: container.scrollHeight,
        scrollX: 0,
        scrollY: 0,
        logging: false
    }).then(canvas => {
        const link = document.createElement('a');
        link.download = `餐廳訂單_${formatDate(new Date())}.png`;
        link.href = canvas.toDataURL('image/png', 1.0);
        link.click();
        
        document.body.removeChild(container);
    }).catch(error => {
        console.error('圖片匯出失敗:', error);
        document.body.removeChild(container);
        alert('圖片匯出失敗，請稍後再試');
    });
}

function generateCartImageContent() {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const serviceFee = Math.round(subtotal * 0.1);
    const total = subtotal + serviceFee;
    const perPerson = Math.round(total / peopleCount);
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    let html = `
        <!-- 標題區塊 -->
        <div style="text-align: center; margin-bottom: 25px; border-bottom: 3px solid #2c3e50; padding-bottom: 15px;">
            <h1 style="color: #2c3e50; margin: 0 0 8px 0; font-size: 2.2rem; font-weight: 700; letter-spacing: -1px;">A Beach 101&Pizza</h1>
            <div style="color: #7f8c8d; font-size: 1.0rem; font-weight: 500;">Restaurant Order Details</div>
            <div style="color: #95a5a6; font-size: 1.0rem; margin-top: 6px;">訂單時間：${formatDate(new Date())} | 人數：${peopleCount}人 | 桌數：${tableCount}桌</div>
        </div>

        <!-- 訂單資訊卡片 -->
        <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 18px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #007bff;">
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; text-align: center;">
                <div>
                    <div style="font-size: 1.6rem; font-weight: 700; color: #007bff;">${totalItems}</div>
                    <div style="color: #6c757d; font-size: 0.9rem; margin-top: 2px;">總餐點數</div>
                </div>
                <div>
                    <div style="font-size: 1.6rem; font-weight: 700; color: #28a745;">${peopleCount}</div>
                    <div style="color: #6c757d; font-size: 0.9rem; margin-top: 2px;">用餐人數</div>
                </div>
                <div>
                    <div style="font-size: 1.6rem; font-weight: 700; color: #fd7e14;">${tableCount}</div>
                    <div style="color: #6c757d; font-size: 0.9rem; margin-top: 2px;">桌數</div>
                </div>
            </div>
        </div>

        <!-- 餐點明細 -->
        <div style="margin-bottom: 20px;">
            <h2 style="color: #495057; font-size: 1.3rem; margin-bottom: 12px; font-weight: 600; border-bottom: 2px solid #dee2e6; padding-bottom: 6px;">
                <span style="background: #007bff; color: white; padding: 3px 10px; border-radius: 15px; font-size: 0.85rem; margin-right: 10px;">餐點</span>
                訂購明細
            </h2>
    `;
    
    // 使用按類別排序的購物車項目
    const sortedCart = getSortedCartByCategory();
    
    sortedCart.forEach((item, index) => {
        const isVegetarian = item.name.includes('☘️');
        html += `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 15px; margin-bottom: 4px; background: ${index % 2 === 0 ? '#ffffff' : '#f8f9fa'}; border-radius: 6px; border: 1px solid #e9ecef;">
                <div style="flex: 1; display: flex; align-items: center; max-width: 75%;">
                    ${isVegetarian ? '<span style="background: #28a745; color: white; padding: 2px 6px; border-radius: 8px; font-size: 0.7rem; margin-right: 8px;">素食</span>' : ''}
                    <div style="flex: 1;">
                        <div style="font-weight: 600; color: #2c3e50; font-size: 1.2rem; line-height: 1.3;">${item.name.replace('☘️', '')}</div>
                        <div style="color: #6c757d; font-size: 1.0rem;">單價 $${item.price} × ${item.quantity}份</div>
                    </div>
                </div>
                <div style="font-weight: 700; color: #2c3e50; font-size: 1.3rem; text-align: right; min-width: 80px;">$${item.price * item.quantity}</div>
            </div>
        `;
    });
    
    html += `
        </div>

        <!-- 費用計算 -->
        <div style="background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%); color: white; padding: 20px; border-radius: 8px; margin-top: 10px;">
            <h3 style="margin: 0 0 15px 0; font-size: 1.2rem; font-weight: 600; text-align: center; opacity: 0.9;">費用明細 Cost Breakdown</h3>
            
            <div style="background: rgba(255, 255, 255, 0.1); padding: 15px; border-radius: 6px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 1.2rem;">
                    <span>餐點小計 Subtotal</span>
                    <span style="font-weight: 600;">$${subtotal}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 1.2rem; color: rgba(255, 255, 255, 0.8);">
                    <span>服務費 Service Fee (10%)</span>
                    <span style="font-weight: 600;">$${serviceFee}</span>
                </div>
                <div style="border-top: 2px solid rgba(255, 255, 255, 0.3); padding-top: 10px; display: flex; justify-content: space-between; font-size: 1.5rem; font-weight: 700;">
                    <span>總計 Total Amount</span>
                    <span style="color: #f39c12;">$${total}</span>
                </div>
                <div style="border-top: 1px solid rgba(255, 255, 255, 0.2); margin-top: 10px; padding-top: 10px; display: flex; justify-content: space-between; font-size: 1.3rem; font-weight: 600; color: #3498db;">
                    <span>人均費用 Per Person (${peopleCount}人)</span>
                    <span>$${perPerson}</span>
                </div>
            </div>
        </div>

        <!-- 頁尾 -->
        <div style="text-align: center; margin-top: 20px; padding-top: 15px; border-top: 1px solid #dee2e6;">
            <div style="color: #95a5a6; font-size: 0.9rem; line-height: 1.4;">
                <div style="font-weight: 600; margin-bottom: 3px;">感謝您的用餐 • Thank you for dining with us</div>
                <div>訂單產生時間：${new Date().toLocaleString('zh-TW')}</div>
            </div>
        </div>
    `;
    
    return html;
}

// 儲存與載入
function saveMenuToStorage() {
    // 更新儲存模態框的資訊
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0) * 1.1; // 含服務費
    
    document.getElementById('saveMenuItemCount').textContent = totalItems;
    document.getElementById('saveMenuTotal').textContent = Math.round(total);
    document.getElementById('saveMenuPeople').textContent = peopleCount;
    
    // 設定預設菜單名稱
    const defaultName = `A Beach 菜單_${formatDate(new Date())}`;
    document.getElementById('menuName').value = defaultName;
    
    // 顯示儲存模態框
    document.getElementById('saveMenuModal').style.display = 'block';
}

function confirmSaveMenu() {
    const menuName = document.getElementById('menuName').value.trim();
    if (!menuName) {
        alert('請輸入菜單名稱');
        return;
    }
    
    const menuVersion = {
        ...menuData,
        cart: cart,
        peopleCount: peopleCount,
        tableCount: tableCount,
        savedAt: new Date().toISOString(),
        name: menuName
    };
    
    const savedMenus = JSON.parse(localStorage.getItem('savedMenus') || '[]');
    savedMenus.unshift(menuVersion);
    
    // 保持最多 50 個版本
    if (savedMenus.length > 50) {
        savedMenus.splice(50);
    }
    
    localStorage.setItem('savedMenus', JSON.stringify(savedMenus));
    localStorage.setItem('currentMenu', JSON.stringify(menuVersion));
    
    // 關閉模態框
    document.getElementById('saveMenuModal').style.display = 'none';
    
    alert(`菜單「${menuName}」已成功儲存！`);
}

function saveToStorage() {
    const currentData = getCurrentStatePayload();
    localStorage.setItem('currentMenu', JSON.stringify(currentData));
    syncStateToSupabase(currentData);
}

async function manualCloudSave() {
    const client = supabaseClient || await initSupabaseClient();
    if (!client) {
        showSyncStatus('無法連線至雲端，請稍後再試', 'error');
        return;
    }
    saveToStorage();
}

function showHistoryModal() {
    document.getElementById('historyModal').style.display = 'block';
    renderHistoryList();
    
    // 確保Modal事件正確綁定
    bindModalEvents();
}

function renderHistoryList() {
    const savedMenus = JSON.parse(localStorage.getItem('savedMenus') || '[]');
    const historyList = document.getElementById('historyList');
    const searchTerm = document.getElementById('historySearch').value.toLowerCase();
    const sortBy = historySort.field;
    
    let filteredMenus = savedMenus.filter(menu => {
        // 搜尋菜單名稱
        if (menu.name && menu.name.toLowerCase().includes(searchTerm)) {
            return true;
        }
        
        // 搜尋購物車中的餐點名稱
        if (menu.cart && menu.cart.length > 0) {
            return menu.cart.some(item => 
                item.name.toLowerCase().includes(searchTerm) ||
                (item.nameEn && item.nameEn.toLowerCase().includes(searchTerm))
            );
        }
        
        return false;
    });
    
    // 排序
    filteredMenus.sort((a, b) => {
        let result = 0;
        switch (sortBy) {
            case 'price':
                const aTotal = calculateMenuTotal(a);
                const bTotal = calculateMenuTotal(b);
                const aPerPerson = Math.round(aTotal / (a.peopleCount || 1));
                const bPerPerson = Math.round(bTotal / (b.peopleCount || 1));
                result = bPerPerson - aPerPerson;
                break;
            case 'date':
                result = new Date(b.savedAt) - new Date(a.savedAt);
                break;
            case 'name':
                result = (a.name || '').localeCompare(b.name || '');
                break;
            case 'people':
                result = (b.peopleCount || 1) - (a.peopleCount || 1);
                break;
            case 'tables':
                result = (b.tableCount || 1) - (a.tableCount || 1);
                break;
            case 'total':
                result = calculateMenuTotal(b) - calculateMenuTotal(a);
                break;
            case 'items':
                result = (b.cart?.length || 0) - (a.cart?.length || 0);
                break;
            default:
                result = 0;
        }
        return historySort.direction === 'asc' ? -result : result;
    });
    
    if (filteredMenus.length === 0) {
        historyList.innerHTML = '<div class="empty-history">沒有找到相符的歷史記錄</div>';
        return;
    }
    
    historyList.innerHTML = `
        <table class="history-table">
            <thead>
                <tr>
                    <th class="sortable ${historySort.field === 'name' ? 'sort-' + historySort.direction : ''}" onclick="sortHistoryBy('name')">菜單名稱</th>
                    <th class="sortable ${historySort.field === 'date' ? 'sort-' + historySort.direction : ''}" onclick="sortHistoryBy('date')">日期時間</th>
                    <th class="sortable ${historySort.field === 'items' ? 'sort-' + historySort.direction : ''}" onclick="sortHistoryBy('items')">餐點數</th>
                    <th class="sortable ${historySort.field === 'people' ? 'sort-' + historySort.direction : ''}" onclick="sortHistoryBy('people')">人數</th>
                    <th class="sortable ${historySort.field === 'tables' ? 'sort-' + historySort.direction : ''}" onclick="sortHistoryBy('tables')">桌數</th>
                    <th class="sortable ${historySort.field === 'total' ? 'sort-' + historySort.direction : ''}" onclick="sortHistoryBy('total')">總金額</th>
                    <th class="sortable ${historySort.field === 'price' ? 'sort-' + historySort.direction : ''}" onclick="sortHistoryBy('price')">人均</th>
                    <th>餐點內容</th>
                    <th>操作</th>
                </tr>
            </thead>
            <tbody>
                ${filteredMenus.map((menu, originalIndex) => {
                    const total = calculateMenuTotal(menu);
                    const perPerson = Math.round(total / (menu.peopleCount || 1));
                    const originalMenuIndex = savedMenus.indexOf(menu);
                    
                    // 生成購物車項目預覽
                    const cartPreview = menu.cart && menu.cart.length > 0 
                        ? menu.cart.slice(0, 2).map(item => item.name).join(', ') + (menu.cart.length > 2 ? '...' : '')
                        : '無項目';
                    
                    return `
                        <tr class="history-row" onclick="loadHistoryMenu(${originalMenuIndex})" style="cursor: pointer;">
                            <td class="menu-name-cell" title="${menu.name || '未命名菜單'}">${menu.name || '未命名菜單'}</td>
                            <td class="date-cell">${formatDate(new Date(menu.savedAt))}</td>
                            <td class="count-cell">${menu.cart?.length || 0}</td>
                            <td class="people-cell">${menu.peopleCount || 1}</td>
                            <td class="table-cell">${menu.tableCount || 1}</td>
                            <td class="total-cell">$${total}</td>
                            <td class="perperson-cell">$${perPerson}</td>
                            <td class="preview-cell" title="${cartPreview}">${cartPreview}</td>
                            <td class="actions-cell" onclick="event.stopPropagation();">
                                <button class="btn-small btn-edit" onclick="editHistoryMenu(${originalMenuIndex})" title="編輯">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn-small btn-delete" onclick="deleteHistoryMenu(${originalMenuIndex})" title="刪除">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
}

// 歷史紀錄排序函數
function sortHistoryBy(field) {
    if (historySort.field === field) {
        // 如果點擊的是同一個欄位，切換排序方向
        historySort.direction = historySort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        // 如果點擊的是新欄位，設定為降序
        historySort.field = field;
        historySort.direction = 'desc';
    }
    
    // 更新下拉選單的值以保持同步
    const historySortSelect = document.getElementById('historySortBy');
    if (historySortSelect) {
        historySortSelect.value = field;
    }
    
    // 重新渲染歷史列表
    renderHistoryList();
}

function calculateMenuTotal(menu) {
    if (!menu.cart) return 0;
    const subtotal = menu.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const serviceFee = Math.round(subtotal * 0.1);
    return subtotal + serviceFee;
}

function getTotalItems(menu) {
    return menu.categories?.reduce((total, category) => total + (category.items?.length || 0), 0) || 0;
}

function loadHistoryMenu(index) {
    const savedMenus = JSON.parse(localStorage.getItem('savedMenus') || '[]');
    const menu = savedMenus[index];
    
    if (menu) {
        menuData = {
            categories: menu.categories || [],
            version: menu.version || '1.0.0',
            createdAt: menu.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        cart = menu.cart || [];
        peopleCount = menu.peopleCount || 1;
        elements.peopleCountInput.value = peopleCount;
        
        renderMenu();
        renderCart();
        updateCartSummary();
        document.getElementById('historyModal').style.display = 'none';
        
        alert('菜單已載入');
    }
}

function editHistoryMenu(index) {
    const savedMenus = JSON.parse(localStorage.getItem('savedMenus') || '[]');
    const menu = savedMenus[index];
    
    if (menu) {
        const newName = prompt('請輸入新的菜單名稱:', menu.name || '');
        if (newName !== null && newName.trim()) {
            menu.name = newName.trim();
            menu.updatedAt = new Date().toISOString();
            
            savedMenus[index] = menu;
            localStorage.setItem('savedMenus', JSON.stringify(savedMenus));
            
            renderHistoryList();
            alert('菜單名稱已更新');
        }
    }
}

function deleteHistoryMenu(index) {
    const savedMenus = JSON.parse(localStorage.getItem('savedMenus') || '[]');
    const menu = savedMenus[index];
    
    if (menu && confirm(`確定要刪除菜單「${menu.name || '未命名菜單'}」嗎？此操作無法復原。`)) {
        savedMenus.splice(index, 1);
        localStorage.setItem('savedMenus', JSON.stringify(savedMenus));
        
        renderHistoryList();
        alert('菜單已刪除');
    }
}

// 渲染功能
function renderCategoryTabs() {
    const categoryTabs = document.getElementById('categoryTabs');
    if (!categoryTabs) return;
    
    const tabs = [
        { id: 'all', name: '全部' },
        ...menuData.categories.map(cat => ({ id: cat.id, name: cat.name }))
    ];
    
    categoryTabs.innerHTML = tabs.map(tab => `
        <div class="category-tab ${activeCategory === tab.id ? 'active' : ''}" 
             data-category="${tab.id}" 
             onclick="filterByCategory('${tab.id}')">
            ${tab.name}
        </div>
    `).join('');
}

function filterByCategory(categoryId) {
    activeCategory = categoryId;
    renderCategoryTabs();
    
    // 顯示/隱藏相應的類別
    const categories = document.querySelectorAll('.category');
    categories.forEach(category => {
        const catId = category.dataset.id;
        if (categoryId === 'all' || catId === categoryId) {
            category.style.display = 'block';
        } else {
            category.style.display = 'none';
        }
    });
}

function renderMenu() {
    elements.menuCategories.innerHTML = menuData.categories.map(category => `
        <div class="category" data-id="${category.id}">
            <div class="category-header">
                <div class="category-title">
                    <i class="fas fa-grip-vertical drag-handle"></i>
                    <span>${category.name}</span>
                </div>
                <div class="category-controls admin-controls" style="display: ${isAdminMode ? 'flex' : 'none'};">
                    <button class="btn btn-small btn-add" onclick="showItemModal('${category.id}')">
                        <i class="fas fa-plus"></i> 新增品項
                    </button>
                    <button class="btn btn-small btn-secondary" onclick="editCategory('${category.id}')">
                        <i class="fas fa-edit"></i> 編輯
                    </button>
                    <button class="btn btn-small" style="background: #dc3545; color: white;" onclick="deleteCategory('${category.id}')">
                        <i class="fas fa-trash"></i> 刪除
                    </button>
                </div>
            </div>
            <div class="category-items" id="category-${category.id}">
                ${category.items.map(item => renderMenuItem(category.id, item)).join('')}
            </div>
        </div>
    `).join('');
    
    // 渲染類別標籤
    renderCategoryTabs();
    // 應用當前篩選
    filterByCategory(activeCategory);
    
    // 重新設定拖曳排序（會根據 isAdminMode 決定是否啟用）
    setupSortable();
}

function renderMenuItem(categoryId, item) {
    const isInCart = cart.some(cartItem => cartItem.id === item.id);
    
    return `
        <div class="menu-item ${isInCart ? 'selected' : ''}" onclick="addToCart('${categoryId}', '${item.id}')">
            <div class="item-controls admin-controls" style="display: ${isAdminMode ? 'block' : 'none'};">
                <button class="btn btn-small btn-secondary" onclick="event.stopPropagation(); editItem('${categoryId}', '${item.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-small" style="background: #dc3545; color: white;" onclick="event.stopPropagation(); deleteItem('${categoryId}', '${item.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <div class="item-header">
                <div>
                    <span class="item-name">${item.name}</span>
                    ${item.nameEn ? `<span class="item-name-en">${item.nameEn}</span>` : ''}
                </div>
                <div class="item-price">$${item.price}</div>
            </div>
        </div>
    `;
}

function renderCart() {
    if (cart.length === 0) {
        elements.cartItems.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-cart"></i>
                <p>購物車是空的</p>
                <small>點擊菜單品項來新增</small>
            </div>
        `;
        return;
    }
    
    // 按類別順序分組購物車項目
    const cartByCategory = {};
    
    // 將購物車項目按類別分組
    cart.forEach(item => {
        if (!cartByCategory[item.categoryId]) {
            cartByCategory[item.categoryId] = [];
        }
        cartByCategory[item.categoryId].push(item);
    });
    
    // 按照menuData.categories的當前順序顯示購物車項目
    let html = '';
    menuData.categories.forEach(category => {
        const categoryId = category.id;
        if (cartByCategory[categoryId] && cartByCategory[categoryId].length > 0) {
            html += `
                <div class="cart-category">
                    <div class="cart-category-header">${category.name} (${cartByCategory[categoryId].length}道)</div>
                    ${cartByCategory[categoryId].map(item => `
                        <div class="cart-item-compact">
                            <div class="cart-item-info">
                                <div class="cart-item-name-compact">${item.name} 單價 $${item.price}</div>
                                <div class="cart-item-name-en-compact">${item.nameEn || ''}</div>
                            </div>
                            <div class="cart-item-controls-compact">
                                <button class="btn-qty-compact" onclick="updateCartItemQuantity('${item.id}', ${item.quantity - 1})">-</button>
                                <span class="qty-display">${item.quantity}</span>
                                <button class="btn-qty-compact" onclick="updateCartItemQuantity('${item.id}', ${item.quantity + 1})">+</button>
                            </div>
                            <div class="cart-item-price-compact">$${item.price * item.quantity}</div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
    });
    
    elements.cartItems.innerHTML = html;
}

// 模態對話框事件
function bindModalEvents() {
    // 關閉模態對話框
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });
    
    // 點擊模態對話框外部關閉
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });
    
    // 儲存類別按鈕
    document.getElementById('saveCategoryBtn').addEventListener('click', updateCategory);
    
    // 儲存品項按鈕
    document.getElementById('saveItemBtn').addEventListener('click', saveItem);
    
    // 處理匯入按鈕
    document.getElementById('processImportBtn').addEventListener('click', processImport);
    
    // 確認儲存菜單按鈕
    document.getElementById('confirmSaveMenu').addEventListener('click', confirmSaveMenu);
    
    // 歷史搜尋和排序
    document.getElementById('historySearch').addEventListener('input', debounce(renderHistoryList, 300));
    document.getElementById('historySortBy').addEventListener('change', function(e) {
        historySort.field = e.target.value;
        historySort.direction = 'desc'; // 重設為降序
        renderHistoryList();
    });
}

// 工具函數
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function formatDate(date) {
    return date.toLocaleString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 載入範例資料
function loadSampleData() {
    if (menuData.categories.length === 0) {
        menuData.categories = [
            {
                id: generateId(),
                name: 'NY-Style Pizza',
                items: [
                    {
                        id: generateId(),
                        name: '經典紅醬起司臘腸披薩',
                        nameEn: 'Classic Tomato Sauce Cheese & Pepperoni Pizza',
                        description: '',
                        price: 430
                    },
                    {
                        id: generateId(),
                        name: '蒔蘿巧達海鮮濃湯披薩',
                        nameEn: 'Seafood Chowder with Dill Pizza',
                        description: '',
                        price: 470
                    },
                    {
                        id: generateId(),
                        name: '阿米哥火辣牛肉披薩',
                        nameEn: 'Amigo Spicy Beef Pizza',
                        description: '',
                        price: 480
                    },
                    {
                        id: generateId(),
                        name: '☘️普羅旺斯燉菜披薩',
                        nameEn: 'Provençal Ratatouille Pizza',
                        description: '',
                        price: 450
                    },
                    {
                        id: generateId(),
                        name: '日式風章魚燒披薩',
                        nameEn: 'Japanese-style Takoyaki Pizza',
                        description: '',
                        price: 460
                    },
                    {
                        id: generateId(),
                        name: '☘️四起司胡桃楓糖披薩',
                        nameEn: 'Four Cheese Walnut & Maple Syrup Pizza',
                        description: '',
                        price: 450
                    }
                ]
            },
            {
                id: generateId(),
                name: 'SALADS & SOUP',
                items: [
                    {
                        id: generateId(),
                        name: '純素蔬果油醋沙拉',
                        nameEn: 'Vegan Garden Salad with Balsamic',
                        description: '🥬',
                        price: 300
                    },
                    {
                        id: generateId(),
                        name: '小傻瓜蕎麥麵沙拉',
                        nameEn: 'Silly Soba Noodle Salad',
                        description: '',
                        price: 350
                    },
                    {
                        id: generateId(),
                        name: '經典藍起司凱薩沙拉',
                        nameEn: 'Classic Blue Cheese Caesar Salad',
                        description: '',
                        price: 350
                    },
                    {
                        id: generateId(),
                        name: '海味中卷時蔬溫沙拉',
                        nameEn: 'Warm Squid & Seasonal Vegetable Salad',
                        description: '',
                        price: 380
                    },
                    {
                        id: generateId(),
                        name: '薄荷萊姆海鮮綜合沙拉',
                        nameEn: 'Mint & Lime Seafood Salad',
                        description: '',
                        price: 390
                    },
                    {
                        id: generateId(),
                        name: '希臘彩虹藜麥雞肉沙拉',
                        nameEn: 'Greek Quinoa Chicken Salad',
                        description: '',
                        price: 360
                    },
                    {
                        id: generateId(),
                        name: '地中海蕃茄牛肉蔬菜湯',
                        nameEn: 'Tomato Vegetable Beef Soup',
                        description: '',
                        price: 220
                    },
                    {
                        id: generateId(),
                        name: '海鮮巧達蛤蠣濃湯',
                        nameEn: 'Seafood Clam Chowder',
                        description: '',
                        price: 230
                    }
                ]
            },
            {
                id: generateId(),
                name: 'LA PASTA',
                items: [
                    {
                        id: generateId(),
                        name: '蒜味檸檬鮮蝦義大利麵',
                        nameEn: 'Garlic Lemon Shrimp Pasta',
                        description: '',
                        price: 450
                    },
                    {
                        id: generateId(),
                        name: '明太子鮭魚奶粉紅義大利麵',
                        nameEn: 'Creamy Mentaiko Salmon Pasta',
                        description: '',
                        price: 480
                    },
                    {
                        id: generateId(),
                        name: '奧勒岡燻烤時蔬義大利麵',
                        nameEn: 'Oregano-Roasted Vegetable Pasta',
                        description: '🥬',
                        price: 430
                    },
                    {
                        id: generateId(),
                        name: '黑松露熟成起司義大利麵',
                        nameEn: 'Black Truffle Aged Cheese Pasta',
                        description: '可做🥬蛋奶素',
                        price: 460
                    },
                    {
                        id: generateId(),
                        name: '奶油起司蕃茄雞肉義大利麵',
                        nameEn: 'Creamy Cheese Tomato Chicken Pasta',
                        description: '',
                        price: 430
                    }
                ]
            },
            {
                id: generateId(),
                name: 'RISOTTO & MAIN DISHES',
                items: [
                    {
                        id: generateId(),
                        name: '溫泉蛋松露菇燉飯',
                        nameEn: 'Truffle Mushroom Risotto with Soft-Boiled Egg',
                        description: '可做🥬蛋奶素',
                        price: 450
                    },
                    {
                        id: generateId(),
                        name: '黃級數紅蝦起司燉飯',
                        nameEn: 'Sashimi-Grade Red Prawn Roe Risotto with Cheese',
                        description: '',
                        price: 480
                    },
                    {
                        id: generateId(),
                        name: '奶油檸檬櫛瓜蝦仁燉飯',
                        nameEn: 'Creamy Lemon Zucchini Shrimp Risotto',
                        description: '',
                        price: 460
                    },
                    {
                        id: generateId(),
                        name: '穀飼黑豬帶骨法式薯泥豬排',
                        nameEn: 'Grain-Fed Black Pork Chop with Pommes Purée',
                        description: '',
                        price: 680
                    },
                    {
                        id: generateId(),
                        name: 'GFS杉河農場天然飼養自然牛肋眼',
                        nameEn: 'Naturally Raised CEDAR RIVER FARMS Ribeye',
                        description: '',
                        price: 990
                    }
                ]
            },
            {
                id: generateId(),
                name: 'FRIED & LOVED',
                items: [
                    {
                        id: generateId(),
                        name: '舊金山香蒜薯條',
                        nameEn: 'San Francisco Garlic Fries',
                        description: '🥬',
                        price: 220
                    },
                    {
                        id: generateId(),
                        name: '松露帕達諾起司薯條',
                        nameEn: 'Grana Padano Truffle Fries',
                        description: '',
                        price: 230
                    },
                    {
                        id: generateId(),
                        name: '南洋風味香甜雞翅',
                        nameEn: 'Thai Sweet Chili Wings',
                        description: '',
                        price: 230
                    },
                    {
                        id: generateId(),
                        name: '加拿大楓糖辣雞翅',
                        nameEn: 'Maple Hot Syrup Wings',
                        description: '',
                        price: 230
                    },
                    {
                        id: generateId(),
                        name: '廣島蠔炸牡蠣',
                        nameEn: 'Crispy Fried Hiroshima Oysters',
                        description: '',
                        price: 250
                    },
                    {
                        id: generateId(),
                        name: '雞尾酒醬拍塔蝦',
                        nameEn: 'Tartare Shrimp with Cocktail Sauce',
                        description: '',
                        price: 250
                    },
                    {
                        id: generateId(),
                        name: '日式黃金竹莢魚',
                        nameEn: 'Crispy Golden Aji',
                        description: '',
                        price: 250
                    },
                    {
                        id: generateId(),
                        name: '經典炸物拼盤 A',
                        nameEn: 'A Beach Combo',
                        description: '雞翅薯條 + 香蒜薯條 + 起司薯',
                        price: 650
                    },
                    {
                        id: generateId(),
                        name: '海鮮炸物拼盤',
                        nameEn: 'Seafood Combo',
                        description: '炸魚魚 + 乾魷魚 + 炸牡生蠔',
                        price: 680
                    }
                ]
            },
            {
                id: generateId(),
                name: 'ALL DAY BRUNCH',
                items: [
                    {
                        id: generateId(),
                        name: '美式經典早餐',
                        nameEn: 'American Classic Brunch',
                        description: '',
                        price: 280
                    },
                    {
                        id: generateId(),
                        name: '靈魂炸雞鬆餅',
                        nameEn: 'Soul Fried Chicken Waffle',
                        description: '',
                        price: 280
                    },
                    {
                        id: generateId(),
                        name: '夏威夷海灘漢堡',
                        nameEn: 'Hawaiian Beach Burger',
                        description: '',
                        price: 280
                    },
                    {
                        id: generateId(),
                        name: '煙燻火腿班尼迪克蛋',
                        nameEn: 'Smoked Ham Eggs Benedict',
                        description: '',
                        price: 280
                    },
                    {
                        id: generateId(),
                        name: '鹽漬生鮭歐姆蛋布里歐',
                        nameEn: 'Salt-Cured Salmon & Omelette Brioche',
                        description: '',
                        price: 280
                    },
                    {
                        id: generateId(),
                        name: '辣味花生醬開心果起司雞肉薄餅',
                        nameEn: 'Spicy Peanut Pistachio Chicken Quesadilla',
                        description: '',
                        price: 280
                    },
                    {
                        id: generateId(),
                        name: '墨西哥辣椒香烤牛肉起司可',
                        nameEn: 'Crispy Jalapeño Beef Cheek Tacos',
                        description: '',
                        price: 280
                    },
                    {
                        id: generateId(),
                        name: '奶油楓糖美式煎餅',
                        nameEn: 'Buttery Maple Syrup Pancakes',
                        description: '🥬',
                        price: 280
                    },
                    {
                        id: generateId(),
                        name: '格子鬆餅#巧克力莓果｜焦糖香蕉',
                        nameEn: 'Waffles – Chocolate Berry / Caramel Banana',
                        description: '🥬',
                        price: 280
                    },
                    {
                        id: generateId(),
                        name: '命中注定出現的那塊法式吐司',
                        nameEn: "I'm the Best French Toast in TAIPEI",
                        description: '🥬',
                        price: 280
                    }
                ]
            },
            {
                id: generateId(),
                name: 'SWEETIE',
                items: [
                    {
                        id: generateId(),
                        name: '奶油的起司薄荷檸檬派',
                        nameEn: 'Cream Cheese Mint Lemon Pie',
                        description: '',
                        price: 250
                    },
                    {
                        id: generateId(),
                        name: '🍀經典的特濃巧克力蛋糕',
                        nameEn: 'Signature Rich Chocolate Cake',
                        description: '',
                        price: 250
                    },
                    {
                        id: generateId(),
                        name: '道地的杏仁酒香提拉米蘇',
                        nameEn: 'Exquisite Amaretto Tiramisu',
                        description: '',
                        price: 250
                    },
                    {
                        id: generateId(),
                        name: '🍀命中注定又出現的那塊法式吐司',
                        nameEn: "I'm the Best French Toast in TAIPEI",
                        description: '',
                        price: 280
                    }
                ]
            },
            {
                id: generateId(),
                name: 'HAPPY',
                items: [
                    {
                        id: generateId(),
                        name: '葵莎酒莊卡本內紅酒',
                        nameEn: 'Quasar Selection Cabernet Sauvignon',
                        description: '',
                        price: 1600
                    },
                    {
                        id: generateId(),
                        name: '葵莎酒莊蘇維濃白酒',
                        nameEn: 'Quasar Selection Sauvignon Blanc',
                        description: '',
                        price: 1600
                    },
                    {
                        id: generateId(),
                        name: '粉紅羽毛氣泡酒',
                        nameEn: 'Signature Wines Estate Range Moscato',
                        description: '',
                        price: 1600
                    },
                    {
                        id: generateId(),
                        name: '飲品｜18天生啤｜調酒任選',
                        nameEn: 'Craft Beer | Cocktail',
                        description: '',
                        price: 230
                    },
                    {
                        id: generateId(),
                        name: '快樂一點 買三送一',
                        nameEn: 'Happy More buy 3 get 1 free',
                        description: '',
                        price: 168
                    },
                    {
                        id: generateId(),
                        name: '100杯調酒',
                        nameEn: '100 cup',
                        description: '',
                        price: 15000
                    }
                ]
            },
            {
                id: generateId(),
                name: 'Soft Drink',
                items: [
                    {
                        id: generateId(),
                        name: '錫蘭紅茶(壺)',
                        nameEn: 'Ceylon Black Tea',
                        description: '',
                        price: 400
                    },
                    {
                        id: generateId(),
                        name: '茉莉花綠茶(壺)',
                        nameEn: 'Jasmine Green Tea',
                        description: '',
                        price: 400
                    },
                    {
                        id: generateId(),
                        name: '新鮮薄荷檸檬水(壺)',
                        nameEn: 'Fresh Mint & Lemon Water',
                        description: '',
                        price: 400
                    },
                    {
                        id: generateId(),
                        name: '桂花蜜檸檬冰紅茶(壺)',
                        nameEn: 'Honey Lemon Black Tea',
                        description: '',
                        price: 600
                    },
                    {
                        id: generateId(),
                        name: '熱成果香烏龍冰茶(壺)',
                        nameEn: 'Fruity Oolong Iced Tea',
                        description: '',
                        price: 600
                    },
                    {
                        id: generateId(),
                        name: '原香泰式手標冰奶茶(壺)',
                        nameEn: 'Royal Thai Silk Milk Tea',
                        description: '',
                        price: 600
                    },
                    {
                        id: generateId(),
                        name: '酸甜鳳梨桂圓泡飲(壺)',
                        nameEn: 'Sweet & Tangy Pineapple Longan Fizz',
                        description: '',
                        price: 600
                    },
                    {
                        id: generateId(),
                        name: '香檳葡萄烏龍茶氣泡(壺)',
                        nameEn: 'Grape Champagne Oolong Sparkling Tea',
                        description: '',
                        price: 600
                    },
                    {
                        id: generateId(),
                        name: '豐收蕎麥茶(壺)',
                        nameEn: 'Harvest Buckwheat Tea',
                        description: '',
                        price: 400
                    },
                    {
                        id: generateId(),
                        name: '美式冰咖啡(壺)',
                        nameEn: 'Iced Americano',
                        description: '',
                        price: 400
                    }
                ]
            }
        ];
        renderMenu();
        saveToStorage();
    }
}
