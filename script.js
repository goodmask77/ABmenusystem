function restoreCurrentUser() {
    try {
        const stored = localStorage.getItem(CURRENT_USER_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed?.username) {
                currentUser = parsed;
            }
        }
    } catch (error) {
        console.warn('讀取登入資訊失敗：', error);
    }
}

function persistCurrentUser() {
    if (currentUser) {
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));
    } else {
        localStorage.removeItem(CURRENT_USER_KEY);
    }
    updateAuthUI();
}

function requireLogin(action) {
    if (currentUser) {
        return true;
    }
    postLoginAction = action || null;
    openModal('loginModal');
    if (elements.loginUsername) {
        elements.loginUsername.focus();
    }
    return false;
}

function ensureEditorAccess() {
    if (!currentUser) {
        requireLogin(ensureEditorAccess);
        return false;
    }
    return true;
}

function ensureAdminAccess() {
    if (!currentUser) {
        requireLogin(ensureAdminAccess);
        return false;
    }
    const user = accounts.find(acc => acc.username === currentUser.username);
    if (user?.role === 'admin') {
        return true;
    }
    alert('只有管理員可以執行此操作');
    return false;
}

async function handleLogin() {
    const username = elements.loginUsername.value.trim();
    if (!username) {
        alert('請輸入帳號名稱');
        return;
    }
    const account = accounts.find(acc => acc.username === username);
    if (!account) {
        alert('找不到此帳號，請聯繫管理員。');
        return;
    }
    currentUser = account;
    persistCurrentUser();
    closeModal('loginModal');
    renderAccountInfo();
    if (typeof postLoginAction === 'function') {
        const action = postLoginAction;
        postLoginAction = null;
        action();
    }
}

function logoutUser() {
    currentUser = null;
    persistCurrentUser();
    updateAuthUI();
}

function updateAuthUI() {
    const badgeId = 'loginStatus';
    let badge = document.getElementById(badgeId);
    if (!badge) {
        badge = document.createElement('span');
        badge.id = badgeId;
        badge.className = 'login-status-badge';
        elements.headerControls = document.querySelector('.header-controls');
        if (elements.headerControls) {
            elements.headerControls.appendChild(badge);
        }
    }
    if (currentUser) {
        badge.innerHTML = `<i class="fas fa-user-shield"></i> ${currentUser.username}`;
        badge.style.display = 'inline-flex';
        if (elements.loginButton) {
            elements.loginButton.textContent = '登出';
            elements.loginButton.onclick = logoutUser;
        }
        if (elements.manageAccounts) {
            const currentAccount = accounts.find(acc => acc.username === currentUser.username);
            elements.manageAccounts.style.display = currentAccount?.role === 'admin' ? 'inline-flex' : 'none';
            elements.manageAccounts.onclick = () => {
                if (!ensureAdminAccess()) return;
                renderAccountList();
                openModal('accountModal');
            };
        }
    } else {
        badge.style.display = 'none';
        if (elements.loginButton) {
            elements.loginButton.innerHTML = '<i class="fas fa-user-lock"></i> 登入後台';
            elements.loginButton.onclick = () => openModal('loginModal');
        }
        if (elements.manageAccounts) {
            elements.manageAccounts.style.display = 'none';
        }
    }
}

function renderAccountInfo() {
    // 目前僅需刷新登入徽章與權限相關按鈕
    updateAuthUI();
}

function renderAccountList() {
    if (!elements.accountList) return;
    const list = [...accounts].sort((a, b) => {
        if (a.role === b.role) {
            return a.username.localeCompare(b.username);
        }
        return a.role === 'admin' ? -1 : 1;
    });
    if (!list.length) {
        elements.accountList.innerHTML = '<p class="account-empty">目前沒有任何帳號。</p>';
        return;
    }
    elements.accountList.innerHTML = list.map(account => {
        const roleLabel = account.role === 'admin' ? '管理員' : '一般使用者';
        const deleteButton = account.username === ADMIN_USERNAME
            ? '<span class="account-role">預設管理員</span>'
            : '<button class="btn btn-secondary btn-small" data-delete-account="' + account.username + '"><i class="fas fa-trash"></i> 刪除</button>';
        return `
            <div class="account-row" data-username="${account.username}">
                <div>
                    <strong>${account.username}</strong>
                    <div class="account-role">${roleLabel}</div>
                </div>
                <div class="account-row-actions">${deleteButton}</div>
            </div>
        `;
    }).join('');
}

function normalizeAccountList(list = []) {
    const seen = new Set();
    const normalized = [];
    [...list, { username: ADMIN_USERNAME, role: 'admin' }].forEach(account => {
        const username = (account?.username || '').trim();
        if (!username || seen.has(username)) return;
        const role = account.role === 'admin' ? 'admin' : 'editor';
        seen.add(username);
        normalized.push({ username, role });
    });
    return normalized;
}

async function persistNamedState(name, payload, clientOverride = null) {
    const client = clientOverride || supabaseClient || await initSupabaseClient();
    if (!client) {
        throw new Error('Supabase 尚未就緒，無法同步資料');
    }
    const { error } = await client
        .from('menu_state')
        .upsert({ name, payload, updated_at: new Date().toISOString() }, { onConflict: 'name' });
    if (error) {
        throw error;
    }
    return client;
}

async function fetchNamedState(name, clientOverride = null) {
    const client = clientOverride || supabaseClient || await initSupabaseClient();
    if (!client) {
        return null;
    }
    const { data, error } = await client
        .from('menu_state')
        .select('payload')
        .eq('name', name)
        .maybeSingle();
    if (error && error.code !== 'PGRST116') {
        throw error;
    }
    return data?.payload ?? null;
}

async function persistAccountsState(clientOverride = null) {
    await persistNamedState(ACCOUNTS_STATE_KEY, { accounts }, clientOverride);
}

function loadLocalChangeLog() {
    try {
        const raw = localStorage.getItem(CHANGELOG_LOCAL_KEY);
        return sanitizeChangeLogEntries(raw ? JSON.parse(raw) : []);
    } catch (error) {
        console.warn('載入本機修改紀錄失敗：', error);
        return [];
    }
}

function persistLocalChangeLog() {
    try {
        localStorage.setItem(CHANGELOG_LOCAL_KEY, JSON.stringify(changeLogEntries.slice(0, 100)));
    } catch (error) {
        console.warn('儲存本機修改紀錄失敗：', error);
    }
}

function mergeChangeLogEntries(primary = [], secondary = []) {
    const map = new Map();
    [...primary, ...secondary].forEach(entry => {
        if (!entry) return;
        const sanitized = sanitizeChangeLogEntries([entry])[0];
        if (!sanitized) return;
        map.set(sanitized.id, sanitized);
    });
    return Array.from(map.values()).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

function sanitizeChangeLogEntries(entries = []) {
    const seen = new Set();
    return entries.reduce((list, entry) => {
        if (!entry) return list;
        const id = entry.id || generateId();
        if (seen.has(id)) return list;
        seen.add(id);
        const timestamp = entry.timestamp || new Date().toISOString();
        const metadata = entry.metadata || entry.meta || {};
        const sanitizedEntry = {
            id,
            timestamp,
            user: entry.user || metadata.createdBy || '未知',
            reason: entry.reason || 'update',
            summary: entry.summary || metadata.preview || '更新菜單內容',
            metadata: {
                itemCount: metadata.itemCount || 0,
                preview: metadata.preview || '無品項預覽',
                createdBy: metadata.createdBy || entry.user || '未知',
                estimatedTotal: metadata.estimatedTotal,
                estimatedPerPerson: metadata.estimatedPerPerson
            },
            snapshot: {
                peopleCount: entry.snapshot?.peopleCount || 1,
                tableCount: entry.snapshot?.tableCount || 1,
                menuName: entry.snapshot?.menuName || entry.snapshot?.name || ''
            }
        };
        list.push(sanitizedEntry);
        return list;
    }, []);
}

async function persistChangeLogEntries(clientOverride = null) {
    persistLocalChangeLog();
    try {
        await persistNamedState(CHANGELOG_STATE_KEY, { entries: changeLogEntries.slice(0, 100) }, clientOverride);
    } catch (error) {
        console.warn('同步修改紀錄失敗：', error);
    }
}

async function initChangeLog() {
    changeLogEntries = loadLocalChangeLog();
    try {
        const payload = await fetchNamedState(CHANGELOG_STATE_KEY);
        const remoteEntries = sanitizeChangeLogEntries(payload?.entries || []);
        if (remoteEntries.length) {
            changeLogEntries = mergeChangeLogEntries(remoteEntries, changeLogEntries).slice(0, 100);
            persistLocalChangeLog();
        } else if (changeLogEntries.length) {
            await persistChangeLogEntries();
        }
    } catch (error) {
        console.warn('載入修改紀錄失敗：', error);
    }
}

async function refreshChangeLogEntries() {
    try {
        const payload = await fetchNamedState(CHANGELOG_STATE_KEY);
        if (payload?.entries) {
            changeLogEntries = sanitizeChangeLogEntries(payload.entries).slice(0, 100);
            persistLocalChangeLog();
        }
    } catch (error) {
        console.warn('重新整理修改紀錄失敗：', error);
    }
    return changeLogEntries;
}

function getChangeReasonLabel(reason) {
    switch (reason) {
        case 'manual-save':
            return '手動儲存';
        case 'auto-sync':
            return '自動同步';
        case 'manual-sync':
            return '手動同步';
        case 'structure-change':
            return '內容更新';
        default:
            return '更新';
    }
}

function computeMenuFingerprint(snapshot) {
    const compactMenu = (snapshot.menu?.categories || []).map(category => ({
        id: category.id,
        name: category.name,
        items: (category.items || []).map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            nameEn: item.nameEn
        }))
    }));
    return JSON.stringify({
        menu: compactMenu,
        peopleCount: snapshot.peopleCount,
        tableCount: snapshot.tableCount
    });
}

function buildChangeSummary(reason, metadata, snapshot, options = {}) {
    const preview = metadata.preview || '無品項預覽';
    if (reason === 'manual-save' && options.menuName) {
        return `儲存菜單「${options.menuName}」 (${metadata.itemCount} 道)`;
    }
    return `更新 ${metadata.itemCount} 道餐點 · ${preview}`;
}

function recordMenuChange(reason = 'auto-sync', snapshot = null, options = {}) {
    if (options.skip) {
        return;
    }
    const stateSnapshot = snapshot || getCurrentStateSnapshot();
    if (!stateSnapshot?.menu) {
        return;
    }
    const fingerprint = computeMenuFingerprint(stateSnapshot);
    if (!options.force && fingerprint === lastChangeFingerprint) {
        return;
    }
    lastChangeFingerprint = fingerprint;
    const metadataOverrides = {
        createdBy: options.createdBy || stateSnapshot.updatedBy || currentUser?.username || '未知'
    };
    if (typeof options.itemCount === 'number') {
        metadataOverrides.itemCount = options.itemCount;
    }
    if (options.preview) {
        metadataOverrides.preview = options.preview;
    }
    if (Number.isFinite(options.estimatedTotal)) {
        metadataOverrides.estimatedTotal = options.estimatedTotal;
    }
    if (Number.isFinite(options.estimatedPerPerson)) {
        metadataOverrides.estimatedPerPerson = options.estimatedPerPerson;
    }
    const metadata = createHistoryMetadata(stateSnapshot.menu, metadataOverrides);
    const entry = {
        id: generateId(),
        timestamp: stateSnapshot.updatedAt || new Date().toISOString(),
        user: metadata.createdBy,
        reason,
        summary: options.summary || buildChangeSummary(reason, metadata, stateSnapshot, options),
        metadata,
        snapshot: {
            peopleCount: stateSnapshot.peopleCount,
            tableCount: stateSnapshot.tableCount,
            menuName: options.menuName || ''
        }
    };
    changeLogEntries.unshift(entry);
    changeLogEntries = sanitizeChangeLogEntries(changeLogEntries).slice(0, 100);
    persistLocalChangeLog();
    persistChangeLogEntries();
}

function renderChangeLogEntries() {
    const container = document.getElementById('changeLogContent');
    if (!container) return;
    if (!changeLogEntries.length) {
        container.innerHTML = '<div class="change-log-empty">目前沒有可顯示的修改紀錄。</div>';
        return;
    }
    container.innerHTML = changeLogEntries.map(entry => {
        const timestamp = entry.timestamp ? formatDate(new Date(entry.timestamp)) : '';
        const total = Number.isFinite(entry.metadata?.estimatedTotal) ? entry.metadata.estimatedTotal : null;
        const perPerson = Number.isFinite(entry.metadata?.estimatedPerPerson) ? entry.metadata.estimatedPerPerson : null;
        const metaParts = [
            `<span><i class="fas fa-list"></i> ${entry.metadata?.itemCount || 0} 道餐點</span>`,
            `<span><i class="fas fa-users"></i> ${entry.snapshot?.peopleCount || 1} 人</span>`,
            `<span><i class="fas fa-chair"></i> ${entry.snapshot?.tableCount || 1} 桌</span>`
        ];
        if (total !== null) {
            metaParts.push(`<span><i class="fas fa-dollar-sign"></i> 總額 $${total}</span>`);
        }
        if (perPerson !== null) {
            metaParts.push(`<span><i class="fas fa-user"></i> 人均 $${perPerson}</span>`);
        }
        return `
            <div class="change-log-entry">
                <div class="change-log-entry-header">
                    <span class="change-log-user"><i class="fas fa-user-circle"></i> ${entry.user || '未知使用者'}</span>
                    <span class="change-log-time">${timestamp}</span>
                    <span class="change-log-reason">${getChangeReasonLabel(entry.reason)}</span>
                </div>
                <div class="change-log-summary">${entry.summary}</div>
                <div class="change-log-meta">${metaParts.join('')}</div>
                <div class="change-log-preview"><i class="fas fa-utensils"></i> ${entry.metadata?.preview || '無品項預覽'}</div>
            </div>
        `;
    }).join('');
}

async function addAccount() {
    if (!ensureAdminAccess()) return;
    const username = elements.newAccountName.value.trim();
    const role = elements.newAccountRole.value;
    if (!username) {
        alert('請輸入帳號名稱');
        return;
    }
    if (accounts.some(acc => acc.username === username)) {
        alert('此帳號已存在');
        return;
    }
    const client = supabaseClient || await initSupabaseClient();
    if (!client) {
        alert('尚未設定雲端資料庫，無法新增帳號');
        return;
    }
    const previousAccounts = [...accounts];
    accounts = normalizeAccountList([...accounts, { username, role }]);
    try {
        await persistAccountsState(client);
        elements.newAccountName.value = '';
        elements.newAccountRole.value = 'editor';
        renderAccountList();
    } catch (error) {
        console.error('新增帳號失敗：', error);
        accounts = previousAccounts;
        alert('新增帳號失敗，請稍後再試');
    }
}

async function deleteAccount(username) {
    if (!ensureAdminAccess()) return;
    if (!username || username === ADMIN_USERNAME) {
        alert('無法刪除預設管理員帳號');
        return;
    }
    if (!confirm(`確認刪除帳號「${username}」？`)) {
        return;
    }
    const client = supabaseClient || await initSupabaseClient();
    if (!client) {
        alert('尚未設定雲端資料庫，無法刪除帳號');
        return;
    }
    const previousAccounts = [...accounts];
    accounts = normalizeAccountList(accounts.filter(acc => acc.username !== username));
    try {
        await persistAccountsState(client);
        if (currentUser?.username === username) {
            logoutUser();
        }
        renderAccountList();
    } catch (error) {
        console.error('刪除帳號失敗：', error);
        accounts = previousAccounts;
        alert('刪除帳號失敗，請稍後再試');
    }
}
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
const CART_STATE_KEY = 'CART_STATE';
const AUTO_HISTORY_FLAG = '__AUTO_HISTORY__';
const ACCOUNTS_STATE_KEY = 'MENU_ACCOUNTS';
const CHANGELOG_STATE_KEY = 'MENU_CHANGELOG';
const CHANGELOG_LOCAL_KEY = 'MENU_CHANGELOG';
const ADMIN_USERNAME = 'goodmask77';
const CURRENT_USER_KEY = 'CURRENT_USER';
let supabaseClient = null;
let supabaseSyncQueue = Promise.resolve();
let supabaseInitialized = false;
let syncStatusTimer = null;
let accounts = [];
let currentUser = null;
let postLoginAction = null;
let changeLogEntries = [];
let lastChangeFingerprint = null;

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
    viewChangeLog: document.getElementById('viewChangeLog'),
    loginButton: document.getElementById('loginButton'),
    manageAccounts: document.getElementById('manageAccounts'),
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
    totalItems: document.getElementById('totalItems'),
    loginModal: document.getElementById('loginModal'),
    accountModal: document.getElementById('accountModal'),
    loginUsername: document.getElementById('loginUsername'),
    confirmLogin: document.getElementById('confirmLogin'),
    accountList: document.getElementById('accountList'),
    newAccountName: document.getElementById('newAccountName'),
    newAccountRole: document.getElementById('newAccountRole'),
    addAccountButton: document.getElementById('addAccountButton'),
    // 客戶資訊欄位
    customerName: document.getElementById('customerName'),
    customerTaxId: document.getElementById('customerTaxId'),
    diningDate: document.getElementById('diningDate'),
    diningHour: document.getElementById('diningHour'),
    diningMinute: document.getElementById('diningMinute')
};

// 取得組合的用餐日期時間
function getDiningDateTime() {
    const date = elements.diningDate?.value || '';
    const hour = elements.diningHour?.value || '';
    const minute = elements.diningMinute?.value || '';
    if (date && hour && minute) {
        return `${date}T${hour}:${minute}`;
    }
    return '';
}

// 設定用餐日期時間
function setDiningDateTime(dateTimeStr) {
    if (!dateTimeStr) {
        if (elements.diningDate) elements.diningDate.value = '';
        if (elements.diningHour) elements.diningHour.value = '';
        if (elements.diningMinute) elements.diningMinute.value = '';
        return;
    }
    try {
        const dt = new Date(dateTimeStr);
        if (isNaN(dt.getTime())) return;
        const year = dt.getFullYear();
        const month = String(dt.getMonth() + 1).padStart(2, '0');
        const day = String(dt.getDate()).padStart(2, '0');
        const hour = String(dt.getHours()).padStart(2, '0');
        const minute = String(Math.floor(dt.getMinutes() / 10) * 10).padStart(2, '0');
        if (elements.diningDate) elements.diningDate.value = `${year}-${month}-${day}`;
        if (elements.diningHour) elements.diningHour.value = hour;
        if (elements.diningMinute) elements.diningMinute.value = minute;
    } catch (e) {
        console.warn('設定用餐時間失敗：', e);
    }
}

// 初始化應用程式
document.addEventListener('DOMContentLoaded', async function() {
    await prepareInitialState();
    initializeApp();
    bindEvents();
    await initAccounts();
    await initChangeLog();
    restoreCurrentUser();
    updateAuthUI();
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
    const cartRestored = restoreCartState();
    if (!cartRestored) {
        persistCartState();
    }
    if (!remoteRestored && !localRestored) {
        // 將預設資料同步到本機與遠端，確保後續操作有一致基準
        saveToStorage({ skipChangeLog: true, reason: 'bootstrap' });
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

// 同步菜單項目到 menu_items 表
async function syncItemToMenuItems(item, categoryName, action = 'upsert') {
    const client = supabaseClient || await initSupabaseClient();
    if (!client) {
        console.warn('Supabase 未連線，無法同步到 menu_items');
        return false;
    }
    
    try {
        if (action === 'delete') {
            const { error } = await client
                .from('menu_items')
                .delete()
                .eq('id', item.id);
            if (error) throw error;
            console.log('已從 menu_items 刪除:', item.name);
        } else {
            // upsert (新增或更新)
            const { error } = await client
                .from('menu_items')
                .upsert({
                    id: item.id,
                    name: item.name,
                    name_en: item.nameEn || item.enName || '',
                    price: item.price,
                    category: categoryName,
                    inserted_at: new Date().toISOString()
                }, { onConflict: 'id' });
            if (error) throw error;
            console.log('已同步到 menu_items:', item.name);
        }
        return true;
    } catch (error) {
        console.error('同步 menu_items 失敗:', error);
        return false;
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
        upsertAutoHistoryEntry(data.payload);
        const latestHistory = sanitizeHistoryEntries(getSavedMenus());
        const enrichedPayload = {
            ...data.payload,
            historyEntries: latestHistory,
            savedMenus: latestHistory
        };
        localStorage.setItem('currentMenu', JSON.stringify(enrichedPayload));
        return true;
    } catch (error) {
        console.error('處理 Supabase 狀態時發生錯誤：', error);
        return false;
    }
}

async function initAccounts() {
    const client = supabaseClient || await initSupabaseClient();
    if (!client) {
        accounts = normalizeAccountList();
        renderAccountList();
        return;
    }
    try {
        const { data, error } = await client
            .from('menu_state')
            .select('payload')
            .eq('name', ACCOUNTS_STATE_KEY)
            .maybeSingle();
        if (error && error.code !== 'PGRST116') {
            throw error;
        }
        const stored = Array.isArray(data?.payload?.accounts) ? data.payload.accounts : [];
        accounts = normalizeAccountList(stored);
        await persistAccountsState(client);
    } catch (error) {
        console.error('載入帳號資料失敗：', error);
        accounts = normalizeAccountList();
    }
    renderAccountList();
}

function applyStatePayload(payload) {
    if (payload?.menu?.categories) {
        menuData = {
            ...menuData,
            ...payload.menu,
            categories: payload.menu.categories
        };
    }
    peopleCount = Number(payload?.peopleCount) > 0 ? payload.peopleCount : 1;
    tableCount = Number(payload?.tableCount) > 0 ? payload.tableCount : 1;
    const remoteHistory = Array.isArray(payload?.historyEntries)
        ? payload.historyEntries
        : Array.isArray(payload?.savedMenus)
            ? payload.savedMenus
            : null;
    if (remoteHistory) {
        localStorage.setItem('savedMenus', JSON.stringify(remoteHistory.slice(0, 50)));
    }
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

function getCurrentStateSnapshot() {
    return {
        menu: deepClone(menuData),
        peopleCount: peopleCount,
        tableCount: tableCount,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser?.username || '未知'
    };
}

function getSavedMenus() {
    try {
        return JSON.parse(localStorage.getItem('savedMenus') || '[]');
    } catch (error) {
        console.warn('解析歷史紀錄失敗：', error);
        return [];
    }
}

function getCurrentStatePayload(snapshot = null) {
    const baseState = snapshot || getCurrentStateSnapshot();
    const historyEntries = sanitizeHistoryEntries(getSavedMenus());
    return {
        ...baseState,
        historyEntries,
        savedMenus: historyEntries
    };
}

function sanitizeHistoryEntries(entries) {
    return entries.map(entry => {
        const sanitized = { ...entry };
        const metadata = createHistoryMetadata(entry);
        sanitized.meta = {
            ...metadata,
            ...sanitized.meta
        };
        if ('cart' in sanitized) {
            delete sanitized.cart;
        }
        return sanitized;
    });
}

function createHistoryMetadata(menuSnapshot = menuData, overrides = {}) {
    const categories = Array.isArray(menuSnapshot?.categories) ? menuSnapshot.categories : [];
    const categoryCount = categories.length;
    const itemCount = categories.reduce((sum, category) => sum + (category.items?.length || 0), 0);
    const previewItems = [];
    categories.forEach(category => {
        if (category.items?.length) {
            previewItems.push(`${category.name}·${category.items[0].name}`);
        }
    });
    const baseMeta = menuSnapshot?.meta || {};
    const fallbackPreview = baseMeta.preview || previewItems.slice(0, 3).join(', ') || '無品項預覽';
    const fallbackCreatedBy = baseMeta.createdBy || menuSnapshot?.createdBy || currentUser?.username || '未知';
    return {
        categoryCount,
        itemCount,
        preview: fallbackPreview,
        createdBy: fallbackCreatedBy,
        estimatedTotal: baseMeta.estimatedTotal,
        estimatedPerPerson: baseMeta.estimatedPerPerson,
        ...overrides
    };
}

function persistCartState() {
    try {
        const payload = {
            cart,
            peopleCount,
            tableCount,
            customerName: elements.customerName?.value || '',
            customerTaxId: elements.customerTaxId?.value || '',
            diningDateTime: getDiningDateTime(),
            updatedAt: new Date().toISOString()
        };
        localStorage.setItem(CART_STATE_KEY, JSON.stringify(payload));
    } catch (error) {
        console.warn('儲存購物車狀態失敗：', error);
    }
}

function restoreCartState() {
    try {
        const raw = localStorage.getItem(CART_STATE_KEY);
        if (!raw) return false;
        const payload = JSON.parse(raw);
        cart = Array.isArray(payload?.cart) ? payload.cart : [];
        if (Number(payload?.peopleCount) > 0) {
            peopleCount = payload.peopleCount;
            if (elements.peopleCountInput) {
                elements.peopleCountInput.value = peopleCount;
            }
        }
        if (Number(payload?.tableCount) > 0) {
            tableCount = payload.tableCount;
            if (elements.tableCountInput) {
                elements.tableCountInput.value = tableCount;
            }
        }
        // 恢復客戶資訊
        if (payload?.customerName && elements.customerName) {
            elements.customerName.value = payload.customerName;
        }
        if (payload?.customerTaxId && elements.customerTaxId) {
            elements.customerTaxId.value = payload.customerTaxId;
        }
        if (payload?.diningDateTime) {
            setDiningDateTime(payload.diningDateTime);
        }
        return true;
    } catch (error) {
        console.warn('載入購物車狀態失敗：', error);
        return false;
    }
}

function clearCartStateStorage() {
    localStorage.removeItem(CART_STATE_KEY);
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
    elements.toggleMode.addEventListener('click', () => {
        if (!currentUser) {
            requireLogin(toggleMode);
            return;
        }
        toggleMode();
    });
    if (elements.viewChangeLog) {
        elements.viewChangeLog.addEventListener('click', showChangeLogModal);
    }
    
    // 類別管理
    elements.addCategory.addEventListener('click', () => {
        if (!ensureEditorAccess()) return;
        showCategoryModal();
    });
    
    // 匯入匯出
    elements.importMenu.addEventListener('click', () => {
        if (!ensureEditorAccess()) return;
        showImportModal();
    });
    elements.exportCartExcel.addEventListener('click', exportCartToExcel);
    elements.exportCartImage.addEventListener('click', exportCartToImage);
    
    // 儲存載入
    elements.saveMenu.addEventListener('click', () => {
        if (!ensureEditorAccess()) return;
        saveMenuToStorage();
    });
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
    
    // 客戶資訊欄位自動保存
    if (elements.customerName) {
        elements.customerName.addEventListener('change', persistCartState);
    }
    if (elements.customerTaxId) {
        elements.customerTaxId.addEventListener('change', persistCartState);
    }
    // 用餐日期時間選擇器
    if (elements.diningDate) {
        elements.diningDate.addEventListener('change', persistCartState);
    }
    if (elements.diningHour) {
        elements.diningHour.addEventListener('change', persistCartState);
    }
    if (elements.diningMinute) {
        elements.diningMinute.addEventListener('change', persistCartState);
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
    if (!ensureEditorAccess()) return;
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
    if (!ensureEditorAccess()) return addCategory();
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
    if (!ensureAdminAccess()) return;
    if (confirm('確定要刪除此類別？此操作無法復原。')) {
        menuData.categories = menuData.categories.filter(c => c.id !== categoryId);
        removeInvalidCartItems();
        renderMenu();
        renderCart();
        updateCartSummary();
        saveToStorage();
    }
}

// 品項管理
function showItemModal(categoryId = null) {
    if (!ensureEditorAccess()) return;
    editingItem = { categoryId, itemId: null };
    document.getElementById('itemModalTitle').textContent = '新增品項';
    document.getElementById('itemName').value = '';
    document.getElementById('itemNameEn').value = '';
    document.getElementById('itemDescription').value = '';
    document.getElementById('itemPrice').value = '';
    document.getElementById('itemModal').style.display = 'block';
}

function editItem(categoryId, itemId) {
    if (!ensureEditorAccess()) return;
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
    if (!ensureEditorAccess()) return;
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
    
    let itemToSync = null;
    
    if (editingItem.itemId) {
        // 編輯現有品項
        const item = category.items.find(i => i.id === editingItem.itemId);
        if (item) {
            item.name = name;
            item.nameEn = nameEn;
            item.description = description;
            item.price = price;
            itemToSync = item;
            
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
        itemToSync = newItem;
    }
    
    // 同步到 menu_items 表
    if (itemToSync) {
        syncItemToMenuItems(itemToSync, category.name, 'upsert');
    }
    
    renderMenu();
    renderCart();
    updateCartSummary();
    persistCartState();
    document.getElementById('itemModal').style.display = 'none';
    saveToStorage();
}

function deleteItem(categoryId, itemId) {
    if (!ensureEditorAccess()) return;
    if (confirm('確定要刪除此品項？')) {
        const category = menuData.categories.find(c => c.id === categoryId);
        if (category) {
            const itemToDelete = category.items.find(i => i.id === itemId);
            category.items = category.items.filter(i => i.id !== itemId);
            // 從購物車移除
            cart = cart.filter(item => item.id !== itemId);
            
            // 同步刪除到 menu_items 表
            if (itemToDelete) {
                syncItemToMenuItems(itemToDelete, category.name, 'delete');
            }
            
            renderMenu();
            renderCart();
            updateCartSummary();
            persistCartState();
            saveToStorage();
        }
    }
}

// 購物車功能
function addToCart(categoryId, itemId) {
    if (!currentUser) {
        requireLogin(() => addToCart(categoryId, itemId));
        return;
    }
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
            nameEn: item.nameEn || item.enName || '',
            price: item.price,
            quantity: tableCount, // 使用桌數作為初始數量
            categoryId: categoryId
        };
        cart.push(cartItem);
        persistCartState();
        renderCart();
        renderMenu(); // 重新渲染菜單以更新選中狀態
        updateCartSummary();
    }
}

function removeFromCart(itemId) {
    if (!currentUser) {
        requireLogin(() => removeFromCart(itemId));
        return;
    }
    cart = cart.filter(item => item.id !== itemId);
    renderCart();
    renderMenu(); // 重新渲染菜單以更新選中狀態
    updateCartSummary();
    persistCartState();
}

function updateCartItemQuantity(itemId, quantity) {
    if (!currentUser) {
        requireLogin(() => updateCartItemQuantity(itemId, quantity));
        return;
    }
    const cartItem = cart.find(item => item.id === itemId);
    if (cartItem) {
        if (quantity <= 0) {
            removeFromCart(itemId);
        } else {
            cartItem.quantity = quantity;
            renderCart();
            updateCartSummary();
            persistCartState();
        }
    }
}

function changePeopleCount(delta) {
    if (!currentUser) {
        requireLogin(() => changePeopleCount(delta));
        return;
    }
    console.log(`changePeopleCount 被呼叫，delta: ${delta}, 目前人數: ${peopleCount}`);
    const newCount = peopleCount + delta;
    if (newCount >= 1 && newCount <= 99) {
        peopleCount = newCount;
        elements.peopleCountInput.value = peopleCount;
        console.log(`人數已更改為: ${peopleCount}`);
        updateCartSummary();
        persistCartState();
    }
}

function updatePeopleCount() {
    if (!currentUser) {
        requireLogin(updatePeopleCount);
        return;
    }
    const count = parseInt(elements.peopleCountInput.value);
    if (count >= 1 && count <= 99) {
        peopleCount = count;
        updateCartSummary();
        persistCartState();
    } else {
        elements.peopleCountInput.value = peopleCount;
    }
}

// 桌數控制
function changeTableCount(delta) {
    if (!currentUser) {
        requireLogin(() => changeTableCount(delta));
        return;
    }
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
        persistCartState();
    }
}

function updateTableCount() {
    if (!currentUser) {
        requireLogin(updateTableCount);
        return;
    }
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
        persistCartState();
    } else {
        elements.tableCountInput.value = tableCount;
    }
}

// 清除購物車
function clearCart() {
    if (!currentUser) {
        requireLogin(clearCart);
        return;
    }
    if (cart.length === 0) {
        return;
    }
    
    cart = [];
    
    // 清除客戶資訊
    if (elements.customerName) {
        elements.customerName.value = '';
    }
    if (elements.customerTaxId) {
        elements.customerTaxId.value = '';
    }
    // 清除用餐日期時間
    setDiningDateTime('');
    
    renderCart();
    renderMenu(); // 重新渲染菜單以移除選中狀態
    updateCartSummary();
    persistCartState();
}

function removeInvalidCartItems() {
    const validItemIds = new Set();
    menuData.categories.forEach(category => {
        category.items?.forEach(item => validItemIds.add(item.id));
    });
    const originalLength = cart.length;
    cart = cart.filter(item => validItemIds.has(item.id));
    if (cart.length !== originalLength) {
        persistCartState();
        return true;
    }
    return false;
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
    persistCartState();
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
    
    // 顯示客戶資訊
    const customerName = elements.customerName?.value?.trim() || '未填寫';
    const diningDateTime = getDiningDateTime();
    document.getElementById('saveMenuCustomerName').textContent = customerName;
    document.getElementById('saveMenuDiningDateTime').textContent = diningDateTime ? formatDate(new Date(diningDateTime)) : '未設定';
    
    // 顯示儲存模態框
    document.getElementById('saveMenuModal').style.display = 'block';
}

function confirmSaveMenu() {
    const customerName = elements.customerName?.value?.trim();
    if (!customerName) {
        alert('請輸入客戶名稱');
        elements.customerName?.focus();
        document.getElementById('saveMenuModal').style.display = 'none';
        return;
    }
    
    const customerTaxId = elements.customerTaxId?.value?.trim() || '';
    const diningDateTime = getDiningDateTime();
    
    // 使用客戶名稱作為菜單名稱
    const menuName = customerName;
    
    const menuSnapshot = deepClone(menuData);
    const createdBy = currentUser?.username || '未知';
    
    // 計算購物車中的餐點數量和金額
    const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const serviceFee = Math.round(subtotal * 0.1);
    const estimatedTotal = subtotal + serviceFee;
    const estimatedPerPerson = Math.round(estimatedTotal / (peopleCount || 1));
    
    // 建立購物車預覽
    const cartPreview = cart.slice(0, 3).map(item => item.name).join(', ') + (cart.length > 3 ? '...' : '');
    
    const menuVersion = {
        ...menuSnapshot,
        peopleCount: peopleCount,
        tableCount: tableCount,
        customerName: customerName,
        customerTaxId: customerTaxId,
        diningDateTime: diningDateTime,
        savedAt: new Date().toISOString(),
        name: menuName,
        cart: deepClone(cart), // 保存購物車內容
        meta: {
            ...createHistoryMetadata(menuSnapshot, { createdBy }),
            itemCount: cartItemCount,
            estimatedTotal: estimatedTotal,
            estimatedPerPerson: estimatedPerPerson,
            preview: cartPreview || '無品項'
        }
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
    saveToStorage({ reason: 'manual-save', summary: `儲存菜單「${menuName}」`, menuName });
}

function saveToStorage(options = {}) {
    const snapshot = getCurrentStateSnapshot();
    upsertAutoHistoryEntry(snapshot);
    const currentData = getCurrentStatePayload(snapshot);
    localStorage.setItem('currentMenu', JSON.stringify(currentData));
    syncStateToSupabase(currentData);
    if (!options.skipChangeLog) {
        recordMenuChange(options.reason || 'auto-sync', snapshot, {
            summary: options.summary,
            menuName: options.menuName
        });
    }
    return snapshot;
}

async function showChangeLogModal() {
    const modal = document.getElementById('changeLogModal');
    const content = document.getElementById('changeLogContent');
    if (!modal || !content) return;
    modal.style.display = 'block';
    content.innerHTML = '<div class="change-log-loading"><i class="fas fa-spinner fa-spin"></i> 載入中…</div>';
    try {
        await refreshChangeLogEntries();
    } catch (error) {
        console.warn('載入最新修改紀錄失敗：', error);
    }
    renderChangeLogEntries();
}

async function manualCloudSave() {
    const client = supabaseClient || await initSupabaseClient();
    if (!client) {
        showSyncStatus('無法連線至雲端，請稍後再試', 'error');
        return;
    }
    saveToStorage({ reason: 'manual-sync', summary: '手動同步菜單' });
}

function upsertAutoHistoryEntry(statePayload) {
    try {
        if (!statePayload || !statePayload.menu) return;
        const savedMenus = getSavedMenus();
        const autoEntry = createAutoHistoryEntry(statePayload);
        const existingIndex = savedMenus.findIndex(menu => menu.flag === AUTO_HISTORY_FLAG);
        if (existingIndex >= 0) {
            savedMenus[existingIndex] = autoEntry;
        } else {
            savedMenus.unshift(autoEntry);
        }
        if (savedMenus.length > 50) {
            savedMenus.splice(50);
        }
        localStorage.setItem('savedMenus', JSON.stringify(savedMenus));
    } catch (error) {
        console.warn('更新修改紀錄失敗：', error);
    }
}

function createAutoHistoryEntry(statePayload) {
    const timestamp = new Date();
    const clonedMenu = deepClone(statePayload.menu);
    const author = statePayload.updatedBy || currentUser?.username || '系統';
    return {
        ...clonedMenu,
        peopleCount: statePayload.peopleCount,
        tableCount: statePayload.tableCount,
        savedAt: timestamp.toISOString(),
        name: `最新同步 ${formatDate(timestamp)}`,
        autoGenerated: true,
        flag: AUTO_HISTORY_FLAG,
        meta: createHistoryMetadata(clonedMenu, { createdBy: author })
    };
}

function showHistoryModal() {
    document.getElementById('historyModal').style.display = 'block';
    renderHistoryList();
    
    // 確保Modal事件正確綁定
    bindModalEvents();
}

function renderHistoryList() {
    const savedMenus = getSavedMenus();
    const historyList = document.getElementById('historyList');
    const searchTerm = document.getElementById('historySearch').value.toLowerCase();
    const sortBy = historySort.field;
    
    let filteredMenus = savedMenus.filter(menu => {
        // 搜尋菜單名稱
        if (menu.name && menu.name.toLowerCase().includes(searchTerm)) {
            return true;
        }
        
        // 搜尋菜單分類與品項名稱
        if (Array.isArray(menu.categories)) {
            const foundInCategories = menu.categories.some(category => {
                if (category.name?.toLowerCase().includes(searchTerm)) {
                    return true;
                }
                return category.items?.some(item => 
                    item.name?.toLowerCase().includes(searchTerm) ||
                    (item.nameEn && item.nameEn.toLowerCase().includes(searchTerm))
                );
            });
            if (foundInCategories) {
                return true;
            }
        }
        
        // 舊版歷史資料中的購物車搜尋（相容用）
        if (menu.cart && menu.cart.length > 0) {
            return menu.cart.some(item => 
                item.name?.toLowerCase().includes(searchTerm) ||
                (item.nameEn && item.nameEn.toLowerCase().includes(searchTerm))
            );
        }

        if (menu.meta?.preview && menu.meta.preview.toLowerCase().includes(searchTerm)) {
            return true;
        }
        
        return false;
    });
    
    // 排序
    filteredMenus.sort((a, b) => {
        let result = 0;
        switch (sortBy) {
            case 'price':
                const aPrice = getHistoryMetrics(a).perPerson || 0;
                const bPrice = getHistoryMetrics(b).perPerson || 0;
                result = bPrice - aPrice;
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
                result = (getHistoryMetrics(b).total || 0) - (getHistoryMetrics(a).total || 0);
                break;
            case 'items':
                result = (getHistoryMetrics(b).itemCount || 0) - (getHistoryMetrics(a).itemCount || 0);
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
                    <th class="sortable ${historySort.field === 'date' ? 'sort-' + historySort.direction : ''}" onclick="sortHistoryBy('date')">用餐日期</th>
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
                    const metrics = getHistoryMetrics(menu);
                    const total = metrics.total;
                    const perPerson = metrics.perPerson;
                    const originalMenuIndex = savedMenus.indexOf(menu);
                    
                    const cartPreview = metrics.preview;
                    
                    // 優先使用用餐日期時間，如果沒有則使用儲存時間
                    const displayDate = menu.diningDateTime ? formatDate(new Date(menu.diningDateTime)) : formatDate(new Date(menu.savedAt));
                    
                    return `
                        <tr class="history-row" onclick="loadHistoryMenu(${originalMenuIndex})" style="cursor: pointer;">
                            <td class="menu-name-cell" title="${menu.name || '未命名菜單'}">${menu.name || '未命名菜單'}</td>
                            <td class="date-cell">${displayDate}</td>
                            <td class="count-cell">${metrics.itemCount}</td>
                            <td class="people-cell">${menu.peopleCount || 1}</td>
                            <td class="table-cell">${menu.tableCount || 1}</td>
                            <td class="total-cell">${typeof total === 'number' ? '$' + total : '--'}</td>
                            <td class="perperson-cell">${typeof perPerson === 'number' ? '$' + perPerson : '--'}</td>
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

function getHistoryMetrics(menu) {
    const meta = menu.meta || {};
    const legacy = menu.cart ? getLegacyCartSummary(menu) : null;
    const total = Number.isFinite(meta.estimatedTotal) ? meta.estimatedTotal : legacy?.total ?? null;
    const perPerson = Number.isFinite(meta.estimatedPerPerson) ? meta.estimatedPerPerson : legacy?.perPerson ?? null;
    const itemCount = Number.isFinite(meta.itemCount) ? meta.itemCount : legacy?.itemCount ?? 0;
    const preview = meta.preview || legacy?.preview || '無品項預覽';
    return { total, perPerson, itemCount, preview };
}

function getLegacyCartSummary(menu) {
    if (!Array.isArray(menu.cart) || menu.cart.length === 0) {
        return null;
    }
    const subtotal = menu.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const serviceFee = Math.round(subtotal * 0.1);
    const total = subtotal + serviceFee;
    const perPerson = Math.round(total / (menu.peopleCount || 1));
    const preview = menu.cart.slice(0, 2).map(item => item.name).join(', ') + (menu.cart.length > 2 ? '...' : '');
    return {
        itemCount: menu.cart.length,
        total,
        perPerson,
        preview: preview || '無項目'
    };
}

function loadHistoryMenu(index) {
    const savedMenus = getSavedMenus();
    const menu = savedMenus[index];
    
    if (menu) {
        menuData = {
            categories: menu.categories || [],
            version: menu.version || '1.0.0',
            createdAt: menu.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        if (Number(menu.peopleCount) > 0) {
            peopleCount = menu.peopleCount;
            if (elements.peopleCountInput) {
                elements.peopleCountInput.value = peopleCount;
            }
        }
        if (Number(menu.tableCount) > 0) {
            tableCount = menu.tableCount;
            if (elements.tableCountInput) {
                elements.tableCountInput.value = tableCount;
            }
        }
        
        // 恢復購物車內容
        if (Array.isArray(menu.cart)) {
            cart = deepClone(menu.cart);
        }
        
        // 恢復客戶資訊
        if (elements.customerName) {
            elements.customerName.value = menu.customerName || menu.name || '';
        }
        if (elements.customerTaxId) {
            elements.customerTaxId.value = menu.customerTaxId || '';
        }
        // 恢復用餐日期時間
        setDiningDateTime(menu.diningDateTime || '');
        
        renderMenu();
        renderCart();
        updateCartSummary();
        document.getElementById('historyModal').style.display = 'none';
        persistCartState();
        alert('菜單已載入，可繼續編輯');
    }
}

function editHistoryMenu(index) {
    // 直接載入該菜單進行編輯
    loadHistoryMenu(index);
}

function deleteHistoryMenu(index) {
    const savedMenus = getSavedMenus();
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
    const englishName = item.nameEn || item.enName || '';
    
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
                    ${englishName ? `<span class="item-name-en">${englishName}</span>` : ''}
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
                    ${cartByCategory[categoryId].map(item => {
                        const englishName = item.nameEn || item.enName || '';
                        return `
                        <div class="cart-item-compact">
                            <div class="cart-item-info">
                                <div class="cart-item-name-compact">${item.name} 單價 $${item.price}</div>
                                <div class="cart-item-name-en-compact">${englishName}</div>
                            </div>
                            <div class="cart-item-controls-compact">
                                <button class="btn-qty-compact" onclick="updateCartItemQuantity('${item.id}', ${item.quantity - 1})">-</button>
                                <span class="qty-display">${item.quantity}</span>
                                <button class="btn-qty-compact" onclick="updateCartItemQuantity('${item.id}', ${item.quantity + 1})">+</button>
                            </div>
                            <div class="cart-item-price-compact">$${item.price * item.quantity}</div>
                        </div>
                    `}).join('')}
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

    if (elements.confirmLogin) {
        elements.confirmLogin.addEventListener('click', handleLogin);
    }
    if (elements.addAccountButton) {
        elements.addAccountButton.addEventListener('click', addAccount);
    }
    if (elements.accountList) {
        elements.accountList.addEventListener('click', event => {
            const target = event.target.closest('[data-delete-account]');
            if (target) {
                const username = target.getAttribute('data-delete-account');
                deleteAccount(username);
            }
        });
    }
}

function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.style.display = 'block';
    }
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.style.display = 'none';
    }
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

function deepClone(value) {
    if (value === null || value === undefined) return value;
    try {
        return JSON.parse(JSON.stringify(value));
    } catch (error) {
        console.warn('深拷貝失敗：', error);
        return value;
    }
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
