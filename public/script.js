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

// ========== 本地下拉選項（方案/包場範圍/用餐方式/付款） ==========
const localOptionDefaults = {
    planType: ['大訂', '包場'],
    venueScope: ['全包', '叢林區', '蘆葦區'],
    diningStyle: ['自助', '桌菜'],
    paymentMethod: ['匯款', '刷卡', '當天結帳']
};

const localOptionTitles = {
    planType: '方案',
    venueScope: '包場範圍',
    diningStyle: '用餐方式',
    paymentMethod: '付款方式'
};

let localOptions = {
    planType: [...localOptionDefaults.planType],
    venueScope: [...localOptionDefaults.venueScope],
    diningStyle: [...localOptionDefaults.diningStyle],
    paymentMethod: [...localOptionDefaults.paymentMethod]
};

function loadLocalOptions(type) {
    try {
        const stored = localStorage.getItem(`localOptions-${type}`);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length) {
                localOptions[type] = parsed;
            }
        }
    } catch (err) {
        console.warn(`讀取 ${type} 選項失敗`, err);
    }
    if (!Array.isArray(localOptions[type]) || localOptions[type].length === 0) {
        localOptions[type] = [...localOptionDefaults[type]];
    }
    return localOptions[type];
}

function saveLocalOptions(type, options) {
    localOptions[type] = options;
    localStorage.setItem(`localOptions-${type}`, JSON.stringify(options));
    renderLocalSelect(type);
}

function renderLocalSelect(type) {
    const map = {
        planType: elements.planType,
        venueScope: elements.venueScope,
        diningStyle: elements.diningStyle,
        paymentMethod: elements.paymentMethod
    };
    const select = map[type];
    if (!select) return;
    const options = loadLocalOptions(type);
    const current = select.value;
    select.innerHTML = '<option value=\"\">請選擇</option>' + options.map(opt => `<option value=\"${opt}\">${opt}</option>`).join('');
    if (current && options.includes(current)) {
        select.value = current;
    } else {
        select.value = '';
    }
    markFillState(select);
}

function initLocalOptionSelects() {
    Object.keys(localOptionDefaults).forEach(type => {
        loadLocalOptions(type);
        renderLocalSelect(type);
    });
}

function showLocalOptionManager(type) {
    const title = localOptionTitles[type] || '選項';
    let modal = document.getElementById(`optionModal-${type}`);
    if (!modal) {
        modal = document.createElement('div');
        modal.id = `optionModal-${type}`;
        modal.className = 'modal';
        document.body.appendChild(modal);
    }
    modal.innerHTML = `
        <div class=\"modal-content\" style=\"max-width: 420px;\">
            <div class=\"modal-header\">
                <h3><i class=\"fas fa-list\"></i> ${title}管理</h3>
                <button class=\"close-modal\" onclick=\"closeLocalOptionModal('${type}')\">&times;</button>
            </div>
            <div class=\"modal-body\">
                <div id=\"optionList-${type}\" class=\"option-list\"></div>
                <div style=\"display: flex; gap: 0.5rem; margin-top: 0.8rem;\">
                    <input type=\"text\" id=\"newOption-${type}\" placeholder=\"新增${title}\" class=\"input-field\" style=\"flex: 1;\">
                    <button class=\"btn btn-primary\" onclick=\"addLocalOption('${type}')\"><i class=\"fas fa-plus\"></i> 新增</button>
                </div>
            </div>
        </div>
    `;
    modal.style.display = 'block';
    renderLocalOptionList(type);
}

function closeLocalOptionModal(type) {
    const modal = document.getElementById(`optionModal-${type}`);
    if (modal) modal.style.display = 'none';
}

function renderLocalOptionList(type) {
    const list = document.getElementById(`optionList-${type}`);
    if (!list) return;
    const options = loadLocalOptions(type);
    list.innerHTML = options.map((opt, idx) => `
        <div class=\"option-row\" data-idx=\"${idx}\">
            <span class=\"drag-handle\" title=\"拖曳排序\"><i class=\"fas fa-grip-vertical\"></i></span>
            <span class=\"option-text\">${opt}</span>
            <div class=\"option-actions\">
                <button class=\"btn btn-small btn-secondary\" onclick=\"editLocalOption('${type}', ${idx})\"><i class=\"fas fa-edit\"></i></button>
                <button class=\"btn btn-small btn-danger\" onclick=\"deleteLocalOption('${type}', ${idx})\"><i class=\"fas fa-trash\"></i></button>
            </div>
        </div>
    `).join('');
    if (list._sortable) {
        list._sortable.destroy();
    }
    list._sortable = new Sortable(list, {
        animation: 150,
        handle: '.drag-handle',
        onEnd: () => {
            const newOrder = Array.from(list.querySelectorAll('.option-row')).map(row => {
                const idx = parseInt(row.dataset.idx, 10);
                return options[idx];
            }).filter(Boolean);
            saveLocalOptions(type, newOrder);
            renderLocalOptionList(type);
            renderLocalSelect(type);
        }
    });
}

function addLocalOption(type) {
    const input = document.getElementById(`newOption-${type}`);
    const text = input?.value?.trim() || '';
    if (!text) {
        alert('請輸入內容');
        return;
    }
    const options = loadLocalOptions(type);
    if (options.includes(text)) {
        alert('已存在相同選項');
        return;
    }
    options.push(text);
    saveLocalOptions(type, options);
    renderLocalOptionList(type);
    input.value = '';
    renderLocalSelect(type);
}

function editLocalOption(type, idx) {
    const options = loadLocalOptions(type);
    const current = options[idx];
    const text = prompt('修改內容', current);
    if (!text) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    if (options.some((opt, i) => i !== idx && opt === trimmed)) {
        alert('已存在相同選項');
        return;
    }
    options[idx] = trimmed;
    saveLocalOptions(type, options);
    renderLocalOptionList(type);
    renderLocalSelect(type);
}

function deleteLocalOption(type, idx) {
    const options = loadLocalOptions(type);
    options.splice(idx, 1);
    saveLocalOptions(type, options);
    renderLocalOptionList(type);
    renderLocalSelect(type);
}

if (typeof window !== 'undefined') {
    window.showLocalOptionManager = showLocalOptionManager;
    window.closeLocalOptionModal = closeLocalOptionModal;
    window.addLocalOption = addLocalOption;
    window.editLocalOption = editLocalOption;
    window.deleteLocalOption = deleteLocalOption;
}


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
const DEFAULT_SATIETY_BASELINE = 500;
const CATEGORY_TYPE = {
    FOOD: 'food',
    SOFT: 'softDrink',
    DRINK: 'drink'
};
let supabaseClient = null;
let supabaseSyncQueue = Promise.resolve();
let supabaseInitialized = false;
let syncStatusTimer = null;
let accounts = [];
let currentUser = null;
let postLoginAction = null;
let changeLogEntries = [];
let lastChangeFingerprint = null;
let isUserEditing = false; // 追蹤用戶是否正在編輯
let pendingMenuSync = null; // 待處理的菜單同步

// 功能 B：追蹤當前編輯的訂單 ID（null 表示新訂單）
let currentEditingOrderId = null;

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
    foodItemTypes: document.getElementById('foodItemTypes'),
    foodItemCount: document.getElementById('foodItemCount'),
    softDrinkItemTypes: document.getElementById('softDrinkItemTypes'),
    softDrinkItemCount: document.getElementById('softDrinkItemCount'),
    drinkItemTypes: document.getElementById('drinkItemTypes'),
    drinkItemCount: document.getElementById('drinkItemCount'),
    loginModal: document.getElementById('loginModal'),
    accountModal: document.getElementById('accountModal'),
    loginUsername: document.getElementById('loginUsername'),
    confirmLogin: document.getElementById('confirmLogin'),
    accountList: document.getElementById('accountList'),
    newAccountName: document.getElementById('newAccountName'),
    newAccountRole: document.getElementById('newAccountRole'),
    addAccountButton: document.getElementById('addAccountButton'),
    // 客戶資訊欄位
    customerName: document.getElementById('customerName'), // 保留兼容
    customerTaxId: document.getElementById('customerTaxId'),
    diningDate: document.getElementById('diningDate'),
    diningHour: document.getElementById('diningHour'),
    diningMinute: document.getElementById('diningMinute'),
    // 訂單資訊欄位
    companyName: document.getElementById('companyName'),
    contactName: document.getElementById('contactName'),
    contactPhone: document.getElementById('contactPhone'),
    planType: document.getElementById('planType'),
    lineName: document.getElementById('lineName'),
    industrySelect: document.getElementById('industrySelect'),
    manageIndustry: document.getElementById('manageIndustry'),
    managePlanType: document.getElementById('managePlanType'),
    manageVenueScope: document.getElementById('manageVenueScope'),
    manageDiningStyle: document.getElementById('manageDiningStyle'),
    managePaymentMethod: document.getElementById('managePaymentMethod'),
    venueContentSelect: document.getElementById('venueContentSelect'),
    manageVenueContent: document.getElementById('manageVenueContent'),
    venueScope: document.getElementById('venueScope'),
    diningStyle: document.getElementById('diningStyle'),
    paymentMethod: document.getElementById('paymentMethod'),
    discount: document.getElementById('discount'),
    depositPaid: document.getElementById('depositPaid'),
    discountAmount: document.getElementById('discountAmount'),
    discountTotal: document.getElementById('discountTotal')
};

// 取得 radio 選項值
function getRadioValue(name) {
    const radio = document.querySelector(`input[name="${name}"]:checked`);
    return radio ? radio.value : '';
}

// 設定 radio 選項值
function setRadioValue(name, value) {
    if (!value) return;
    const radio = document.querySelector(`input[name="${name}"][value="${value}"]`);
    if (radio) radio.checked = true;
}

// 折扣計算：支援百分比（例如 "10%"）或固定金額（例如 "500"），僅用於顯示，不影響小計/服務費/總計
function calculateDiscountValue(subtotal, discountInput) {
    const parsed = (discountInput || '').toString().trim();
    let discountValue = 0;
    if (parsed.endsWith('%')) {
        const percent = parseFloat(parsed.replace('%', '').trim());
        if (!Number.isNaN(percent) && percent >= 0) {
            discountValue = Math.min(subtotal, Math.round(subtotal * (percent / 100)));
        }
    } else if (parsed) {
        const amount = parseFloat(parsed);
        if (!Number.isNaN(amount) && amount > 0) {
            discountValue = Math.min(subtotal, amount);
        }
    }
    return discountValue;
}

function calculateTotalsWithoutDiscount(cartItems, people) {
    const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const serviceFee = Math.round(subtotal * 0.1);
    const total = subtotal + serviceFee;
    const perPerson = Math.round(total / Math.max(people, 1));
    return { subtotal, serviceFee, total, perPerson };
}

// ========== 功能 A：可重複使用的自訂下拉選單函式 ==========
/**
 * 為下拉選單附加「其他（自訂）」功能
 * @param {string} selectId - 下拉選單的 ID
 * @param {string} customInputId - 自訂輸入框的 ID
 * @param {Array<string>} defaultOptions - 預設選項列表（不包含「其他（自訂）」）
 */
function attachCustomizableSelect(selectId, customInputId, defaultOptions) {
    const select = document.getElementById(selectId);
    const customInput = document.getElementById(customInputId);
    
    if (!select || !customInput) {
        console.warn(`無法找到元素: ${selectId} 或 ${customInputId}`);
        return;
    }
    
    // 確保下拉選單有「其他（自訂）」選項
    const hasCustomOption = Array.from(select.options).some(opt => opt.value === '__CUSTOM__');
    if (!hasCustomOption) {
        const customOption = document.createElement('option');
        customOption.value = '__CUSTOM__';
        customOption.textContent = '其他（自訂）';
        select.appendChild(customOption);
    }
    
    // 監聽下拉選單變更
    select.addEventListener('change', function() {
        if (select.value === '__CUSTOM__') {
            customInput.style.display = 'block';
            customInput.focus();
        } else {
            customInput.style.display = 'none';
            customInput.value = '';
        }
    });
    
    // 儲存時，如果選到「其他（自訂）」，使用自訂輸入框的值
    // 這個邏輯會在 getOrderInfo 中處理
}

/**
 * 取得自訂下拉選單的值（處理「其他（自訂）」邏輯）
 * @param {string} selectId - 下拉選單的 ID
 * @param {string} customInputId - 自訂輸入框的 ID
 * @returns {string} 選中的值或自訂值
 */
function getCustomizableSelectValue(selectId, customInputId) {
    const select = document.getElementById(selectId);
    const customInput = document.getElementById(customInputId);
    
    if (!select) return '';
    
    if (select.value === '__CUSTOM__') {
        return customInput?.value?.trim() || '';
    }
    return select.value || '';
}

/**
 * 設定自訂下拉選單的值（處理載入時的邏輯）
 * @param {string} selectId - 下拉選單的 ID
 * @param {string} customInputId - 自訂輸入框的 ID
 * @param {Array<string>} defaultOptions - 預設選項列表
 * @param {string} value - 要設定的值
 */
function setCustomizableSelectValue(selectId, customInputId, defaultOptions, value) {
    const select = document.getElementById(selectId);
    const customInput = document.getElementById(customInputId);
    
    if (!select || !value) return;
    
    // 檢查值是否在預設選項中
    if (defaultOptions.includes(value)) {
        select.value = value;
        if (customInput) {
            customInput.style.display = 'none';
            customInput.value = '';
        }
    } else {
        // 不在預設選項中，設為「其他（自訂）」並填入自訂值
        select.value = '__CUSTOM__';
        if (customInput) {
            customInput.value = value;
            customInput.style.display = 'block';
        }
    }
}

// 取得完整訂單資訊（更新以支援自訂下拉選單）
function getOrderInfo() {
    return {
        companyName: elements.companyName?.value?.trim() || '',
        taxId: elements.customerTaxId?.value?.trim() || '',
        contactName: elements.contactName?.value?.trim() || '',
        contactPhone: elements.contactPhone?.value?.trim() || '',
        planType: elements.planType?.value || '',
        lineName: elements.lineName?.value?.trim() || '',
        industry: elements.industrySelect?.value || '',
        venueContent: elements.venueContentSelect?.value || '',
        venueScope: elements.venueScope?.value || '',
        diningStyle: elements.diningStyle?.value || '',
        paymentMethod: elements.paymentMethod?.value || '',
        discount: elements.discount?.value?.trim() || '',
        depositPaid: parseFloat(elements.depositPaid?.value) || 0,
        diningDateTime: getDiningDateTime(),
        tableCount: tableCount,
        peopleCount: peopleCount,
        customerBudget: parseFloat(elements.customerBudget?.value) || 0
    };
}

// 設定訂單資訊（更新以支援所有自訂下拉選單）
function setOrderInfo(info) {
    if (!info) return;
    if (info.companyName && elements.companyName) elements.companyName.value = info.companyName;
    if (info.taxId && elements.customerTaxId) elements.customerTaxId.value = info.taxId;
    if (info.contactName && elements.contactName) elements.contactName.value = info.contactName;
    if (info.contactPhone && elements.contactPhone) elements.contactPhone.value = info.contactPhone;
    if (info.lineName && elements.lineName) elements.lineName.value = info.lineName;
    if (typeof info.customerBudget !== 'undefined' && elements.customerBudget) {
        elements.customerBudget.value = info.customerBudget ?? '';
    }
    
    // 本地管理的選單：只設置存在於當前選項列表中的值
    if (info.planType && elements.planType) {
        const planOptions = loadLocalOptions('planType');
        if (planOptions.includes(info.planType)) {
            elements.planType.value = info.planType;
        } else {
            console.warn(`方案選項 "${info.planType}" 已從管理選單中刪除，不設置值`);
            elements.planType.value = '';
        }
    }
    if (info.venueScope && elements.venueScope) {
        const venueScopeOptions = loadLocalOptions('venueScope');
        if (venueScopeOptions.includes(info.venueScope)) {
            elements.venueScope.value = info.venueScope;
        } else {
            console.warn(`包場範圍選項 "${info.venueScope}" 已從管理選單中刪除，不設置值`);
            elements.venueScope.value = '';
        }
    }
    if (info.diningStyle && elements.diningStyle) {
        const diningStyleOptions = loadLocalOptions('diningStyle');
        if (diningStyleOptions.includes(info.diningStyle)) {
            elements.diningStyle.value = info.diningStyle;
        } else {
            console.warn(`用餐方式選項 "${info.diningStyle}" 已從管理選單中刪除，不設置值`);
            elements.diningStyle.value = '';
        }
    }
    if (info.paymentMethod && elements.paymentMethod) {
        const paymentOptions = loadLocalOptions('paymentMethod');
        if (paymentOptions.includes(info.paymentMethod)) {
            elements.paymentMethod.value = info.paymentMethod;
        } else {
            console.warn(`付款方式選項 "${info.paymentMethod}" 已從管理選單中刪除，不設置值`);
            elements.paymentMethod.value = '';
        }
    }
    
    // Supabase 管理的選單：只設置存在於當前選項列表中的值
    if (info.industry && elements.industrySelect) {
        const industryNames = industryOptions.map(opt => opt.name);
        if (industryNames.includes(info.industry)) {
            elements.industrySelect.value = info.industry;
        } else {
            console.warn(`產業別選項 "${info.industry}" 已從管理選單中刪除，不設置值`);
            elements.industrySelect.value = '';
        }
    }
    if (info.venueContent && elements.venueContentSelect) {
        const venueContentNames = venueContentOptions.map(opt => opt.name ?? opt.label ?? '');
        if (venueContentNames.includes(info.venueContent)) {
            elements.venueContentSelect.value = info.venueContent;
        } else {
            console.warn(`包場內容選項 "${info.venueContent}" 已從管理選單中刪除，不設置值`);
            elements.venueContentSelect.value = '';
        }
    }
    
    if (info.discount !== undefined && elements.discount) {
        elements.discount.value = info.discount;
    }
    
    // 處理時間設定（包含自訂時間）
    if (info.diningDateTime) {
        setDiningDateTime(info.diningDateTime);
    }
    
    if (info.depositPaid !== undefined && elements.depositPaid) elements.depositPaid.value = info.depositPaid;
    if (info.tableCount) {
        tableCount = info.tableCount;
        if (elements.tableCountInput) elements.tableCountInput.value = tableCount;
    }
    if (info.peopleCount) {
        peopleCount = info.peopleCount;
        if (elements.peopleCountInput) elements.peopleCountInput.value = peopleCount;
    }
    
    // 更新所有欄位的填寫狀態顏色
    initFillStateStyling();
}

// 確保選項存在（載入歷史資料時若值不在當前列表，會先補上一筆）
function ensureOptionExists(selectEl, value) {
    if (!selectEl || !value) return;
    const exists = Array.from(selectEl.options).some(opt => opt.value === value);
    if (!exists) {
        const selectId = selectEl.id;
        
        // 檢查是否為本地管理的選項（planType, venueScope, diningStyle, paymentMethod）
        const isLocalManaged = selectId === 'planType' || 
                              selectId === 'venueScope' || 
                              selectId === 'diningStyle' || 
                              selectId === 'paymentMethod';
        
        if (isLocalManaged) {
            // 對於本地管理的選項，檢查該值是否存在於當前的選項列表中
            const currentOptions = loadLocalOptions(selectId === 'planType' ? 'planType' :
                                                   selectId === 'venueScope' ? 'venueScope' :
                                                   selectId === 'diningStyle' ? 'diningStyle' :
                                                   'paymentMethod');
            if (!currentOptions.includes(value)) {
                // 如果該選項已經從管理選單中刪除，不添加它
                console.warn(`選項 "${value}" 已從 ${selectId} 的管理選單中刪除，不會自動添加`);
                return;
            }
        }
        
        // 檢查是否為 Supabase 管理的選項（industry, venueContent）
        const isSupabaseManaged = selectId === 'industrySelect' || selectId === 'venueContentSelect';
        
        if (isSupabaseManaged) {
            if (selectId === 'industrySelect') {
                // 檢查產業別選項是否存在於當前列表中
                const industryNames = industryOptions.map(opt => opt.name);
                if (!industryNames.includes(value)) {
                    console.warn(`產業別選項 "${value}" 已從管理選單中刪除，不會自動添加`);
                    return;
                }
            } else if (selectId === 'venueContentSelect') {
                // 檢查包場內容選項是否存在於當前列表中
                const venueContentNames = venueContentOptions.map(opt => opt.name ?? opt.label ?? '');
                if (!venueContentNames.includes(value)) {
                    console.warn(`包場內容選項 "${value}" 已從管理選單中刪除，不會自動添加`);
                    return;
                }
            }
        }
        
        // 只有當選項存在於當前列表中時，才添加它
        const opt = document.createElement('option');
        opt.value = value;
        opt.textContent = value;
        selectEl.appendChild(opt);
    }
}

// 取得組合的用餐日期時間（支援自訂時間）
function getDiningDateTime(customHour = null) {
    // 【步驟 1】檢查重複 DOM id
    const duplicateDateCount = document.querySelectorAll('#diningDate').length;
    const duplicateHourCount = document.querySelectorAll('#diningHour').length;
    const duplicateMinuteCount = document.querySelectorAll('#diningMinute').length;
    
    if (duplicateDateCount !== 1 || duplicateHourCount !== 1 || duplicateMinuteCount !== 1) {
        console.error('❌ 發現重複的 DOM id！', {
            diningDate: duplicateDateCount,
            diningHour: duplicateHourCount,
            diningMinute: duplicateMinuteCount
        });
        // 列出所有重複的元素
        document.querySelectorAll('#diningHour').forEach((el, idx) => {
            console.error(`重複的 #diningHour[${idx}]:`, {
                outerHTML: el.outerHTML.substring(0, 100),
                value: el.value,
                offsetParent: el.offsetParent !== null,
                display: window.getComputedStyle(el).display
            });
        });
    }
    
    // 【步驟 2】只讀主表單的欄位（不在 modal 內，直接讀主頁面）
    // 主表單的日期時間欄位在主頁面，不在任何 modal 內
    const dateEl = document.getElementById('diningDate');
    const hourEl = document.getElementById('diningHour');
    const minuteEl = document.getElementById('diningMinute');
    const customHourEl = document.getElementById('diningHourCustom');
    
    // 【步驟 3】強制驗證：更新前把「可疑欄位」全部列印出來
    const allHourElements = document.querySelectorAll('#diningHour');
    const hourElementsInfo = Array.from(allHourElements).map((el, idx) => ({
        index: idx,
        outerHTML: el.outerHTML.substring(0, 150),
        value: el.value,
        offsetParent: el.offsetParent !== null,
        display: window.getComputedStyle(el).display,
        visibility: window.getComputedStyle(el).visibility,
        isVisible: el.offsetParent !== null && window.getComputedStyle(el).display !== 'none'
    }));
    
    // 讀取值（不使用 customHour 參數，直接從 DOM 讀取）
    const date = dateEl?.value || '';
    const hour = hourEl?.value || ''; // 直接從 DOM 讀取，不使用 customHour 參數
    const minute = minuteEl?.value || '';
    
    console.log('🔍 [getDiningDateTime] 強制驗證 - 所有可疑欄位:', {
        duplicateCounts: {
            diningDate: duplicateDateCount,
            diningHour: duplicateHourCount,
            diningMinute: duplicateMinuteCount
        },
        allHourElements: hourElementsInfo,
        mainFormElements: {
            dateEl: {
                id: dateEl?.id,
                value: date,
                exists: !!dateEl,
                offsetParent: dateEl?.offsetParent !== null
            },
            hourEl: {
                id: hourEl?.id,
                value: hourEl?.value,
                exists: !!hourEl,
                offsetParent: hourEl?.offsetParent !== null,
                finalHour: hour
            },
            minuteEl: {
                id: minuteEl?.id,
                value: minute,
                exists: !!minuteEl,
                offsetParent: minuteEl?.offsetParent !== null
            },
            customHourEl: {
                id: customHourEl?.id,
                value: customHourEl?.value,
                display: customHourEl?.style.display,
                exists: !!customHourEl
            }
        },
        // 驗證：主表單內讀到的值
        mainFormValues: {
            date,
            hour,
            minute
        }
    });
    
    // 處理自訂時間
    let finalHour = hour;
    if (hour === '__CUSTOM__') {
        if (customHourEl && customHourEl.value) {
            finalHour = String(parseInt(customHourEl.value)).padStart(2, '0');
            console.log('🔍 [getDiningDateTime] 使用自訂小時:', finalHour);
        } else {
            finalHour = '';
            console.warn('⚠️ [getDiningDateTime] 選擇了自訂時間但沒有輸入值');
        }
    } else if (finalHour) {
        // 確保小時是兩位數格式
        finalHour = String(parseInt(finalHour)).padStart(2, '0');
    }
    
    // 確保分鐘是兩位數格式
    const minuteFormatted = minute ? String(parseInt(minute)).padStart(2, '0') : '';
    
    if (date && finalHour && minuteFormatted) {
        const result = `${date}T${finalHour}:${minuteFormatted}`;
        console.log('📅 [getDiningDateTime] 最終結果:', { 
            date, 
            hour: finalHour, 
            minute: minuteFormatted, 
            result,
            source: 'DOM元素直接讀取（主表單）'
        });
        return result;
    }
    
    console.warn('⚠️ [getDiningDateTime] 缺少必要值，返回空字串:', { date, hour: finalHour, minute: minuteFormatted });
    return '';
}

// 設定用餐日期時間
function setDiningDateTime(dateTimeStr) {
    if (!dateTimeStr) {
        if (elements.diningDate) elements.diningDate.value = '';
        if (elements.diningHour) elements.diningHour.value = '';
        if (elements.diningMinute) elements.diningMinute.value = '';
        const customHourInput = document.getElementById('diningHourCustom');
        if (customHourInput) {
            customHourInput.value = '';
            customHourInput.style.display = 'none';
        }
        // 更新顏色狀態
        if (elements.diningDate) markFillState(elements.diningDate);
        if (elements.diningHour) markFillState(elements.diningHour);
        if (elements.diningMinute) markFillState(elements.diningMinute);
        return;
    }
    try {
        // 【關鍵修復】避免時區轉換：直接從 ISO 字串解析，不使用 new Date()
        // 例如："2026-01-01T13:30:00+00:00" 或 "2026-01-01T13:30:00"
        let year, month, day, hour, minute;
        
        if (typeof dateTimeStr === 'string' && dateTimeStr.includes('T')) {
            // ISO 格式：直接解析字串，避免時區轉換
            const parts = dateTimeStr.split('T');
            if (parts.length >= 2) {
                const datePart = parts[0]; // "2026-01-01"
                const timePart = parts[1]; // "13:30:00+00:00" 或 "13:30:00"
                
                // 解析日期
                const dateParts = datePart.split('-');
                if (dateParts.length === 3) {
                    year = parseInt(dateParts[0], 10);
                    month = parseInt(dateParts[1], 10);
                    day = parseInt(dateParts[2], 10);
                }
                
                // 解析時間（只取前 5 個字元 "HH:MM"）
                const timeOnly = timePart.substring(0, 5); // "13:30"
                const timeParts = timeOnly.split(':');
                if (timeParts.length === 2) {
                    hour = parseInt(timeParts[0], 10);
                    minute = parseInt(timeParts[1], 10);
                }
            }
        }
        
        // 如果字串解析失敗，回退到 Date 物件（但這會導致時區轉換）
        if (!year || !month || !day || hour === undefined || minute === undefined) {
            console.warn('⚠️ 無法直接解析 ISO 字串，回退到 Date 物件（可能會有時區轉換）:', dateTimeStr);
        const dt = new Date(dateTimeStr);
        if (isNaN(dt.getTime())) return;
            year = dt.getFullYear();
            month = dt.getMonth() + 1;
            day = dt.getDate();
            hour = dt.getHours();
            minute = dt.getMinutes();
        }
        
        const monthStr = String(month).padStart(2, '0');
        const dayStr = String(day).padStart(2, '0');
        const hourStr = String(hour).padStart(2, '0');
        const minuteStr = String(Math.floor(minute / 10) * 10).padStart(2, '0');
        
        if (elements.diningDate) elements.diningDate.value = `${year}-${monthStr}-${dayStr}`;
        
        // 處理時間：如果在 12-22 範圍內，直接選擇；否則使用自訂
        const customHourInput = document.getElementById('diningHourCustom');
        if (hour >= 12 && hour <= 22) {
            // 確保設置正確的小時值（兩位數格式）
            if (elements.diningHour) {
                elements.diningHour.value = hourStr;
                console.log('✅ 設置小時（直接解析，無時區轉換）:', hourStr, '原始字串:', dateTimeStr);
            }
            if (customHourInput) {
                customHourInput.style.display = 'none';
                customHourInput.value = '';
            }
        } else {
            // 不在範圍內，使用自訂輸入框
            if (elements.diningHour) {
                elements.diningHour.value = '__CUSTOM__';
            }
            if (customHourInput) {
                customHourInput.value = hourStr;
                customHourInput.style.display = 'block';
            }
        }
        if (elements.diningMinute) {
            elements.diningMinute.value = minuteStr;
            console.log('✅ 設置分鐘（直接解析，無時區轉換）:', minuteStr, '原始字串:', dateTimeStr);
        }
        
        // 更新所有日期時間欄位的顏色狀態
        if (elements.diningDate) markFillState(elements.diningDate);
        if (elements.diningHour) markFillState(elements.diningHour);
        if (elements.diningMinute) markFillState(elements.diningMinute);
        if (customHourInput && customHourInput.style.display === 'block') {
            markFillState(customHourInput);
        }
    } catch (e) {
        console.warn('設定用餐時間失敗：', e);
    }
}

// 初始化應用程式
document.addEventListener('DOMContentLoaded', async function() {
    await prepareInitialState();
    initializeApp();
    initLocalOptionSelects();
    bindEvents();
    await initAccounts();
    await initChangeLog();
    await loadIndustryOptions(); // 載入產業選項
    await loadVenueContentOptions(); // 載入包場內容選項
    
    // 在選項載入完成後，再次恢復購物車狀態（確保下拉選單的選項已載入）
    restoreCartState();
    
    restoreCurrentUser();
    updateAuthUI();
    initFillStateStyling();
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

// === 填寫狀態提示 ===
function markFillState(field) {
    const hasValue = field.value && field.value.toString().trim() !== '';
    field.classList.toggle('input-filled', hasValue);
    field.classList.toggle('input-empty', !hasValue);
}

function initFillStateStyling() {
    const selector = 'input[type="text"], input[type="tel"], input[type="number"], input[type="date"], select, textarea';
    document.querySelectorAll(selector).forEach(el => {
        markFillState(el);
        if (!el.dataset._fillStateBound) {
            el.addEventListener('input', () => markFillState(el));
            el.addEventListener('change', () => markFillState(el));
            el.dataset._fillStateBound = '1';
        }
    });
}

async function prepareInitialState() {
    // 清理所有舊的菜單 localStorage 資料，確保完全從 Supabase 載入
    localStorage.removeItem('currentMenu');
    localStorage.removeItem('savedMenus'); // 也清理歷史訂單，完全依賴 Supabase
    
    await initSupabaseClient();
    
    // 優先從 Supabase 載入菜單
    const remoteRestored = await loadStateFromSupabase();
    
    // 如果 Supabase 載入失敗，才使用預設資料並同步到 Supabase
    if (!remoteRestored) {
        console.warn('無法從 Supabase 載入菜單，使用預設資料');
        saveToStorage({ skipChangeLog: true, reason: 'bootstrap' });
    }
    
    // 恢復購物車（購物車仍可保留在 localStorage）
    const cartRestored = restoreCartState();
    if (!cartRestored) {
        persistCartState();
    }
    
    // 設定 Supabase Realtime 監聽，實現協作同步
    setupRealtimeSync();
}

async function fetchSupabaseConfig() {
    // 優先使用 HTML 中嵌入的配置（最可靠）
    if (typeof window !== 'undefined' && window.SUPABASE_CONFIG) {
        const config = window.SUPABASE_CONFIG;
        if (config?.supabaseUrl && config?.supabaseAnonKey) {
            console.log('✅ 從 HTML 嵌入配置載入 Supabase 設定');
            return config;
        }
    }
    
    // 備用：從檔案載入
    const sources = [
        '/env.json',           // Vercel 靜態文件路徑
        'env.json',            // 相對路徑
        '/public/env.json',    // 備用路徑
        '/api/env'             // Next.js API 路由（如果存在）
    ];
    
    for (const source of sources) {
        try {
            console.log(`嘗試從 ${source} 載入 Supabase 配置...`);
            const response = await fetch(source);
            if (!response.ok) {
                console.warn(`${source} 回應狀態: ${response.status}`);
                continue;
            }
            const data = await response.json();
            if (data?.supabaseUrl && data?.supabaseAnonKey) {
                console.log(`✅ 成功從 ${source} 載入 Supabase 配置`);
                return data;
            } else {
                console.warn(`${source} 返回的資料缺少必要欄位`);
            }
        } catch (error) {
            console.warn(`讀取 Supabase 設定失敗 (${source})：`, error.message);
        }
    }
    
    console.error('❌ 無法從任何來源載入 Supabase 配置');
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

// 設定 Supabase Realtime 同步，實現協作功能
function setupRealtimeSync() {
    if (!supabaseClient) {
        console.warn('Supabase 客戶端未就緒，無法設定 Realtime 同步');
        return;
    }
    
    // 清理舊的 channel（如果存在）
    if (window._realtimeChannels) {
        window._realtimeChannels.forEach(channel => {
            supabaseClient.removeChannel(channel);
        });
    }
    
    // 監聽 menu_state 變更
    const menuStateChannel = supabaseClient
        .channel('menu_state_changes')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'menu_state',
                filter: `name=eq.${MENU_STATE_KEY}`
            },
            async (payload) => {
                console.log('收到 menu_state 變更:', payload);
                // 如果是其他使用者更新的，重新載入
                if (payload.new && payload.new.payload?.updatedBy !== currentUser?.username) {
                    console.log('偵測到其他協作者的變更，重新載入菜單');
                    await loadStateFromSupabase();
                    renderMenu();
                    showSyncStatus('已同步其他協作者的變更', 'success');
                }
            }
        )
        .subscribe();
    
    // 監聽 menu_items 變更
    const menuItemsChannel = supabaseClient
        .channel('menu_items_changes')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'menu_items'
            },
            async (payload) => {
                console.log('收到 menu_items 變更:', payload);
                
                // 檢查是否正在進行編輯操作
                const activeElement = document.activeElement;
                const isInputFocused = activeElement && (
                    activeElement.tagName === 'INPUT' ||
                    activeElement.tagName === 'TEXTAREA' ||
                    activeElement.isContentEditable ||
                    activeElement.closest('.modal') // 如果有模態框打開，可能正在編輯
                );
                
                // 檢查是否有拖曳操作正在進行（Sortable 會設置特定 class）
                const isDragging = document.querySelector('.sortable-ghost, .sortable-drag');
                
                // 如果用戶正在編輯或拖曳，延遲同步
                if (isInputFocused || isDragging || isUserEditing) {
                    console.log('用戶正在編輯/拖曳，延遲同步', { isInputFocused, isDragging, isUserEditing });
                    pendingMenuSync = async () => {
                        // 再次檢查是否仍在編輯
                        const stillEditing = (document.activeElement && (
                            document.activeElement.tagName === 'INPUT' ||
                            document.activeElement.tagName === 'TEXTAREA' ||
                            document.activeElement.isContentEditable ||
                            document.activeElement.closest('.modal')
                        )) || document.querySelector('.sortable-ghost, .sortable-drag') || isUserEditing;
                        
                        if (stillEditing) {
                            console.log('仍在編輯中，繼續延遲');
                            // 再等 1.5 秒
                            setTimeout(() => {
                                if (pendingMenuSync) {
                                    pendingMenuSync();
                                }
                            }, 1500);
                            return;
                        }
                        
                        await loadStateFromSupabase();
                        renderMenu();
                        showSyncStatus('已同步菜單變更', 'success');
                        pendingMenuSync = null;
                    };
                    // 等待 1.5 秒後再嘗試同步
                    setTimeout(() => {
                        if (pendingMenuSync) {
                            pendingMenuSync();
                        }
                    }, 1500);
                    return;
                }
                
                // 重新載入菜單狀態以確保同步
                await loadStateFromSupabase();
                renderMenu();
                showSyncStatus('已同步菜單變更', 'success');
            }
        )
        .subscribe();
    
    // 儲存 channel 以便清理
    window._realtimeChannels = [menuStateChannel, menuItemsChannel];
    
    console.log('✅ Supabase Realtime 同步已啟動');
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
                    food_weight_g: item.foodWeight ?? null,
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

// 同步所有菜單排序到 menu_items 表
async function syncAllOrdersToMenuItems() {
    const client = supabaseClient || await initSupabaseClient();
    if (!client) {
        console.warn('Supabase 未連線，無法同步排序');
        return false;
    }
    
    try {
        let categoryOrder = 0;
        const updates = [];
        
        for (const category of menuData.categories) {
            categoryOrder++;
            let itemOrder = 0;
            
            for (const item of category.items || []) {
                itemOrder++;
                updates.push({
                    id: item.id,
                    category: category.name,
                    category_order: categoryOrder,
                    item_order: itemOrder
                });
            }
        }
        
        // 分批更新
        const batchSize = 50;
        for (let i = 0; i < updates.length; i += batchSize) {
            const batch = updates.slice(i, i + batchSize);
            const { error } = await client
                .from('menu_items')
                .upsert(batch, { onConflict: 'id', ignoreDuplicates: false });
            if (error) {
                console.error('同步排序失敗:', error);
            }
        }
        
        console.log('✅ 排序已同步到 menu_items');
        return true;
    } catch (error) {
        console.error('同步排序時發生錯誤:', error);
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
        // 不再寫入 localStorage，確保完全依賴 Supabase
        // 歷史訂單應該從 menu_orders 表載入，而不是從 menu_state
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
    // 不再從 localStorage 讀取歷史，歷史完全從 Supabase 的 menu_orders 載入
    // 歷史訂單應該從 menu_orders 表載入，而不是從 menu_state 或 localStorage
}

function restoreFromLocalStorage() {
    // 不再從 localStorage 恢復菜單資料
    // 菜單完全從 Supabase 載入，確保與雲端和其他協作者同步
        return false;
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
        
        // 如果有購物車資料且 meta 中沒有金額，先計算金額
        if (Array.isArray(entry.cart) && entry.cart.length > 0) {
            const subtotal = entry.cart.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
            const serviceFee = Math.round(subtotal * 0.1);
            const estimatedTotal = subtotal + serviceFee;
            const estimatedPerPerson = Math.round(estimatedTotal / (entry.peopleCount || 1));
            const cartItemCount = entry.cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
            const cartPreview = entry.cart.slice(0, 3).map(item => item.name).join(', ') + (entry.cart.length > 3 ? '...' : '');
            
            sanitized.meta = {
                ...sanitized.meta,
                estimatedTotal: sanitized.meta?.estimatedTotal || estimatedTotal,
                estimatedPerPerson: sanitized.meta?.estimatedPerPerson || estimatedPerPerson,
                itemCount: sanitized.meta?.itemCount || cartItemCount,
                preview: sanitized.meta?.preview || cartPreview
            };
        }
        
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
            customerName: elements.contactName?.value || '',
            customerTaxId: elements.customerTaxId?.value || '',
            diningDateTime: getDiningDateTime(),
            // 新增訂單欄位
            companyName: elements.companyName?.value || '',
            contactName: elements.contactName?.value || '',
            contactPhone: elements.contactPhone?.value || '',
            planType: elements.planType?.value || '',
            lineName: elements.lineName?.value || '',
            industry: elements.industrySelect?.value || '',
            venueContent: elements.venueContentSelect?.value || '',
            venueScope: elements.venueScope?.value || '',
            diningStyle: elements.diningStyle?.value || '',
            paymentMethod: elements.paymentMethod?.value || '',
            discount: elements.discount?.value || '',
            depositPaid: elements.depositPaid?.value || '',
            satietyBaseline: getSatietyBaseline(),
            customerBudget: parseFloat(elements.customerBudget?.value) || 0,
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
        const satietyInput = document.getElementById('satietyBaseline');
        if (satietyInput && Number(payload?.satietyBaseline) >= 0) {
            satietyInput.value = payload.satietyBaseline;
        }
        if (elements.customerBudget && typeof payload?.customerBudget !== 'undefined') {
            elements.customerBudget.value = payload.customerBudget;
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
        // 恢復訂單欄位
        if (payload?.companyName !== undefined && elements.companyName) {
            elements.companyName.value = payload.companyName || '';
        }
        if (payload?.contactName !== undefined && elements.contactName) {
            elements.contactName.value = payload.contactName || '';
        }
        if (payload?.contactPhone !== undefined && elements.contactPhone) {
            elements.contactPhone.value = payload.contactPhone || '';
        }
        if (payload?.planType !== undefined && elements.planType) {
            elements.planType.value = payload.planType || '';
        }
        if (payload?.lineName !== undefined && elements.lineName) {
            elements.lineName.value = payload.lineName || '';
        }
        if (payload?.industry !== undefined && elements.industrySelect) {
            const industryValue = payload.industry || '';
            // 檢查選項是否存在，如果不存在則延遲設置
            if (industryValue && industryOptions && industryOptions.length > 0) {
                const optionExists = industryOptions.some(opt => 
                    (opt.name || opt.label || '') === industryValue || 
                    (opt.value || '') === industryValue
                );
                if (optionExists) {
                    elements.industrySelect.value = industryValue;
                } else {
                    console.warn('產業選項不存在，無法恢復:', industryValue);
                }
            } else if (industryValue) {
                // 如果選項還沒載入，先設置值，稍後會由選項載入邏輯處理
                elements.industrySelect.value = industryValue;
            } else {
                elements.industrySelect.value = '';
            }
        }
        if (payload?.venueContent !== undefined && elements.venueContentSelect) {
            const venueContentValue = payload.venueContent || '';
            // 檢查選項是否存在，如果不存在則延遲設置
            if (venueContentValue && venueContentOptions && venueContentOptions.length > 0) {
                const optionExists = venueContentOptions.some(opt => 
                    (opt.name || opt.label || '') === venueContentValue || 
                    (opt.value || '') === venueContentValue
                );
                if (optionExists) {
                    elements.venueContentSelect.value = venueContentValue;
                } else {
                    console.warn('包場內容選項不存在，無法恢復:', venueContentValue);
                }
            } else if (venueContentValue) {
                // 如果選項還沒載入，先設置值，稍後會由選項載入邏輯處理
                elements.venueContentSelect.value = venueContentValue;
            } else {
                elements.venueContentSelect.value = '';
            }
        }
        if (payload?.planType !== undefined && elements.planType) {
            const planTypeValue = payload.planType || '';
            if (planTypeValue) {
                const planOptions = loadLocalOptions('planType');
                if (planOptions.includes(planTypeValue)) {
                    elements.planType.value = planTypeValue;
                } else {
                    console.warn('方案選項不存在，無法恢復:', planTypeValue);
                    elements.planType.value = '';
                }
            } else {
                elements.planType.value = '';
            }
        }
        if (payload?.venueScope !== undefined && elements.venueScope) {
            const venueScopeValue = payload.venueScope || '';
            if (venueScopeValue) {
                const venueScopeOptions = loadLocalOptions('venueScope');
                if (venueScopeOptions.includes(venueScopeValue)) {
                    elements.venueScope.value = venueScopeValue;
                } else {
                    console.warn('包場範圍選項不存在，無法恢復:', venueScopeValue);
                    elements.venueScope.value = '';
                }
            } else {
                elements.venueScope.value = '';
            }
        }
        if (payload?.diningStyle !== undefined && elements.diningStyle) {
            const diningStyleValue = payload.diningStyle || '';
            if (diningStyleValue) {
                const diningStyleOptions = loadLocalOptions('diningStyle');
                if (diningStyleOptions.includes(diningStyleValue)) {
                    elements.diningStyle.value = diningStyleValue;
                } else {
                    console.warn('用餐方式選項不存在，無法恢復:', diningStyleValue);
                    elements.diningStyle.value = '';
                }
            } else {
                elements.diningStyle.value = '';
            }
        }
        if (payload?.paymentMethod !== undefined && elements.paymentMethod) {
            const paymentMethodValue = payload.paymentMethod || '';
            if (paymentMethodValue) {
                const paymentOptions = loadLocalOptions('paymentMethod');
                if (paymentOptions.includes(paymentMethodValue)) {
                    elements.paymentMethod.value = paymentMethodValue;
                } else {
                    console.warn('付款方式選項不存在，無法恢復:', paymentMethodValue);
                    elements.paymentMethod.value = '';
                }
            } else {
                elements.paymentMethod.value = '';
            }
        }
        if (payload?.discount !== undefined && elements.discount) {
            elements.discount.value = payload.discount || '';
        }
        if (payload?.depositPaid !== undefined && elements.depositPaid) {
            elements.depositPaid.value = payload.depositPaid || '';
        }
        
        // 更新填寫狀態顏色
        initFillStateStyling();
        
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
        // 加入更新者資訊，方便追蹤誰做了變更
        const payloadWithMetadata = {
            ...statePayload,
            updatedBy: currentUser?.username || '未知',
            updatedAt: new Date().toISOString()
        };
        
        const { error } = await supabaseClient
            .from('menu_state')
            .upsert({ 
                name: MENU_STATE_KEY, 
                payload: payloadWithMetadata, 
                updated_at: new Date().toISOString() 
            }, { onConflict: 'name' });
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
    // 儲存菜單按鈕（新菜單或儲存成新菜單）
    elements.saveMenu.addEventListener('click', () => {
        if (!ensureEditorAccess()) return;
        // 如果是載入的菜單，儲存時會儲存成新菜單（不更新現有訂單）
        saveMenuToStorage();
    });
    elements.loadMenu.addEventListener('click', showHistoryModal);
    
    // 功能 B：更新訂單按鈕（只更新現有訂單）
    const updateOrderBtn = document.getElementById('updateOrder');
    if (updateOrderBtn) {
        updateOrderBtn.addEventListener('click', () => {
            if (!ensureEditorAccess()) return;
            if (!currentEditingOrderId) {
                alert('目前沒有正在編輯的訂單，請先載入一個訂單');
                return;
            }
            // 直接調用 confirmSaveMenu，傳入 isNewOrder = false 強制更新
            confirmSaveMenu(false);
        });
    }
    
    // 功能 B：刪除訂單按鈕
    const deleteOrderBtn = document.getElementById('deleteOrder');
    if (deleteOrderBtn) {
        deleteOrderBtn.addEventListener('click', deleteCurrentOrder);
    }
    
    // 功能 E：分析按鈕
    const showAnalysisBtn = document.getElementById('showAnalysis');
    if (showAnalysisBtn) {
        showAnalysisBtn.addEventListener('click', showAnalysisModal);
    }
    
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
        elements.peopleCountInput.addEventListener('input', () => {
            // 即時更新分析欄位
            if (typeof updateAnalysisPanel === 'function') {
                updateAnalysisPanel();
            }
            if (typeof updateWeightAnalysisPanel === 'function') {
                updateWeightAnalysisPanel();
            }
        });
    }
    
    // 客戶預算輸入框事件監聽
    document.addEventListener('input', (e) => {
        if (e.target && e.target.id === 'customerBudget') {
            if (typeof updateAnalysisPanel === 'function') {
                updateAnalysisPanel();
            }
            persistCartState();
        }
        if (e.target && e.target.id === 'satietyBaseline') {
            if (typeof updateWeightAnalysisPanel === 'function') {
                updateWeightAnalysisPanel();
            }
            persistCartState();
        }
    });
    
    document.addEventListener('change', (e) => {
        const id = e.target && e.target.id;
        if (id === 'peopleCount' || id === 'diners' || id === 'diningPeople' || id === 'guestCount') {
            if (typeof updateAnalysisPanel === 'function') {
                updateAnalysisPanel();
            }
        }
    });
    
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
    // 【步驟 3】用餐日期時間選擇器 - 在 change 時即時更新狀態
    if (elements.diningDate) {
        elements.diningDate.addEventListener('change', function() {
            console.log('📅 [change事件] diningDate 變更:', elements.diningDate.value);
            persistCartState();
        });
    }
    if (elements.diningHour) {
        elements.diningHour.addEventListener('change', function() {
            console.log('📅 [change事件] diningHour 變更:', elements.diningHour.value);
            // 即時更新 elements 引用（確保同步）
            elements.diningHour = document.getElementById('diningHour');
            persistCartState();
        });
    }
    if (elements.diningMinute) {
        elements.diningMinute.addEventListener('change', function() {
            console.log('📅 [change事件] diningMinute 變更:', elements.diningMinute.value);
            // 即時更新 elements 引用（確保同步）
            elements.diningMinute = document.getElementById('diningMinute');
            persistCartState();
        });
    }
    
    // 自訂小時輸入框的 change 事件
    const customHourInput = document.getElementById('diningHourCustom');
    if (customHourInput) {
        customHourInput.addEventListener('input', function() {
            console.log('📅 [input事件] diningHourCustom 變更:', customHourInput.value);
            persistCartState();
        });
    }
    
    // 新增訂單欄位自動保存
    if (elements.companyName) {
        elements.companyName.addEventListener('change', persistCartState);
    }
    if (elements.contactName) {
        elements.contactName.addEventListener('change', persistCartState);
    }
    if (elements.contactPhone) {
        elements.contactPhone.addEventListener('change', persistCartState);
    }
    if (elements.industrySelect) {
        elements.industrySelect.addEventListener('change', persistCartState);
    }
    if (elements.discount) {
        elements.discount.addEventListener('change', () => {
            persistCartState();
            updateCartSummary();
        });
    }
    if (elements.depositPaid) {
        elements.depositPaid.addEventListener('change', persistCartState);
    }
    // Select 選項變更時保存
    if (elements.venueScope) {
        elements.venueScope.addEventListener('change', persistCartState);
    }
    if (elements.diningStyle) {
        elements.diningStyle.addEventListener('change', persistCartState);
    }
    if (elements.paymentMethod) {
        elements.paymentMethod.addEventListener('change', persistCartState);
    }
    
    // 產業管理按鈕
    if (elements.manageIndustry) {
        elements.manageIndustry.addEventListener('click', showIndustryManager);
    }
    if (elements.managePlanType) {
        elements.managePlanType.addEventListener('click', () => showLocalOptionManager('planType'));
    }
    if (elements.manageVenueScope) {
        elements.manageVenueScope.addEventListener('click', () => showLocalOptionManager('venueScope'));
    }
    if (elements.manageDiningStyle) {
        elements.manageDiningStyle.addEventListener('click', () => showLocalOptionManager('diningStyle'));
    }
    if (elements.managePaymentMethod) {
        elements.managePaymentMethod.addEventListener('click', () => showLocalOptionManager('paymentMethod'));
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
            onStart: function() {
                isUserEditing = true; // 標記開始拖曳
            },
            onEnd: function(evt) {
                // 跳過 "全部" 標籤 (index 0)
                if (evt.oldIndex > 0 && evt.newIndex > 0) {
                    reorderCategories(evt.oldIndex - 1, evt.newIndex - 1);
                }
                // 延遲清除編輯標記，確保同步操作不會立即執行
                setTimeout(() => {
                    isUserEditing = false;
                    // 如果有待處理的同步，現在執行
                    if (pendingMenuSync) {
                        pendingMenuSync();
                    }
                }, 500);
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
            onStart: function() {
                isUserEditing = true; // 標記開始拖曳
            },
            onEnd: function(evt) {
                reorderCartItems(evt.oldIndex, evt.newIndex);
                // 延遲清除編輯標記
                setTimeout(() => {
                    isUserEditing = false;
                    if (pendingMenuSync) {
                        pendingMenuSync();
                    }
                }, 500);
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
                onStart: function() {
                    isUserEditing = true; // 標記開始拖曳
                },
                onEnd: function(evt) {
                    reorderCategoryItems(category.id, evt.oldIndex, evt.newIndex);
                    // 延遲清除編輯標記
                    setTimeout(() => {
                        isUserEditing = false;
                        if (pendingMenuSync) {
                            pendingMenuSync();
                        }
                    }, 500);
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

async function deleteCategory(categoryId) {
    if (!ensureAdminAccess()) return;
    if (confirm('確定要刪除此類別？此操作無法復原。')) {
        const category = menuData.categories.find(c => c.id === categoryId);
        if (!category) return;
        
        // 先刪除該類別下的所有品項
        for (const item of category.items || []) {
            await syncItemToMenuItems(item, category.name, 'delete');
        }
        
        menuData.categories = menuData.categories.filter(c => c.id !== categoryId);
        removeInvalidCartItems();
        
        // 立即同步到 Supabase
        await saveToStorage({ reason: 'delete-category', summary: `刪除類別「${category.name}」` });
        
        renderMenu();
        renderCart();
        updateCartSummary();
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
    document.getElementById('itemFoodWeight').value = '';
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
    document.getElementById('itemFoodWeight').value = Number.isFinite(item.foodWeight) ? item.foodWeight : '';
    document.getElementById('itemModal').style.display = 'block';
}

function saveItem() {
    if (!ensureEditorAccess()) return;
    const name = document.getElementById('itemName').value.trim();
    const nameEn = document.getElementById('itemNameEn').value.trim();
    const description = document.getElementById('itemDescription').value.trim();
    const price = parseFloat(document.getElementById('itemPrice').value);
    const foodWeight = normalizeMetricValue(document.getElementById('itemFoodWeight').value);
    
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
            item.foodWeight = foodWeight;
            itemToSync = item;
            
            // 更新購物車中的品項資訊
            cart.forEach(cartItem => {
                if (cartItem.id === editingItem.itemId) {
                    cartItem.name = name;
                    cartItem.nameEn = nameEn;
                    cartItem.price = price;
                    cartItem.foodWeight = foodWeight;
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
            price,
            foodWeight
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

function updateItemWeight(categoryId, itemId, value) {
    if (!ensureEditorAccess()) return;
    const category = menuData.categories.find(c => c.id === categoryId);
    const item = category?.items.find(i => i.id === itemId);
    if (!item) return;

    const numericValue = normalizeMetricValue(value);
    item.foodWeight = numericValue;

    cart.forEach(cartItem => {
        if (cartItem.id === itemId) {
            cartItem.foodWeight = item.foodWeight;
        }
    });

    syncItemToMenuItems(item, category.name, 'upsert');
    renderMenu();
    renderCart();
    updateCartSummary();
    persistCartState();
    saveToStorage({ reason: 'structure-change', summary: `更新品項「${item.name}」重量` });
}

async function deleteItem(categoryId, itemId) {
    if (!ensureEditorAccess()) return;
    if (confirm('確定要刪除此品項？')) {
        const category = menuData.categories.find(c => c.id === categoryId);
        if (category) {
            const itemToDelete = category.items.find(i => i.id === itemId);
            category.items = category.items.filter(i => i.id !== itemId);
            // 從購物車移除
            cart = cart.filter(item => item.id !== itemId);
            
            // 立即同步刪除到 Supabase（menu_items 和 menu_state）
            if (itemToDelete) {
                // 1. 從 menu_items 刪除
                await syncItemToMenuItems(itemToDelete, category.name, 'delete');
                // 2. 更新 menu_state
                await saveToStorage({ reason: 'delete-item', summary: `刪除品項「${itemToDelete.name}」` });
            }
            
            renderMenu();
            renderCart();
            updateCartSummary();
            persistCartState();
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
        const metrics = mergeMetricsFromSource(item);
        const cartItem = {
            id: itemId,
            name: item.name,
            nameEn: item.nameEn || item.enName || '',
            price: item.price,
            quantity: tableCount, // 使用桌數作為初始數量
            categoryId: categoryId,
            foodWeight: metrics.weight
        };
        cart.push(cartItem);
        persistCartState();
        renderCart();
        renderMenu(); // 重新渲染菜單以更新選中狀態
        updateCartSummary();
        // 更新分析欄位
        updateAnalysisPanel();
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
    // 更新分析欄位
    if (typeof updateAnalysisPanel === 'function') {
        updateAnalysisPanel();
    }
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
        // 更新分析欄位
        if (typeof updateAnalysisPanel === 'function') {
            updateAnalysisPanel();
        }
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
        // 更新分析欄位
        if (typeof updateAnalysisPanel === 'function') {
            updateAnalysisPanel();
        }
        if (typeof updateWeightAnalysisPanel === 'function') {
            updateWeightAnalysisPanel();
        }
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
    
    // 清除客戶／訂單資訊
    const resetFields = [
        'companyName',
        'customerName',
        'customerTaxId',
        'contactName',
        'contactPhone',
        'lineName',
        'planType',
        'planTypeCustom',
        'industrySelect',
        'industrySelectCustom',
        'venueContentSelect',
        'venueContentSelectCustom',
        'venueScope',
        'venueScopeCustom',
        'diningStyle',
        'diningStyleCustom',
        'paymentMethod',
        'paymentMethodCustom',
        'discount',
        'depositPaid'
    ];
    resetFields.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        if (el.tagName === 'SELECT') {
            el.value = '';
        } else {
            el.value = '';
        }
    });
    
    // 清除用餐日期時間
    setDiningDateTime('');
    
    // 重新標記填寫狀態
    initFillStateStyling();
    
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

// 判斷項目分類類型的輔助函數
function getItemCategoryType(item) {
    // 定義餐點分類名稱
    const foodCategoryNames = [
        'Fried & Loved',
        'Salads & Soup',
        'Appetizers',
        'NY-Style Pizza',
        'La Pasta',
        'Risotto & Main Dishes',
        'All Day Brunch',
        'Sweetie'
    ];

    // 定義酒水分類名稱
    const drinkCategoryNames = [
        'Beer',
        'Draft Cocktail',
        'HAPPY',
        'HAPPY (Wine)'
    ];

    // 定義軟飲分類名稱
    const softDrinkCategoryNames = [
        'Soft Drink',
        '包場專用'
    ];

    // 根據 categoryId 找到對應的分類
    const categoryId = item.categoryId || '';
    const category = menuData.categories.find(c => c.id === categoryId);
    const categoryName = category ? (category.name || '') : '';
    const categoryNameLower = categoryName.toLowerCase();

    // 檢查是否為軟飲
    if (softDrinkCategoryNames.some(name => categoryName === name || categoryNameLower.includes(name.toLowerCase()))) {
        return 'softDrink';
    }
    // 檢查是否為酒水
    if (drinkCategoryNames.some(name => categoryName === name || categoryNameLower.includes(name.toLowerCase())) ||
        categoryNameLower.includes('beer') ||
        categoryNameLower.includes('cocktail') ||
        categoryNameLower.includes('wine') ||
        categoryNameLower.includes('happy')) {
        return 'drink';
    }
    // 檢查是否為餐點
    if (foodCategoryNames.some(name => categoryName === name || categoryNameLower.includes(name.toLowerCase()))) {
        return 'food';
    }
    // 預設歸類為餐點
    return 'food';
}

// 解析與標準化重量/容量欄位
function normalizeMetricValue(value) {
    const num = parseFloat(value);
    return Number.isFinite(num) && num >= 0 ? num : null;
}

function mergeMetricsFromSource(source = {}) {
    const weight =
        normalizeMetricValue(
            source.foodWeight ??
            source.food_weight_g ??
            source.foodWeightG ??
            source.softDrinkMl ??
            source.softDrinkVolume ??
            source.soft_drink_ml ??
            source.drinkMl ??
            source.drinkVolume ??
            source.drink_ml
        );
    return { weight };
}

function resolveCartItemMetrics(cartItem) {
    const category = menuData.categories.find(c => c.id === cartItem.categoryId);
    const menuItem = category?.items.find(i => i.id === cartItem.id);
    const merged = mergeMetricsFromSource({ ...menuItem, ...cartItem });
    return {
        type: getItemCategoryType(cartItem),
        ...merged
    };
}

function formatWeightValue(value, unit) {
    const v = Number.isFinite(value) ? Math.round(value) : 0;
    return `${v} ${unit}`;
}

function getSatietyBaseline() {
    const input = document.getElementById('satietyBaseline');
    const raw = input ? parseFloat(input.value) : DEFAULT_SATIETY_BASELINE;
    return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_SATIETY_BASELINE;
}

// 計算購物車摘要
function updateCartSummary() {
    const totals = calculateTotalsWithoutDiscount(cart, peopleCount);
    const discountValue = calculateDiscountValue(totals.subtotal, elements.discount?.value || '');
    
    // 統計餐點、軟飲、酒水的種類數和總道數
    const foodItems = new Set();
    const softDrinkItems = new Set();
    const drinkItems = new Set();
    let foodCount = 0;
    let softDrinkCount = 0;
    let drinkCount = 0;

    for (const item of cart) {
        const categoryType = getItemCategoryType(item);
        const qty = item.quantity || 1;

        if (categoryType === 'food') {
            foodItems.add(item.id);
            foodCount += qty;
        } else if (categoryType === 'softDrink') {
            softDrinkItems.add(item.id);
            softDrinkCount += qty;
        } else if (categoryType === 'drink') {
            drinkItems.add(item.id);
            drinkCount += qty;
        }
    }

    console.log(`計算詳情 - 小計: $${totals.subtotal}, 折扣(僅顯示): $${discountValue}, 服務費: $${totals.serviceFee}, 總計: $${totals.total}, 人數: ${peopleCount}, 人均: $${totals.perPerson}`);
    
    elements.subtotal.textContent = `$${totals.subtotal}`;
    if (elements.discountAmount) {
        elements.discountAmount.textContent = discountValue > 0 ? `-$${discountValue}` : '$0';
    }
    const discountedTotal = Math.max(totals.total - discountValue, 0);
    if (elements.discountTotal) {
        elements.discountTotal.textContent = `$${discountedTotal}`;
    }
    elements.serviceFee.textContent = `$${totals.serviceFee}`;
    elements.total.textContent = `$${totals.total}`;
    const perPersonDisplay = discountValue > 0
        ? Math.round(discountedTotal / Math.max(peopleCount, 1))
        : totals.perPerson;
    elements.perPerson.textContent = `$${perPersonDisplay}`;
    
    // 更新分類統計顯示
    if (elements.foodItemTypes) elements.foodItemTypes.textContent = foodItems.size;
    if (elements.foodItemCount) elements.foodItemCount.textContent = foodCount;
    if (elements.softDrinkItemTypes) elements.softDrinkItemTypes.textContent = softDrinkItems.size;
    if (elements.softDrinkItemCount) elements.softDrinkItemCount.textContent = softDrinkCount;
    if (elements.drinkItemTypes) elements.drinkItemTypes.textContent = drinkItems.size;
    if (elements.drinkItemCount) elements.drinkItemCount.textContent = drinkCount;
    
    // 兼容舊的 totalItems（如果存在）
    if (elements.totalItems) {
        elements.totalItems.textContent = foodCount + softDrinkCount + drinkCount;
    }
    
    // 更新分析欄位（如果函數存在）
    if (typeof updateAnalysisPanel === 'function') {
        updateAnalysisPanel();
    }
    if (typeof updateWeightAnalysisPanel === 'function') {
        updateWeightAnalysisPanel();
    }
}

// ====== 分析欄位計算功能 ======

function formatMoney(n) {
    const v = Number.isFinite(n) ? n : 0;
    return '$' + Math.round(v).toLocaleString('en-US');
}

function updateAnalysisPanel() {
    const budgetEl = document.getElementById('customerBudget');
    const remainingEl = document.getElementById('remainingBudget');
    const foodTotalEl = document.getElementById('foodTotal');
    const foodPerEl = document.getElementById('foodPerPerson');
    const drinkTotalEl = document.getElementById('drinkTotal');
    const drinkPerEl = document.getElementById('drinkPerPerson');
    const softDrinkTotalEl = document.getElementById('softDrinkTotal');
    const softDrinkPerEl = document.getElementById('softDrinkPerPerson');
    const budgetRatioEl = document.getElementById('budgetRatio');

    if (!budgetEl || !remainingEl || !foodTotalEl || !foodPerEl || !drinkTotalEl || !drinkPerEl || !softDrinkTotalEl || !softDrinkPerEl) {
        // 如果元素不存在，靜默返回（可能是分析欄位還沒載入）
        return;
    }

    // 1) 取得用餐人數
    const diners = peopleCount || 1;

    // 2) 取得「總計」(已含服務費)
    const totals = calculateTotalsWithoutDiscount(cart, diners);
    const discountValue = calculateDiscountValue(totals.subtotal, elements.discount?.value || '');
    const grandTotal = Math.max(totals.total - discountValue, 0);

    // 3) 從購物車拆「餐點/酒水/軟飲」金額（含服務費）
    const serviceRate = 0.10; // 服務費 10%
    let foodSubtotal = 0;
    let drinkSubtotal = 0;
    let softDrinkSubtotal = 0;

    // 定義餐點分類名稱（第一張圖的分類）
    const foodCategoryNames = [
        'Fried & Loved',
        'Salads & Soup',
        'Appetizers',
        'NY-Style Pizza',
        'La Pasta',
        'Risotto & Main Dishes',
        'All Day Brunch',
        'Sweetie'  // 甜點也算餐點
    ];

    // 定義酒水分類名稱（第二張圖的分類：Beer, Draft Cocktail, HAPPY (Wine)）
    const drinkCategoryNames = [
        'Beer',
        'Draft Cocktail',
        'HAPPY',
        'HAPPY (Wine)'
    ];

    // 定義軟飲分類名稱
    const softDrinkCategoryNames = [
        'Soft Drink',
        '包場專用'
    ];

    for (const item of cart) {
        const qty = item.quantity || 1;
        const price = item.price || 0;
        const line = price * qty;

        // 根據 categoryId 找到對應的分類
        const categoryId = item.categoryId || '';
        const category = menuData.categories.find(c => c.id === categoryId);
        const categoryName = category ? (category.name || '') : '';
        const categoryNameLower = categoryName.toLowerCase();

        // 根據分類名稱判斷（支援動態添加的分類）
        let isSoftDrink = false;
        let isDrink = false;
        let isFood = false;

        // 檢查是否為軟飲
        if (softDrinkCategoryNames.some(name => categoryName === name || categoryNameLower.includes(name.toLowerCase()))) {
            isSoftDrink = true;
        }
        // 檢查是否為酒水
        else if (drinkCategoryNames.some(name => categoryName === name || categoryNameLower.includes(name.toLowerCase())) ||
                 categoryNameLower.includes('beer') ||
                 categoryNameLower.includes('cocktail') ||
                 categoryNameLower.includes('wine') ||
                 categoryNameLower.includes('happy')) {
            isDrink = true;
        }
        // 檢查是否為餐點
        else if (foodCategoryNames.some(name => categoryName === name || categoryNameLower.includes(name.toLowerCase()))) {
            isFood = true;
        }
        // 預設歸類為餐點（兼容舊資料或未分類的項目）
        else {
            isFood = true;
        }

        // 根據判斷結果累加金額
        if (isSoftDrink) {
            softDrinkSubtotal += line;
        } else if (isDrink) {
            drinkSubtotal += line;
        } else if (isFood) {
            foodSubtotal += line;
        } else {
            // 最後的 fallback：歸類為餐點
            foodSubtotal += line;
        }
    }

    const foodTotal = foodSubtotal * (1 + serviceRate);
    const drinkTotal = drinkSubtotal * (1 + serviceRate);
    const softDrinkTotal = softDrinkSubtotal * (1 + serviceRate);

    const foodPer = diners > 0 ? (foodTotal / diners) : 0;
    const drinkPer = diners > 0 ? (drinkTotal / diners) : 0;
    const softDrinkPer = diners > 0 ? (softDrinkTotal / diners) : 0;

    // 4) 剩餘金額
    const budget = parseInt(budgetEl.value, 10) || 0;
    const remaining = budget - grandTotal;

    // 5) 計算餐標比例（總計/客戶預算 * 100%）
    let budgetRatio = 0;
    if (budget > 0) {
        budgetRatio = (grandTotal / budget) * 100;
    }
    const budgetRatioText = budgetRatio > 0 ? `${budgetRatio.toFixed(1)}%` : '0%';

    // 6) 更新 UI
    remainingEl.textContent = formatMoney(remaining);
    foodTotalEl.textContent = formatMoney(foodTotal);
    foodPerEl.textContent = formatMoney(foodPer);
    drinkTotalEl.textContent = formatMoney(drinkTotal);
    drinkPerEl.textContent = formatMoney(drinkPer);
    softDrinkTotalEl.textContent = formatMoney(softDrinkTotal);
    softDrinkPerEl.textContent = formatMoney(softDrinkPer);
    if (budgetRatioEl) {
        budgetRatioEl.textContent = budgetRatioText;
    }

    // Debug log
    console.log('[Analysis] updated', { budget, remaining, grandTotal, foodTotal, drinkTotal, softDrinkTotal, diners, budgetRatio });
}

// ====== 餐點重量分析 ======
function updateWeightAnalysisPanel() {
    const foodTotalEl = document.getElementById('foodWeightTotal');
    const foodPerEl = document.getElementById('foodWeightPerPerson');
    const softTotalEl = document.getElementById('softDrinkWeightTotal');
    const softPerEl = document.getElementById('softDrinkWeightPerPerson');
    const drinkTotalEl = document.getElementById('drinkWeightTotal');
    const drinkPerEl = document.getElementById('drinkWeightPerPerson');
    const satietyRatioEl = document.getElementById('satietyRatio');

    if (!foodTotalEl || !foodPerEl || !softTotalEl || !softPerEl || !drinkTotalEl || !drinkPerEl || !satietyRatioEl) {
        return;
    }

    const diners = Math.max(peopleCount || 0, 1);
    let foodWeightTotal = 0;
    let softDrinkWeightTotal = 0;
    let drinkWeightTotal = 0;

    for (const item of cart) {
        const qty = item.quantity || 1;
        const metrics = resolveCartItemMetrics(item);
        if (!Number.isFinite(metrics.weight)) continue;
        if (metrics.type === CATEGORY_TYPE.FOOD) {
            foodWeightTotal += metrics.weight * qty;
        } else if (metrics.type === CATEGORY_TYPE.SOFT) {
            softDrinkWeightTotal += metrics.weight * qty;
        } else if (metrics.type === CATEGORY_TYPE.DRINK) {
            drinkWeightTotal += metrics.weight * qty;
        } else {
            foodWeightTotal += metrics.weight * qty;
        }
    }

    const foodPerPerson = foodWeightTotal / diners;
    const softPerPerson = softDrinkWeightTotal / diners;
    const drinkPerPerson = drinkWeightTotal / diners;

    const baseline = getSatietyBaseline();
    const satietyRatio = baseline > 0 ? (foodPerPerson / baseline) * 100 : 0;

    foodTotalEl.textContent = formatWeightValue(foodWeightTotal, 'g');
    foodPerEl.textContent = formatWeightValue(foodPerPerson, 'g');
    softTotalEl.textContent = formatWeightValue(softDrinkWeightTotal, 'ml');
    softPerEl.textContent = formatWeightValue(softPerPerson, 'ml');
    drinkTotalEl.textContent = formatWeightValue(drinkWeightTotal, 'ml');
    drinkPerEl.textContent = formatWeightValue(drinkPerPerson, 'ml');
    satietyRatioEl.textContent = satietyRatio > 0 ? `${satietyRatio.toFixed(1)}%` : '0%';
}

// 排序功能
function reorderCategories(oldIndex, newIndex) {
    const [movedCategory] = menuData.categories.splice(oldIndex, 1);
    menuData.categories.splice(newIndex, 0, movedCategory);
    saveToStorage();
    // 同步排序到 menu_items
    syncAllOrdersToMenuItems();
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
        // 同步排序到 menu_items
        syncAllOrdersToMenuItems();
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
    
    // 取得訂單資訊（除了產業別）
    const orderInfo = getOrderInfo();
    const companyName = orderInfo.companyName || '';
    const taxId = orderInfo.taxId || '';
    const contactName = orderInfo.contactName || '';
    const contactPhone = orderInfo.contactPhone || '';
    const planType = orderInfo.planType || '';
    const lineName = orderInfo.lineName || '';
    const venueContent = orderInfo.venueContent || '';
    const venueScope = orderInfo.venueScope || '';
    const diningStyle = orderInfo.diningStyle || '';
    const paymentMethod = orderInfo.paymentMethod || '';
    const discount = orderInfo.discount || '';
    const depositPaid = orderInfo.depositPaid || 0;
    // 【關鍵修復】重新獲取日期時間，確保使用最新的值
    // 不傳入 customHour 參數，讓函數直接從 DOM 讀取使用者當下輸入的值
    const diningDateTime = getDiningDateTime(null); // 明確傳入 null，不使用任何舊值
    const diningDateStr = diningDateTime ? formatDate(new Date(diningDateTime)) : '未設定';
    
    // 客戶資訊工作表
    const customerInfo = [];
    if (companyName) customerInfo.push({ '項目': '公司名稱', '內容': companyName });
    if (taxId) customerInfo.push({ '項目': '統一編號', '內容': taxId });
    if (contactName) customerInfo.push({ '項目': '姓名', '內容': contactName });
    if (contactPhone) customerInfo.push({ '項目': '手機', '內容': contactPhone });
    if (planType) customerInfo.push({ '項目': '方案', '內容': planType });
    if (lineName) customerInfo.push({ '項目': 'LINE名稱', '內容': lineName });
    if (venueContent) customerInfo.push({ '項目': '包場內容', '內容': venueContent });
    if (diningDateStr !== '未設定') customerInfo.push({ '項目': '用餐日期時間', '內容': diningDateStr });
    if (venueScope) customerInfo.push({ '項目': '包場範圍', '內容': venueScope });
    if (diningStyle) customerInfo.push({ '項目': '用餐方式', '內容': diningStyle });
    if (paymentMethod) customerInfo.push({ '項目': '付款', '內容': paymentMethod });
    if (discount) customerInfo.push({ '項目': '折扣', '內容': discount });
    if (depositPaid > 0) customerInfo.push({ '項目': '已付訂金', '內容': depositPaid });
    customerInfo.push({ '項目': '用餐人數', '內容': peopleCount });
    customerInfo.push({ '項目': '桌數', '內容': tableCount });
    
    const customerSheet = XLSX.utils.json_to_sheet(customerInfo);
    XLSX.utils.book_append_sheet(workbook, customerSheet, '客戶資訊');
    
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
    const totals = calculateTotalsWithoutDiscount(cart, peopleCount);
    const { subtotal, serviceFee, total } = totals;
    const discountValue = calculateDiscountValue(subtotal, discount);
    const discountedTotal = Math.max(total - discountValue, 0);
    const perPersonAfterDiscount = Math.round(discountedTotal / Math.max(peopleCount, 1));
    
    cartData_flat.push({});
    cartData_flat.push({ '品項名稱': '小計', '小計': subtotal });
    if (discountValue > 0) {
        cartData_flat.push({ '品項名稱': '折扣', '小計': -discountValue });
        cartData_flat.push({ '品項名稱': '折扣後總計', '小計': discountedTotal });
    }
    cartData_flat.push({ '品項名稱': '服務費 (10%)', '小計': serviceFee });
    cartData_flat.push({ '品項名稱': '總計', '小計': total });
    cartData_flat.push({ '品項名稱': '折扣後應付', '小計': discountedTotal });
    cartData_flat.push({ '品項名稱': `人均 (${peopleCount}人)`, '小計': perPersonAfterDiscount });
    
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
    const totals = calculateTotalsWithoutDiscount(cart, peopleCount);
    const { subtotal, serviceFee, total } = totals;
    const discountInput = elements.discount?.value || '';
    const discountValue = calculateDiscountValue(subtotal, discountInput);
    const discountedTotal = Math.max(total - discountValue, 0);
    const perPersonAfterDiscount = Math.round(discountedTotal / Math.max(peopleCount, 1));
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    // 取得訂單資訊（除了產業別）
    const orderInfo = getOrderInfo();
    const companyName = orderInfo.companyName || '';
    const taxId = orderInfo.taxId || '';
    const contactName = orderInfo.contactName || '';
    const contactPhone = orderInfo.contactPhone || '';
    const planType = orderInfo.planType || '';
    const lineName = orderInfo.lineName || '';
    const venueContent = orderInfo.venueContent || '';
    const venueScope = orderInfo.venueScope || '';
    const diningStyle = orderInfo.diningStyle || '';
    const paymentMethod = orderInfo.paymentMethod || '';
    const depositPaid = orderInfo.depositPaid || 0;
    // 【關鍵修復】重新獲取日期時間，確保使用最新的值
    // 不傳入 customHour 參數，讓函數直接從 DOM 讀取使用者當下輸入的值
    const diningDateTime = getDiningDateTime(null); // 明確傳入 null，不使用任何舊值
    const diningDateStr = diningDateTime ? formatDate(new Date(diningDateTime)) : '未設定';
    
    let html = `
        <!-- 標題區塊 -->
        <div style="text-align: center; margin-bottom: 25px; border-bottom: 3px solid #2c3e50; padding-bottom: 15px;">
            <h1 style="color: #2c3e50; margin: 0 0 8px 0; font-size: 2.2rem; font-weight: 700; letter-spacing: -1px;">A Beach 101&Pizza</h1>
            <div style="color: #7f8c8d; font-size: 1.0rem; font-weight: 500;">Restaurant Order Details</div>
            <div style="color: #95a5a6; font-size: 1.0rem; margin-top: 6px;">訂單時間：${formatDate(new Date())} | 人數：${peopleCount}人 | 桌數：${tableCount}桌</div>
        </div>

        <!-- 客戶資訊區塊 -->
        <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #007bff;">
            <h3 style="color: #2c3e50; font-size: 1.2rem; font-weight: 600; margin: 0 0 15px 0; border-bottom: 2px solid #dee2e6; padding-bottom: 8px;">客戶資訊</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 0.95rem;">
                ${companyName ? `<div><strong style="color: #495057;">公司名稱：</strong><span style="color: #212529;">${companyName}</span></div>` : ''}
                ${taxId ? `<div><strong style="color: #495057;">統一編號：</strong><span style="color: #212529;">${taxId}</span></div>` : ''}
                ${contactName ? `<div><strong style="color: #495057;">姓名：</strong><span style="color: #212529;">${contactName}</span></div>` : ''}
                ${contactPhone ? `<div><strong style="color: #495057;">手機：</strong><span style="color: #212529;">${contactPhone}</span></div>` : ''}
                ${planType ? `<div><strong style="color: #495057;">方案：</strong><span style="color: #212529;">${planType}</span></div>` : ''}
                ${lineName ? `<div><strong style="color: #495057;">LINE名稱：</strong><span style="color: #212529;">${lineName}</span></div>` : ''}
                ${venueContent ? `<div><strong style="color: #495057;">包場內容：</strong><span style="color: #212529;">${venueContent}</span></div>` : ''}
                ${diningDateStr !== '未設定' ? `<div><strong style="color: #495057;">用餐日期時間：</strong><span style="color: #212529;">${diningDateStr}</span></div>` : ''}
                ${venueScope ? `<div><strong style="color: #495057;">包場範圍：</strong><span style="color: #212529;">${venueScope}</span></div>` : ''}
                ${diningStyle ? `<div><strong style="color: #495057;">用餐方式：</strong><span style="color: #212529;">${diningStyle}</span></div>` : ''}
                ${paymentMethod ? `<div><strong style="color: #495057;">付款：</strong><span style="color: #212529;">${paymentMethod}</span></div>` : ''}
                ${depositPaid > 0 ? `<div><strong style="color: #495057;">已付訂金：</strong><span style="color: #28a745; font-weight: 600;">$${depositPaid.toLocaleString()}</span></div>` : ''}
            </div>
        </div>

        <!-- 訂單資訊卡片 -->
        <div style="background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); padding: 18px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #2196f3;">
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; text-align: center;">
                <div>
                    <div style="font-size: 1.6rem; font-weight: 700; color: #1976d2;">${totalItems}</div>
                    <div style="color: #546e7a; font-size: 0.9rem; margin-top: 2px;">總餐點數</div>
                </div>
                <div>
                    <div style="font-size: 1.6rem; font-weight: 700; color: #1976d2;">${peopleCount}</div>
                    <div style="color: #546e7a; font-size: 0.9rem; margin-top: 2px;">用餐人數</div>
                </div>
                <div>
                    <div style="font-size: 1.6rem; font-weight: 700; color: #1976d2;">${tableCount}</div>
                    <div style="color: #546e7a; font-size: 0.9rem; margin-top: 2px;">桌數</div>
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
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 1.2rem;">
                    <span>總計 Total</span>
                    <span style="font-weight: 700;">$${total}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 1.2rem; color: #f39c12;">
                    <span>折扣 Discount</span>
                    <span style="font-weight: 700;">-$${discountValue}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 1.3rem; color: #f39c12; font-weight: 800;">
                    <span>折扣後總計 After Discount</span>
                    <span>$${discountedTotal}</span>
                </div>
                <div style="border-top: 2px solid rgba(255, 255, 255, 0.3); padding-top: 10px; display: flex; justify-content: space-between; font-size: 1.5rem; font-weight: 700;">
                    <span>應付 Total Amount</span>
                    <span style="color: #f39c12;">$${discountedTotal}</span>
                </div>
                <div style="border-top: 1px solid rgba(255, 255, 255, 0.2); margin-top: 10px; padding-top: 10px; display: flex; justify-content: space-between; font-size: 1.3rem; font-weight: 600; color: #3498db;">
                    <span>人均費用 Per Person (${peopleCount}人)</span>
                    <span>$${perPersonAfterDiscount}</span>
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

// ========== 產業選項管理 ==========
let industryOptions = [];
let venueContentOptions = []; // 包場內容選項

async function loadIndustryOptions() {
    try {
        const client = supabaseClient || await initSupabaseClient();
        if (!client) {
            console.warn('無法載入產業選項：Supabase 未連線');
            return;
        }
        
        const { data, error } = await client
            .from('industry_options')
            .select('*')
            .order('sort_order', { ascending: true });
        
        if (error) throw error;
        industryOptions = data || [];
        renderIndustrySelect();
    } catch (error) {
        console.error('載入產業選項失敗：', error);
        // 使用預設選項
        industryOptions = [
            { id: 1, name: '科技業', sort_order: 1 },
            { id: 2, name: '金融業', sort_order: 2 },
            { id: 3, name: '製造業', sort_order: 3 },
            { id: 4, name: '服務業', sort_order: 4 },
            { id: 5, name: '其他', sort_order: 5 }
        ];
        renderIndustrySelect();
    }
}

function renderIndustrySelect() {
    const select = elements.industrySelect;
    if (!select) return;
    
    const currentValue = select.value;
    select.innerHTML = '<option value="">請選擇</option>';
    
    industryOptions.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.name;
        option.textContent = opt.name;
        select.appendChild(option);
    });
    
    if (currentValue) select.value = currentValue;
    markFillState(select);
}

async function showIndustryManager() {
    let modal = document.getElementById('industryModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'industryModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 400px;">
                <div class="modal-header">
                    <h3><i class="fas fa-industry"></i> 產業別管理</h3>
                    <button class="close-modal" onclick="closeIndustryModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div id="industryList" style="margin-bottom: 1rem;"></div>
                    <div style="display: flex; gap: 0.5rem;">
                        <input type="text" id="newIndustryName" placeholder="新增產業名稱" style="flex: 1; padding: 0.5rem; border: 1px solid #dee2e6; border-radius: 4px;">
                        <button onclick="addIndustryOption()" class="btn btn-primary" style="padding: 0.5rem 1rem;">
                            <i class="fas fa-plus"></i> 新增
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    modal.style.display = 'block';
    renderIndustryList();
}

function closeIndustryModal() {
    const modal = document.getElementById('industryModal');
    if (modal) modal.style.display = 'none';
}

// 將產業管理函式暴露到全局，以便 HTML 中的 onclick 可以調用
if (typeof window !== 'undefined') {
    window.showIndustryManager = showIndustryManager;
    window.closeIndustryModal = closeIndustryModal;
    window.addIndustryOption = addIndustryOption;
    window.deleteIndustryOption = deleteIndustryOption;
    window.editIndustryOption = editIndustryOption;
}

function renderIndustryList() {
    const list = document.getElementById('industryList');
    if (!list) return;
    
    if (industryOptions.length === 0) {
        list.innerHTML = '<div style="color: #999; text-align: center; padding: 1rem;">目前沒有產業選項</div>';
        return;
    }
    
    list.innerHTML = industryOptions.map((opt, idx) => `
        <div class="option-row" data-id="${opt.id}" data-idx="${idx}" style="display: flex; align-items: center; padding: 0.5rem; border-bottom: 1px solid #eee; gap: 0.4rem;">
            <span class="drag-handle" title="拖曳排序" style="cursor: grab; color: #888;"><i class="fas fa-grip-vertical"></i></span>
            <span style="flex: 1;">${opt.name}</span>
            <button onclick="editIndustryOption(${opt.id}, '${opt.name.replace(/'/g, "\\'")}')" class="btn btn-small btn-secondary" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;">
                <i class="fas fa-edit"></i>
            </button>
            <button onclick="deleteIndustryOption(${opt.id}, '${opt.name.replace(/'/g, "\\'")}')" class="btn btn-danger" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
    
    if (list._sortable) list._sortable.destroy();
    list._sortable = new Sortable(list, {
        animation: 150,
        handle: '.drag-handle',
        onEnd: () => {
            const newOrderIds = Array.from(list.querySelectorAll('.option-row')).map(row => parseInt(row.dataset.id, 10));
            reorderIndustryOptions(newOrderIds);
        }
    });
}

async function addIndustryOption() {
    const input = document.getElementById('newIndustryName');
    const name = input?.value?.trim();
    if (!name) {
        alert('請輸入產業名稱');
        return;
    }
    
    try {
        const client = supabaseClient || await initSupabaseClient();
        if (!client) throw new Error('Supabase 未連線');
        
        const maxOrder = industryOptions.reduce((max, opt) => Math.max(max, opt.sort_order || 0), 0);
        
        const { data, error } = await client
            .from('industry_options')
            .insert({ name, sort_order: maxOrder + 1 })
            .select()
            .single();
        
        if (error) throw error;
        
        industryOptions.push(data);
        renderIndustrySelect();
        renderIndustryList();
        input.value = '';
        showSyncStatus('產業選項已新增', 'success');
    } catch (error) {
        console.error('新增產業選項失敗：', error);
        alert('新增失敗：' + error.message);
    }
}

async function editIndustryOption(id, name) {
    const next = prompt('修改產業名稱', name);
    if (!next) return;
    const trimmed = next.trim();
    if (!trimmed) return;
    try {
        const client = supabaseClient || await initSupabaseClient();
        if (!client) throw new Error('Supabase 未連線');
        const { data, error } = await client
            .from('industry_options')
            .update({ name: trimmed })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        industryOptions = industryOptions.map(opt => opt.id === id ? data : opt);
        renderIndustrySelect();
        renderIndustryList();
        showSyncStatus('產業選項已更新', 'success');
    } catch (error) {
        console.error('更新產業選項失敗：', error);
        alert('更新失敗：' + error.message);
    }
}

async function reorderIndustryOptions(idOrder) {
    try {
        const client = supabaseClient || await initSupabaseClient();
        if (!client) throw new Error('Supabase 未連線');
        const updates = idOrder.map((id, idx) => client.from('industry_options').update({ sort_order: idx + 1 }).eq('id', id));
        await Promise.all(updates);
        industryOptions.sort((a, b) => idOrder.indexOf(a.id) - idOrder.indexOf(b.id));
        renderIndustrySelect();
        renderIndustryList();
    } catch (error) {
        console.error('排序產業選項失敗：', error);
        alert('排序失敗：' + error.message);
    }
}

async function deleteIndustryOption(id, name) {
    if (!confirm(`確定要刪除「${name}」嗎？`)) return;
    
    try {
        const client = supabaseClient || await initSupabaseClient();
        if (!client) throw new Error('Supabase 未連線');
        
        const { error } = await client
            .from('industry_options')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        industryOptions = industryOptions.filter(opt => opt.id !== id);
        renderIndustrySelect();
        renderIndustryList();
        showSyncStatus('產業選項已刪除', 'success');
    } catch (error) {
        console.error('刪除產業選項失敗：', error);
        alert('刪除失敗：' + error.message);
    }
}

// ========== 包場內容管理功能 ==========
async function loadVenueContentOptions() {
    try {
        const client = supabaseClient || await initSupabaseClient();
        if (!client) {
            console.warn('無法載入包場內容選項：Supabase 未連線');
            return;
        }
        
        // 明確指定要查詢的欄位（不包含 created_at）
        const { data, error } = await client
            .from('venue_content_options')
            .select('id, name, label, sort_order, value, is_active')
            .order('sort_order', { ascending: true });
        
        if (error) {
            // 如果表不存在或欄位錯誤，使用預設選項
            if (error.message.includes('Could not find') || error.message.includes('relation') || error.message.includes('column')) {
                console.warn('venue_content_options 表結構問題，使用預設選項：', error.message);
                venueContentOptions = [
                    { id: 1, name: '產品發表', label: '產品發表', sort_order: 1 },
                    { id: 2, name: '婚禮派對', label: '婚禮派對', sort_order: 2 },
                    { id: 3, name: '春酒尾牙', label: '春酒尾牙', sort_order: 3 },
                    { id: 4, name: '公司聚餐', label: '公司聚餐', sort_order: 4 }
                ];
                renderVenueContentSelect();
                return;
            }
            throw error;
        }
        venueContentOptions = data || [];
        renderVenueContentSelect();
    } catch (error) {
        console.error('載入包場內容選項失敗：', error);
        // 使用預設選項（同時設置 name 和 label）
        venueContentOptions = [
            { id: 1, name: '產品發表', label: '產品發表', sort_order: 1 },
            { id: 2, name: '婚禮派對', label: '婚禮派對', sort_order: 2 },
            { id: 3, name: '春酒尾牙', label: '春酒尾牙', sort_order: 3 },
            { id: 4, name: '公司聚餐', label: '公司聚餐', sort_order: 4 }
        ];
        renderVenueContentSelect();
    }
}

function renderVenueContentSelect() {
    const select = document.getElementById('venueContentSelect');
    if (!select) return;
    
    const currentValue = select.value;
    select.innerHTML = '<option value="">請選擇</option>';
    
    venueContentOptions.forEach(opt => {
        const option = document.createElement('option');
        // 使用 name ?? label 作為顯示文字和值
        const displayText = opt.name ?? opt.label ?? '';
        option.value = displayText;
        option.textContent = displayText;
        select.appendChild(option);
    });

    if (currentValue) select.value = currentValue;
    markFillState(select);
}

async function showVenueContentManager() {
    let modal = document.getElementById('venueContentModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'venueContentModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 400px;">
                <div class="modal-header">
                    <h3><i class="fas fa-calendar-alt"></i> 包場內容管理</h3>
                    <button class="close-modal" onclick="closeVenueContentModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div id="venueContentList" style="margin-bottom: 1rem;"></div>
                    <div style="display: flex; gap: 0.5rem;">
                        <input type="text" id="newVenueContentName" placeholder="新增包場內容" style="flex: 1; padding: 0.5rem; border: 1px solid #dee2e6; border-radius: 4px;">
                        <button onclick="addVenueContentOption()" class="btn btn-primary" style="padding: 0.5rem 1rem;">
                            <i class="fas fa-plus"></i> 新增
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    modal.style.display = 'block';
    renderVenueContentList();
}

function closeVenueContentModal() {
    const modal = document.getElementById('venueContentModal');
    if (modal) modal.style.display = 'none';
}

// 將函式暴露到全局，以便 HTML 中的 onclick 可以調用
if (typeof window !== 'undefined') {
    window.closeVenueContentModal = closeVenueContentModal;
    window.showVenueContentManager = showVenueContentManager;
    window.addVenueContentOption = addVenueContentOption;
    window.deleteVenueContentOption = deleteVenueContentOption;
    window.editVenueContentOption = editVenueContentOption;
}

function renderVenueContentList() {
    const list = document.getElementById('venueContentList');
    if (!list) return;
    
    if (venueContentOptions.length === 0) {
        list.innerHTML = '<div style="color: #999; text-align: center; padding: 1rem;">目前沒有包場內容選項</div>';
        return;
    }
    
    list.innerHTML = venueContentOptions.map(opt => {
        // 使用 name ?? label 作為顯示文字
        const displayText = opt.name ?? opt.label ?? '';
        const safeDisplayText = displayText.replace(/'/g, "\\'"); // 轉義單引號，避免 onclick 中的字串問題
        return `
        <div class="option-row" data-id="${opt.id}" style="display: flex; align-items: center; padding: 0.5rem; border-bottom: 1px solid #eee; gap: 0.4rem;">
            <span class="drag-handle" title="拖曳排序" style="cursor: grab; color: #888;"><i class="fas fa-grip-vertical"></i></span>
            <span style="flex: 1;">${displayText}</span>
            <button onclick="editVenueContentOption(${opt.id}, '${safeDisplayText}')" class="btn btn-small btn-secondary" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;">
                <i class="fas fa-edit"></i>
            </button>
            <button onclick="deleteVenueContentOption(${opt.id}, '${safeDisplayText}')" class="btn btn-danger" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    }).join('');
    
    if (list._sortable) list._sortable.destroy();
    list._sortable = new Sortable(list, {
        animation: 150,
        handle: '.drag-handle',
        onEnd: () => {
            const newOrderIds = Array.from(list.querySelectorAll('.option-row')).map(row => parseInt(row.dataset.id, 10));
            reorderVenueContentOptions(newOrderIds);
        }
    });
}

async function addVenueContentOption() {
    const input = document.getElementById('newVenueContentName');
    const name = input?.value?.trim();
    if (!name) {
        alert('請輸入包場內容');
        return;
    }
    
    try {
        const client = supabaseClient || await initSupabaseClient();
        if (!client) throw new Error('Supabase 未連線');
        
        const maxOrder = venueContentOptions.reduce((max, opt) => Math.max(max, opt.sort_order || 0), 0);
        
        // 檢查表結構是否存在
        const { data: tableCheck, error: checkError } = await client
            .from('venue_content_options')
            .select('id, name, label, sort_order')
            .limit(1);
        
        if (checkError && checkError.message.includes('Could not find')) {
            console.error('venue_content_options 表結構問題：', checkError);
            alert('資料庫表結構尚未建立，請先在 Supabase 執行 migration。');
            return;
        }
        
        // 插入新選項：同時設置 name 和 label 為用戶輸入的值
        const text = name; // 用戶輸入的文字
        const { data, error } = await client
            .from('venue_content_options')
            .insert({ 
                name: text,      // 設置 name
                label: text,     // 設置 label（與 name 相同）
                sort_order: maxOrder + 1,
                value: text      // 也設置 value（如果需要的話）
                // 不包含 id（讓資料庫自動生成）
                // 不包含 created_at（欄位不存在）
                // 不包含 is_active（使用預設值 true）
            })
            .select('id, name, label, sort_order, value, is_active')
            .single();
        
        if (error) {
            console.error('插入錯誤詳情：', error);
            throw error;
        }
        
        if (data) {
            venueContentOptions.push(data);
            renderVenueContentSelect();
            renderVenueContentList();
            input.value = '';
            showSyncStatus('包場內容選項已新增', 'success');
        }
    } catch (error) {
        console.error('新增包場內容選項失敗：', error);
        console.error('錯誤詳情：', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
        });
        alert('新增失敗：' + error.message + '\n\n請檢查 Console 查看詳細錯誤');
    }
}

async function deleteVenueContentOption(id, name) {
    if (!confirm(`確定要刪除「${name}」嗎？`)) return;
    
    try {
        const client = supabaseClient || await initSupabaseClient();
        if (!client) throw new Error('Supabase 未連線');
        
        const { error } = await client
            .from('venue_content_options')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        venueContentOptions = venueContentOptions.filter(opt => opt.id !== id);
        renderVenueContentSelect();
        renderVenueContentList();
        showSyncStatus('包場內容選項已刪除', 'success');
    } catch (error) {
        console.error('刪除包場內容選項失敗：', error);
        alert('刪除失敗：' + error.message);
    }
}

async function editVenueContentOption(id, name) {
    const next = prompt('修改包場內容', name);
    if (!next) return;
    const trimmed = next.trim();
    if (!trimmed) return;
    try {
        const client = supabaseClient || await initSupabaseClient();
        if (!client) throw new Error('Supabase 未連線');
        const { data, error } = await client
            .from('venue_content_options')
            .update({ name: trimmed, label: trimmed, value: trimmed })
            .eq('id', id)
            .select('id, name, label, sort_order, value, is_active')
            .single();
        if (error) throw error;
        venueContentOptions = venueContentOptions.map(opt => opt.id === id ? data : opt);
        renderVenueContentSelect();
        renderVenueContentList();
        showSyncStatus('包場內容已更新', 'success');
    } catch (error) {
        console.error('更新包場內容選項失敗：', error);
        alert('更新失敗：' + error.message);
    }
}

async function reorderVenueContentOptions(idOrder) {
    try {
        const client = supabaseClient || await initSupabaseClient();
        if (!client) throw new Error('Supabase 未連線');
        const updates = idOrder.map((id, idx) => client.from('venue_content_options').update({ sort_order: idx + 1 }).eq('id', id));
        await Promise.all(updates);
        venueContentOptions.sort((a, b) => idOrder.indexOf(a.id) - idOrder.indexOf(b.id));
        renderVenueContentSelect();
        renderVenueContentList();
    } catch (error) {
        console.error('排序包場內容選項失敗：', error);
        alert('排序失敗：' + error.message);
    }
}

// ========== 訂單儲存到 Supabase ==========
async function saveOrderToSupabase(orderData) {
    try {
        console.log('開始儲存訂單到 Supabase...', orderData);
        const client = supabaseClient || await initSupabaseClient();
        if (!client) {
            console.error('無法儲存訂單：Supabase 未連線');
            return null;
        }
        
        const { data, error } = await client
            .from('menu_orders')
            .insert(orderData)
            .select()
            .single();
        
        if (error) {
            console.error('Supabase 插入錯誤：', error);
            console.error('錯誤詳情:', error.message, error.details, error.hint);
            throw error;
        }
        
        console.log('✅ 訂單已成功儲存到 Supabase:', data);
        console.log('訂單 ID:', data.id);
        return data;
    } catch (error) {
        console.error('❌ 儲存訂單到 Supabase 失敗：', error);
        console.error('錯誤詳情:', error.message, error.details);
        return null;
    }
}

// ========== 從 Supabase 載入訂單歷史 ==========
let supabaseOrders = []; // 快取 Supabase 訂單

async function loadOrdersFromSupabase() {
    try {
        console.log('開始從 Supabase 載入訂單...');
        const client = supabaseClient || await initSupabaseClient();
        if (!client) {
            console.error('無法載入訂單：Supabase 未連線');
            supabaseOrders = [];
            return [];
        }
        
        console.log('查詢 menu_orders 表...');
        const { data, error } = await client
            .from('menu_orders')
            .select('*')
            .order('is_pinned', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(100);
        
        if (error) {
            console.error('Supabase 查詢錯誤：', error);
            throw error;
        }
        
        console.log(`Supabase 返回 ${data?.length || 0} 筆原始資料`);
        
        if (!data || data.length === 0) {
            console.warn('Supabase 中沒有訂單資料');
            supabaseOrders = [];
            return [];
        }
        
        // 轉換為歷史菜單格式
        supabaseOrders = data.map(order => {
            const cartItems = Array.isArray(order.cart_items) ? order.cart_items : [];
            const itemCount = cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
            const preview = cartItems.slice(0, 3).map(i => i.name || i.nameEn || '未知').join(', ') || '無品項';
            
            return {
            id: order.id,
            name: order.company_name || '未命名',
            customerName: order.company_name,
            customerTaxId: order.tax_id,
            // ✅ 保存 Supabase 原始資料（唯一資料來源）
            dining_datetime: order.dining_datetime, // Supabase 原始欄位名稱
            diningDateTime: order.dining_datetime,   // 轉換後的欄位名稱（兼容）
            savedAt: order.updated_at || order.created_at, // 使用 updated_at 優先
            peopleCount: order.people_count || 1,
            tableCount: order.table_count || 1,
                cart: cartItems,
            orderInfo: {
                companyName: order.company_name,
                taxId: order.tax_id,
                contactName: order.contact_name,
                contactPhone: order.contact_phone,
                    planType: order.plan_type,
                    lineName: order.line_name,
                industry: order.industry,
                venueContent: order.venue_content,
                venueScope: order.venue_scope,
                diningStyle: order.dining_style,
                paymentMethod: order.payment_method,
                discount: order.discount,
            depositPaid: order.deposit_paid || 0,
                customerBudget: Number.isFinite(order.customer_budget) ? Number(order.customer_budget) : 0,
                // ✅ orderInfo 中的 diningDateTime 也來自 Supabase（確保一致性）
                diningDateTime: order.dining_datetime
            },
            meta: {
                    itemCount: itemCount,
                    estimatedTotal: order.total || 0,
                    estimatedPerPerson: order.per_person || 0,
                    preview: preview,
                    createdBy: order.created_by || '未知'
                },
                fromSupabase: true, // 標記來源
                isPinned: order.is_pinned || false, // 功能 D：釘選狀態
                is_completed: order.is_completed || false, // 完成狀態
                isCompleted: order.is_completed || false // 兼容欄位名稱
            };
        });
        
        console.log(`✅ 已從 Supabase 載入 ${supabaseOrders.length} 筆訂單`);
        console.log('訂單範例:', supabaseOrders[0]);
        return supabaseOrders;
    } catch (error) {
        console.error('❌ 從 Supabase 載入訂單失敗：', error);
        console.error('錯誤詳情:', error.message, error.details);
        supabaseOrders = [];
        return [];
    }
}

// 合併本地和 Supabase 訂單（去重）- 功能 D：支援釘選排序
function getMergedOrders() {
    // 不再使用 localStorage，完全依賴 Supabase
    // 只返回 Supabase 訂單
    const merged = [...supabaseOrders];
    
    // 功能 D：先按完成狀態排序（未完成在前），然後按釘選狀態排序（釘選的在前），最後按時間排序（最新在前）
    merged.sort((a, b) => {
        const completedA = a.is_completed || a.isCompleted || false;
        const completedB = b.is_completed || b.isCompleted || false;
        const pinnedA = a.isPinned || false;
        const pinnedB = b.isPinned || false;
        
        // 先比較完成狀態（未完成的在前）
        if (completedA !== completedB) {
            return completedA ? 1 : -1; // 未完成的在前
        }
        
        // 完成狀態相同，比較釘選狀態
        if (pinnedA !== pinnedB) {
            return pinnedB ? 1 : -1; // 釘選的在前
        }
        
        // 完成和釘選狀態都相同，按時間排序
        const dateA = a.dining_datetime || a.diningDateTime || a.savedAt || a.created_at || '';
        const dateB = b.dining_datetime || b.diningDateTime || b.savedAt || b.created_at || '';
        if (dateA && dateB) {
            return dateB.localeCompare(dateA); // 最新的在前（使用字串比較避免時區問題）
        }
        return 0;
    });
    
    return merged;
}

// 刪除 Supabase 訂單
async function deleteOrderFromSupabase(orderId) {
    try {
        const client = supabaseClient || await initSupabaseClient();
        if (!client) return false;
        
        const { error } = await client
            .from('menu_orders')
            .delete()
            .eq('id', orderId);
        
        if (error) throw error;
        
        // 從快取中移除
        supabaseOrders = supabaseOrders.filter(o => o.id !== orderId);
        console.log('訂單已從 Supabase 刪除:', orderId);
        return true;
    } catch (error) {
        console.error('刪除 Supabase 訂單失敗：', error);
        return false;
    }
}

// 將本地訂單完全同步到 Supabase（清除雲端後重新上傳）
async function syncLocalOrdersToSupabase() {
    const localMenus = getSavedMenus();
    
    // 過濾出有效的訂單（排除自動同步記錄）
    const validMenus = localMenus.filter(menu => 
        !menu.autoGenerated && 
        menu.name && 
        !menu.name.startsWith('最新同步')
    );
    
    const client = supabaseClient || await initSupabaseClient();
    if (!client) {
        showSyncStatus('無法連線到雲端', 'error');
        return 0;
    }
    
    if (!confirm(`確定要同步嗎？\n\n這將會：\n1. 清除雲端所有訂單\n2. 上傳本地 ${validMenus.length} 筆訂單\n\n此操作無法復原。`)) {
        return 0;
    }
    
    showSyncStatus('正在清除雲端資料...', 'pending');
    
    // 1. 先查詢所有現有訂單的 ID
    try {
        const { data: existingOrders, error: selectError } = await client
            .from('menu_orders')
            .select('id');
        
        if (selectError) {
            console.error('查詢雲端資料失敗:', selectError);
            showSyncStatus('查詢雲端資料失敗', 'error');
            return 0;
        }
        
        console.log(`雲端有 ${existingOrders?.length || 0} 筆訂單需要刪除`);
        
        // 2. 逐個刪除（確保 RLS 不會阻擋）
        if (existingOrders && existingOrders.length > 0) {
            for (const order of existingOrders) {
                const { error: deleteError } = await client
                    .from('menu_orders')
                    .delete()
                    .eq('id', order.id);
                
                if (deleteError) {
                    console.warn('刪除訂單失敗:', order.id, deleteError);
                }
            }
            console.log('雲端訂單已清除');
        }
    } catch (err) {
        console.error('清除雲端資料錯誤:', err);
        showSyncStatus('清除雲端資料失敗', 'error');
        return 0;
    }
    
    // 清空本地快取
    supabaseOrders = [];
    
    if (validMenus.length === 0) {
        showSyncStatus('雲端已清除，本地無訂單需同步', 'success');
        renderHistoryList();
        return 0;
    }
    
    // 2. 批次上傳本地訂單
    let successCount = 0;
    showSyncStatus(`正在上傳 ${validMenus.length} 筆訂單...`, 'pending');
    
    for (const menu of validMenus) {
        try {
            const orderInfo = menu.orderInfo || {};
            const cartItems = menu.cart || [];
            const totals = calculateTotalsWithoutDiscount(cartItems, menu.peopleCount || 1);
            const { subtotal, serviceFee, total, perPerson } = totals;
            
            const orderData = {
                company_name: orderInfo.companyName || menu.customerName || menu.name || '',
                tax_id: orderInfo.taxId || menu.customerTaxId || '',
                contact_name: orderInfo.contactName || '',
                contact_phone: orderInfo.contactPhone || '',
                plan_type: orderInfo.planType || '',
                line_name: orderInfo.lineName || '',
                industry: orderInfo.industry || '',
                venue_content: orderInfo.venueContent || '',
                venue_scope: orderInfo.venueScope || '',
                dining_style: orderInfo.diningStyle || '',
                payment_method: orderInfo.paymentMethod || '',
                discount: orderInfo.discount || '',
                deposit_paid: orderInfo.depositPaid || 0,
                dining_datetime: menu.diningDateTime || null,
                table_count: menu.tableCount || 1,
                people_count: menu.peopleCount || 1,
                subtotal: subtotal,
                service_fee: serviceFee,
                total: total,
                per_person: perPerson,
                cart_items: cartItems,
                created_by: menu.meta?.createdBy || '系統同步',
                created_at: menu.savedAt || new Date().toISOString()
            };
            
            const { error } = await client
                .from('menu_orders')
                .insert(orderData);
            
            if (!error) {
                successCount++;
            } else {
                console.warn('同步訂單失敗:', menu.name, error);
            }
        } catch (err) {
            console.error('同步訂單錯誤:', err);
        }
    }
    
    showSyncStatus(`已同步 ${successCount}/${validMenus.length} 筆訂單到雲端`, 'success');
    
    // 重新載入 Supabase 訂單
    await loadOrdersFromSupabase();
    renderHistoryList();
    
    return successCount;
}

// 儲存與載入
function saveMenuToStorage() {
    // 更新儲存模態框的資訊
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totals = calculateTotalsWithoutDiscount(cart, peopleCount || 1);
    const total = totals.total; // 含服務費，不含折扣
    
    document.getElementById('saveMenuItemCount').textContent = totalItems;
    document.getElementById('saveMenuTotal').textContent = Math.round(total);
    document.getElementById('saveMenuPeople').textContent = peopleCount;
    
    // 顯示客戶資訊
    const companyName = elements.companyName?.value?.trim() || '未填寫';
    const contactName = elements.contactName?.value?.trim() || '';
    const displayName = contactName ? `${companyName} (${contactName})` : companyName;
    // 【關鍵修復】重新獲取日期時間，確保使用最新的值
    // 不傳入 customHour 參數，讓函數直接從 DOM 讀取使用者當下輸入的值
    const diningDateTime = getDiningDateTime(null); // 明確傳入 null，不使用任何舊值
    const planType = elements.planType?.value || '';
    const lineName = elements.lineName?.value?.trim() || '';
    
    let customerDisplay = displayName;
    if (planType) customerDisplay += ` - ${planType}`;
    if (lineName) customerDisplay += ` (LINE: ${lineName})`;
    
    document.getElementById('saveMenuCustomerName').textContent = customerDisplay;
    document.getElementById('saveMenuDiningDateTime').textContent = diningDateTime ? formatDate(new Date(diningDateTime)) : '未設定';
    
    // 顯示儲存模態框
    document.getElementById('saveMenuModal').style.display = 'block';
}

// ========== 功能 B：訂單的新增/修改/刪除 ==========

/**
 * 儲存或更新訂單到 Supabase
 * @param {Object} orderData - 訂單資料
 * @param {string|null} orderId - 訂單 ID（null 表示新增）
 * @returns {Object|null} 儲存後的訂單資料
 */
async function saveOrUpdateOrderToSupabase(orderData, orderId = null) {
    try {
        const client = supabaseClient || await initSupabaseClient();
        if (!client) {
            console.error('無法儲存訂單：Supabase 未連線');
            return null;
        }
        
        if (orderId) {
            // 更新現有訂單
            console.log('更新訂單到 Supabase...', { orderId, orderData });
            const { data, error } = await client
                .from('menu_orders')
                .update({ ...orderData, updated_at: new Date().toISOString() })
                .eq('id', orderId)
                .select()
                .single();
            
            if (error) {
                console.error('Supabase 更新錯誤：', error);
                console.error('錯誤詳情:', error.message, error.details, error.hint);
                throw error;
            }
            
            console.log('✅ 訂單已成功更新到 Supabase:', data);
            return data;
        } else {
            // 新增訂單
            console.log('新增訂單到 Supabase...', orderData);
            const { data, error } = await client
                .from('menu_orders')
                .insert(orderData)
                .select()
                .single();
            
            if (error) {
                console.error('Supabase 插入錯誤：', error);
                console.error('錯誤詳情:', error.message, error.details, error.hint);
                throw error;
            }
            
            console.log('✅ 訂單已成功儲存到 Supabase:', data);
            return data;
        }
    } catch (error) {
        console.error('❌ 儲存/更新訂單到 Supabase 失敗：', error);
        console.error('錯誤詳情:', error.message, error.details);
        return null;
    }
}

/**
 * 刪除訂單
 * @param {string} orderId - 訂單 ID
 * @returns {boolean} 是否成功刪除
 */
async function deleteOrderFromSupabaseById(orderId) {
    try {
        const client = supabaseClient || await initSupabaseClient();
        if (!client) {
            console.error('無法刪除訂單：Supabase 未連線');
            return false;
        }
        
        console.log('刪除訂單...', orderId);
        const { error } = await client
            .from('menu_orders')
            .delete()
            .eq('id', orderId);
        
        if (error) {
            console.error('Supabase 刪除錯誤：', error);
            console.error('錯誤詳情:', error.message, error.details, error.hint);
            throw error;
        }
        
        console.log('✅ 訂單已成功刪除');
        return true;
    } catch (error) {
        console.error('❌ 刪除訂單失敗：', error);
        console.error('錯誤詳情:', error.message, error.details);
        return false;
    }
}

async function confirmSaveMenu(isNewOrder = false) {
    // 確保 Supabase 已初始化
    console.log('檢查 Supabase 連線狀態...');
    const client = supabaseClient || await initSupabaseClient();
    if (!client) {
        console.error('Supabase 連線失敗，嘗試重新初始化...');
        supabaseInitialized = false;
        supabaseClient = null;
        const retryClient = await initSupabaseClient();
        if (!retryClient) {
            alert('無法連線到 Supabase 雲端資料庫\n\n請檢查：\n1. 網路連線是否正常\n2. 瀏覽器 Console 是否有錯誤訊息\n3. 稍後再試');
        return;
        }
    }
    
    // 【步驟 4】強制驗證：更新前把「可疑欄位」全部列印出來
    console.log('🔍 [更新前驗證] 檢查所有可疑欄位:');
    const allHourElements = document.querySelectorAll('#diningHour');
    allHourElements.forEach((el, idx) => {
        console.log(`  #diningHour[${idx}]:`, {
            outerHTML: el.outerHTML.substring(0, 150),
            value: el.value,
            offsetParent: el.offsetParent !== null,
            display: window.getComputedStyle(el).display,
            isVisible: el.offsetParent !== null && window.getComputedStyle(el).display !== 'none'
        });
    });
    
    // 重新同步 elements 引用（確保讀到最新的 DOM 元素）
    elements.diningDate = document.getElementById('diningDate');
    elements.diningHour = document.getElementById('diningHour');
    elements.diningMinute = document.getElementById('diningMinute');
    
    // 取得所有訂單資訊（確保獲取最新值，在保存前最後一次獲取）
    const orderInfo = getOrderInfo();
    
    // 【關鍵修復】重新獲取日期時間，確保使用最新的值
    // 不傳入 customHour 參數，讓函數直接從 DOM 讀取使用者當下輸入的值
    const diningDateTime = getDiningDateTime(null); // 明確傳入 null，不使用任何舊值
    
    // 調試：確認獲取到的值（對比主表單和 elements 引用）
    console.log('🔍 [更新前驗證] 保存前的訂單資訊:', {
        orderInfo,
        diningDateTime,
        // 主表單直接讀取的值
        mainFormDirectRead: {
            diningDate: document.getElementById('diningDate')?.value,
            diningHour: document.getElementById('diningHour')?.value,
            diningMinute: document.getElementById('diningMinute')?.value,
            diningHourCustom: document.getElementById('diningHourCustom')?.value
        },
        // elements 引用的值
        elementsReference: {
            diningDate: elements.diningDate?.value,
            diningHour: elements.diningHour?.value,
            diningMinute: elements.diningMinute?.value
        },
        // 驗證兩者是否一致
        valuesMatch: {
            date: document.getElementById('diningDate')?.value === elements.diningDate?.value,
            hour: document.getElementById('diningHour')?.value === elements.diningHour?.value,
            minute: document.getElementById('diningMinute')?.value === elements.diningMinute?.value
        },
        isUpdate: currentEditingOrderId !== null && !isNewOrder,
        isNewOrder: isNewOrder,
        orderId: currentEditingOrderId
    });
    
    // 使用公司名稱作為菜單名稱
    const menuName = orderInfo.companyName || companyName;
    
    const menuSnapshot = deepClone(menuData);
    const createdBy = currentUser?.username || '未知';
    
    // 計算購物車中的餐點數量和金額
    const cartItemCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
    const totalsForSave = calculateTotalsWithoutDiscount(cart, peopleCount || 1);
    const { subtotal, serviceFee, total: estimatedTotal, perPerson: estimatedPerPerson } = totalsForSave;
    
    // 建立購物車預覽
    const cartPreview = cart.slice(0, 3).map(item => item.name).join(', ') + (cart.length > 3 ? '...' : '');
    
    // 儲存訂單到 Supabase（確保使用最新的 orderInfo 和 diningDateTime）
    const supabaseOrder = {
        company_name: orderInfo.companyName || null,
        tax_id: orderInfo.taxId || null,
        contact_name: orderInfo.contactName || null,
        contact_phone: orderInfo.contactPhone || null,
        plan_type: orderInfo.planType || null,
        line_name: orderInfo.lineName || null,
        industry: orderInfo.industry || null,
        venue_content: orderInfo.venueContent || null,
        venue_scope: orderInfo.venueScope || null,
        dining_style: orderInfo.diningStyle || null,
        payment_method: orderInfo.paymentMethod || null,
        discount: orderInfo.discount || '',
        deposit_paid: orderInfo.depositPaid || 0,
        dining_datetime: diningDateTime || null, // 使用最新獲取的日期時間
        table_count: orderInfo.tableCount || tableCount || 1,
        people_count: orderInfo.peopleCount || peopleCount || 1,
        customer_budget: orderInfo.customerBudget || null,
        subtotal: subtotal || 0,
        service_fee: serviceFee || 0,
        total: estimatedTotal || 0,
        per_person: estimatedPerPerson || 0,
        cart_items: Array.isArray(cart) ? cart : [],
        created_by: createdBy || '未知'
    };
    
    // 調試：確認保存的資料
    console.log('💾 準備保存到 Supabase 的資料:', {
        dining_datetime: supabaseOrder.dining_datetime,
        company_name: supabaseOrder.company_name,
        venue_content: supabaseOrder.venue_content,
        discount: supabaseOrder.discount,
        allFields: supabaseOrder
    });
    
    // 判斷是新增還是更新
    // 如果 isNewOrder 為 true，強制新增（即使有 currentEditingOrderId）
    const isUpdate = currentEditingOrderId !== null && !isNewOrder;
    const actualOrderId = isUpdate ? currentEditingOrderId : null;
    console.log(isUpdate ? '準備更新訂單到 Supabase...' : '準備儲存訂單到 Supabase...', {
        isUpdate,
        isNewOrder,
        orderId: actualOrderId,
        originalOrderId: currentEditingOrderId,
        supabaseOrder,
        diningDateTime: supabaseOrder.dining_datetime,
        orderInfo: supabaseOrder
    });
    
    // 調試 1：更新送出前的表單值（只針對當前編輯的訂單）
    if (currentEditingOrderId) {
        console.log('📋 [Debug 1] 更新送出前 - 表單值:', {
            orderId: currentEditingOrderId,
            orderInfoDiningDateTime: orderInfo.diningDateTime,
            diningDateTime: diningDateTime
        });
    }
    
    // 儲存或更新訂單（如果是新訂單，傳入 null 強制新增）
    const savedOrder = await saveOrUpdateOrderToSupabase(supabaseOrder, actualOrderId);
    
    if (!savedOrder) {
        console.error('儲存/更新訂單失敗');
        alert('儲存失敗，請檢查 Supabase 連線\n\n請開啟瀏覽器 Console (F12) 查看詳細錯誤訊息');
        return;
    }
    
    console.log(`訂單已成功${isUpdate ? '更新' : '儲存'}到 Supabase，ID:`, savedOrder.id);
    
    // 【關鍵修復】更新成功後，立即從 Supabase 重新讀取完整 row，確保拿到最新資料
    let finalOrderData = savedOrder;
    if (isUpdate && savedOrder.id) {
        try {
            const client = supabaseClient || await initSupabaseClient();
            if (client) {
                const { data: refreshedOrder, error: refreshError } = await client
                    .from('menu_orders')
                    .select('*')
                    .eq('id', savedOrder.id)
                    .single();
                
                if (!refreshError && refreshedOrder) {
                    finalOrderData = refreshedOrder;
                    console.log('🔄 已從 Supabase 重新讀取最新資料:', finalOrderData);
                }
            }
        } catch (refreshErr) {
            console.warn('重新讀取訂單失敗，使用回傳值:', refreshErr);
        }
    }
    
    // 調試 2：Supabase 回傳後的值（只針對當前編輯的訂單）
    if (currentEditingOrderId && finalOrderData) {
        console.log('📋 [Debug 2] Supabase 回傳後 - 資料庫回來的值:', {
            orderId: currentEditingOrderId,
            dining_datetime: finalOrderData.dining_datetime,
            updated_at: finalOrderData.updated_at
        });
    }
    
    // 更新快取（確保使用最新的 finalOrderData 資料）
    const orderIndex = supabaseOrders.findIndex(o => o.id === finalOrderData.id);
    
    // 【單一真實資料來源】建立更新後的訂單物件，優先順序固定為：
    // orderInfo.diningDateTime → diningDateTime → savedAt/createdAt
    const updatedOrder = {
        id: finalOrderData.id,
        name: finalOrderData.company_name || menuName,
        customerName: finalOrderData.company_name,
        customerTaxId: finalOrderData.tax_id,
        // 單一資料來源：diningDateTime 直接來自 Supabase 回傳值
        diningDateTime: finalOrderData.dining_datetime || null,
        savedAt: finalOrderData.updated_at || finalOrderData.created_at,
        peopleCount: finalOrderData.people_count || peopleCount,
        tableCount: finalOrderData.table_count || tableCount,
        cart: Array.isArray(finalOrderData.cart_items) ? finalOrderData.cart_items : cart,
        orderInfo: {
            companyName: finalOrderData.company_name,
            taxId: finalOrderData.tax_id,
            contactName: finalOrderData.contact_name,
            contactPhone: finalOrderData.contact_phone,
            planType: finalOrderData.plan_type,
            lineName: finalOrderData.line_name,
            industry: finalOrderData.industry,
            venueContent: finalOrderData.venue_content,
            venueScope: finalOrderData.venue_scope,
            diningStyle: finalOrderData.dining_style,
            paymentMethod: finalOrderData.payment_method,
            discount: finalOrderData.discount || '',
            depositPaid: finalOrderData.deposit_paid || 0,
            // 單一資料來源：orderInfo.diningDateTime 也直接來自 Supabase 回傳值
            diningDateTime: finalOrderData.dining_datetime || null
        },
        meta: {
            itemCount: cartItemCount,
            estimatedTotal: estimatedTotal,
            estimatedPerPerson: estimatedPerPerson,
            preview: cartPreview || '無品項',
            createdBy: finalOrderData.created_by || createdBy
        },
        fromSupabase: true,
        isPinned: finalOrderData.is_pinned || false
    };
    
    // 【關鍵修復】直接更新 supabaseOrders 陣列中的對應項目（確保是同一份陣列引用）
    if (orderIndex >= 0) {
        // 完全覆蓋現有訂單物件（不能只改部分欄位）
        supabaseOrders[orderIndex] = updatedOrder;
        console.log(`✅ 已更新快取中索引 ${orderIndex} 的訂單`);
    } else {
        // 新增訂單（放在最前面）
        supabaseOrders.unshift(updatedOrder);
        console.log('✅ 已新增訂單到快取');
    }
    
    // 限制快取數量
    if (supabaseOrders.length > 100) {
        supabaseOrders = supabaseOrders.slice(0, 100);
    }
    
    // 調試 3：寫入快取後的值（在清空 currentEditingOrderId 之前記錄）
    const editingOrderId = currentEditingOrderId; // 保存當前編輯的訂單 ID
    if (editingOrderId && orderIndex >= 0) {
        const cachedOrder = supabaseOrders[orderIndex];
        console.log('📋 [Debug 3] 寫入快取後 - 快取中的值:', {
            orderId: editingOrderId,
            cacheIndex: orderIndex,
            diningDateTime: cachedOrder.diningDateTime,
            orderInfoDiningDateTime: cachedOrder.orderInfo.diningDateTime,
            isSameObject: cachedOrder === updatedOrder,
            cachedOrderFull: cachedOrder
        });
        
        // 驗證快取中的值是否正確
        if (cachedOrder.diningDateTime !== finalOrderData.dining_datetime) {
            console.error('❌ 快取更新失敗！快取中的值與 Supabase 回傳值不一致:', {
                cached: cachedOrder.diningDateTime,
                supabase: finalOrderData.dining_datetime
            });
        } else {
            console.log('✅ 快取更新成功，值一致');
        }
    }
    
    console.log('快取已更新，目前訂單數量:', supabaseOrders.length);
    
    // 【關鍵修復】強制重新渲染歷史列表（無論 modal 是否開啟）
    // 使用 setTimeout 確保 DOM 更新完成後再渲染
    setTimeout(() => {
        const historyModal = document.getElementById('historyModal');
        if (historyModal && historyModal.style.display === 'block') {
            console.log('🔄 歷史列表 modal 已開啟，強制重新渲染列表...');
            // 清除可能的快取
            window._currentFilteredMenus = null;
            renderHistoryList();
        }
    }, 100);
    
    // 重置編輯狀態（只有在新增時才清空，更新時保留 currentEditingOrderId）
    if (!isUpdate) {
        // 新增訂單：清空編輯狀態
        currentEditingOrderId = null;
        clearOrderForm();
    } else {
        // 更新訂單：保留 currentEditingOrderId，不清空表單
        console.log('✅ 訂單已更新，保留編輯狀態');
    }
    updateSaveButtonState();
    
    // 關閉模態框
    document.getElementById('saveMenuModal').style.display = 'none';
    
    alert(`訂單「${menuName}」已成功${isUpdate ? '更新' : '儲存'}！`);
    saveToStorage({ reason: 'manual-save', summary: `${isUpdate ? '更新' : '儲存'}訂單「${menuName}」`, menuName });
}

/**
 * 清除訂單表單
 */
function clearOrderForm() {
    if (elements.companyName) elements.companyName.value = '';
    if (elements.customerTaxId) elements.customerTaxId.value = '';
    if (elements.contactName) elements.contactName.value = '';
    if (elements.contactPhone) elements.contactPhone.value = '';
    if (elements.planType) elements.planType.value = '';
    if (elements.lineName) elements.lineName.value = '';
    if (elements.industrySelect) elements.industrySelect.value = '';
    if (elements.depositPaid) elements.depositPaid.value = '';
    if (elements.diningDate) elements.diningDate.value = '';
    if (elements.diningHour) elements.diningHour.value = '';
    if (elements.diningMinute) elements.diningMinute.value = '';
    
    // 清除自訂下拉選單
    setCustomizableSelectValue('venueScope', 'venueScopeCustom', ['全包', '叢林區', '蘆葦區'], '');
    setCustomizableSelectValue('diningStyle', 'diningStyleCustom', ['自助', '桌菜'], '');
    setCustomizableSelectValue('paymentMethod', 'paymentMethodCustom', ['匯款', '刷卡', '當天結帳'], '');
    
    // 清除購物車
    cart = [];
    renderCart();
    
    // 更新填寫狀態顏色（清空後所有欄位應該是空的）
    initFillStateStyling();
    
    // 重置人數和桌數
    tableCount = 1;
    peopleCount = 1;
    if (elements.tableCountInput) elements.tableCountInput.value = 1;
    if (elements.peopleCountInput) elements.peopleCountInput.value = 1;
    updateCartSummary();
}

/**
 * 更新儲存按鈕狀態
 */
function updateSaveButtonState() {
    const saveButton = document.getElementById('saveMenu');
    const saveButtonText = document.getElementById('saveMenuButtonText');
    const updateButton = document.getElementById('updateOrder');
    const deleteButton = document.getElementById('deleteOrder');
    
    if (currentEditingOrderId) {
        // 載入菜單：顯示「更新訂單」和「儲存菜單」按鈕
        if (updateButton) updateButton.style.display = 'inline-flex';
        if (saveButton) saveButton.style.display = 'inline-flex';
        if (saveButtonText) saveButtonText.textContent = '儲存菜單';
        if (deleteButton) deleteButton.style.display = 'inline-flex';
    } else {
        // 新菜單：只顯示「儲存菜單」按鈕
        if (updateButton) updateButton.style.display = 'none';
        if (saveButton) saveButton.style.display = 'inline-flex';
        if (saveButtonText) saveButtonText.textContent = '儲存菜單';
        if (deleteButton) deleteButton.style.display = 'none';
    }
}

/**
 * 刪除目前編輯的訂單
 */
async function deleteCurrentOrder() {
    if (!currentEditingOrderId) {
        alert('目前沒有正在編輯的訂單');
        return;
    }
    
    if (!confirm('確定要刪除這筆訂單嗎？此動作無法復原。')) {
        return;
    }
    
    const success = await deleteOrderFromSupabaseById(currentEditingOrderId);
    if (!success) {
        alert('刪除失敗，請檢查 Supabase 連線\n\n請開啟瀏覽器 Console (F12) 查看詳細錯誤訊息');
        return;
    }
    
    // 從快取中移除
    supabaseOrders = supabaseOrders.filter(o => o.id !== currentEditingOrderId);
    
    // 清除表單
    clearOrderForm();
    currentEditingOrderId = null;
    updateSaveButtonState();
    
    // 重新渲染歷史列表
    renderHistoryList();
    
    alert('訂單已成功刪除！');
    console.log('✅ 訂單已刪除，表單已清空');
}

function saveToStorage(options = {}) {
    const snapshot = getCurrentStateSnapshot();
    upsertAutoHistoryEntry(snapshot);
    const currentData = getCurrentStatePayload(snapshot);
    
    // 不再儲存到 localStorage，只同步到 Supabase
    // localStorage.setItem('currentMenu', JSON.stringify(currentData));
    
    // 只同步到 Supabase，確保與雲端和其他協作者同步
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
    // 不再使用 localStorage 儲存歷史記錄
    // 歷史訂單應該從 Supabase 的 menu_orders 表載入
    // 此函數保留以維持相容性，但不再執行任何操作
    try {
        // 歷史記錄現在完全依賴 Supabase
        // 如果需要自動歷史記錄，應該儲存到 Supabase 的 menu_orders 表
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

async function showHistoryModal() {
    document.getElementById('historyModal').style.display = 'block';
    
    // 顯示載入中
    const historyList = document.getElementById('historyList');
    if (historyList) {
        historyList.innerHTML = '<div class="loading-history"><i class="fas fa-spinner fa-spin"></i> 載入中...</div>';
    }
    
    // 填充產業篩選器選項
    const industryFilter = document.getElementById('historyIndustryFilter');
    if (industryFilter) {
        industryFilter.innerHTML = '<option value="">全部產業</option>';
        industryOptions.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.name;
            option.textContent = opt.name;
            industryFilter.appendChild(option);
        });
    }
    
    // 從 Supabase 載入訂單（強制重新載入）
    try {
        // 清空快取，強制重新載入
        supabaseOrders = [];
        
        const loadedOrders = await loadOrdersFromSupabase();
        const mergedOrders = getMergedOrders();
        
        console.log('載入完成，訂單數量:', loadedOrders.length);
        console.log('supabaseOrders 快取數量:', supabaseOrders.length);
        console.log('合併後訂單數量:', mergedOrders.length);
        
        if (mergedOrders.length === 0) {
            console.warn('沒有載入到任何訂單');
            if (historyList) {
                historyList.innerHTML = '<div class="empty-history">目前沒有任何歷史記錄<br><small>請先儲存一張菜單</small></div>';
            }
            return;
        }
    } catch (error) {
        console.error('載入訂單失敗:', error);
        if (historyList) {
            historyList.innerHTML = '<div class="error-message">載入訂單失敗：' + (error.message || '未知錯誤') + '<br><small>請檢查 Supabase 連線</small></div>';
        }
        return;
    }
    
    // 渲染歷史列表
    const mergedOrders = getMergedOrders();
    console.log('開始渲染歷史列表，訂單數量:', mergedOrders.length);
    
    if (mergedOrders.length === 0) {
        if (historyList) {
            historyList.innerHTML = '<div class="empty-history">目前沒有任何歷史記錄<br><small>請先儲存一張菜單</small></div>';
        }
        return;
    }
    
    renderHistoryList();
    
    // 確保Modal事件正確綁定
    bindModalEvents();
}

// ========== 歷史列表欄位設定 ==========
const HISTORY_COLUMN_KEY = 'history_columns_config_v2';
const historyColumnDefinitions = [
    { id: 'select', label: '勾選欄位', sortable: false },
    { id: 'pin', label: '釘選', sortable: false, sortField: 'pinned' },
    { id: 'completed', label: '完成', sortable: false },
    { id: 'date', label: '用餐日期', sortable: true, sortField: 'date' },
    { id: 'company', label: '公司名稱', sortable: true, sortField: 'companyName' },
    { id: 'taxId', label: '統編', sortable: true, sortField: 'taxId' },
    { id: 'contact', label: '聯絡人', sortable: true, sortField: 'contactName' },
    { id: 'line', label: 'LINE', sortable: true, sortField: 'lineName' },
    { id: 'plan', label: '方案', sortable: true, sortField: 'planType' },
    { id: 'venueScope', label: '包場範圍', sortable: true, sortField: 'venueScope' },
    { id: 'venueContent', label: '包場內容', sortable: true, sortField: 'venueContent' },
    { id: 'diningStyle', label: '用餐方式', sortable: true, sortField: 'diningStyle' },
    { id: 'people', label: '人數/桌數', sortable: true, sortField: 'people' },
    { id: 'total', label: '總額', sortable: true, sortField: 'total' },
    { id: 'perPerson', label: '人均', sortable: true, sortField: 'perPerson' },
    { id: 'depositPaid', label: '已付訂金', sortable: true, sortField: 'depositPaid' },
    { id: 'industry', label: '產業別', sortable: true, sortField: 'industry' },
    { id: 'actions', label: '操作', sortable: false }
];

function getDefaultHistoryColumnConfig() {
    return historyColumnDefinitions.map(col => ({ id: col.id, visible: true }));
}

function getHistoryColumnConfig() {
    try {
        const saved = localStorage.getItem(HISTORY_COLUMN_KEY);
        if (!saved) return getDefaultHistoryColumnConfig();
        const parsed = JSON.parse(saved);
        const validIds = new Set(historyColumnDefinitions.map(c => c.id));
        // 過濾已不存在的欄位，並補上新增欄位
        const filtered = parsed.filter(c => validIds.has(c.id));
        const existingIds = new Set(filtered.map(c => c.id));
        historyColumnDefinitions.forEach(def => {
            if (!existingIds.has(def.id)) {
                filtered.push({ id: def.id, visible: true });
            }
        });
        return filtered;
    } catch (e) {
        console.warn('讀取欄位設定失敗，使用預設', e);
        return getDefaultHistoryColumnConfig();
    }
}

function saveHistoryColumnConfig(config) {
    localStorage.setItem(HISTORY_COLUMN_KEY, JSON.stringify(config));
}

function getActiveHistoryColumns() {
    const config = getHistoryColumnConfig();
    const defMap = Object.fromEntries(historyColumnDefinitions.map(d => [d.id, d]));
    return config
        .filter(c => c.visible && defMap[c.id])
        .map(c => defMap[c.id]);
}

function ensureHistoryColumnSettingsModal() {
    if (document.getElementById('historyColumnSettingsModal')) return;
    const modal = document.createElement('div');
    modal.id = 'historyColumnSettingsModal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content medium">
            <button class="close" onclick="closeModal('historyColumnSettingsModal')">&times;</button>
            <h3>欄位設定</h3>
            <p class="modal-description">勾選顯示、拖曳排序（置頂欄位除外）。</p>
            <div id="historyColumnList" class="column-setting-list"></div>
            <div class="modal-footer">
                <button class="btn btn-secondary" id="resetHistoryColumns">恢復預設</button>
                <div style="flex:1"></div>
                <button class="btn btn-primary" id="saveHistoryColumns">套用</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function openHistoryColumnSettings() {
    ensureHistoryColumnSettingsModal();
    const list = document.getElementById('historyColumnList');
    const config = getHistoryColumnConfig();
    const defMap = Object.fromEntries(historyColumnDefinitions.map(d => [d.id, d]));
    list.innerHTML = config.map(colCfg => {
        const def = defMap[colCfg.id];
        if (!def) return '';
        const handle = '<span class="drag-handle" title="拖曳排序">☰</span>';
        const checkbox = `<input type="checkbox" class="column-visible" data-id="${def.id}" ${colCfg.visible ? 'checked' : ''}>`;
        return `<div class="column-setting-item" data-id="${def.id}">${handle}${checkbox}<span class="column-label">${def.label}</span></div>`;
    }).join('');

    if (window.Sortable && list) {
        Sortable.create(list, {
            animation: 150,
            handle: '.drag-handle'
        });
    }

    const saveBtn = document.getElementById('saveHistoryColumns');
    saveBtn.onclick = () => {
        const items = Array.from(list.querySelectorAll('.column-setting-item'));
        const newConfig = items.map(item => {
            const id = item.getAttribute('data-id');
            const checked = item.querySelector('.column-visible').checked;
            return { id, visible: checked };
        });
        saveHistoryColumnConfig(newConfig);
        closeModal('historyColumnSettingsModal');
        renderHistoryList();
    };

    const resetBtn = document.getElementById('resetHistoryColumns');
    resetBtn.onclick = () => {
        saveHistoryColumnConfig(getDefaultHistoryColumnConfig());
        closeModal('historyColumnSettingsModal');
        renderHistoryList();
    };

    openModal('historyColumnSettingsModal');
}

function getHistoryColumnClass(id) {
    switch (id) {
        case 'select': return 'checkbox-col';
        case 'pin': return 'pin-col';
        case 'date': return 'date-col';
        case 'actions': return 'actions-col';
        case 'people': return 'people-col';
        case 'total': return 'total-col';
        case 'perPerson': return 'perperson-col';
        case 'depositPaid': return 'deposit-col';
        case 'taxId': return 'tax-col';
        case 'industry': return 'industry-col';
        case 'company': return 'company-col';
        case 'contact': return 'contact-col';
        case 'line': return 'line-col';
        case 'plan': return 'plan-col';
        case 'venueContent': return 'venue-content-col';
        case 'venueScope': return 'venue-scope-col';
        case 'diningStyle': return 'dining-style-col';
        default: return '';
    }
}

function renderHistoryHeaderCell(col) {
    const sortField = col.sortField;
    const isSortable = !!sortField;
    const sortClass = isSortable && historySort.field === sortField ? 'sort-' + historySort.direction : '';
    const colClass = getHistoryColumnClass(col.id);
    const classNames = [];
    if (colClass) classNames.push(colClass);
    if (isSortable) classNames.push('sortable');
    if (sortClass) classNames.push(sortClass);
    const classAttr = classNames.join(' ');

    switch (col.id) {
        case 'select':
            return `<th class="${classAttr}" onclick="event.stopPropagation();">
                <input type="checkbox" id="selectAllCheckbox" title="全選/取消全選">
            </th>`;
        case 'pin':
            return `<th class="${classAttr}" onclick="event.stopPropagation(); ${isSortable ? `sortHistoryBy('${sortField}')` : ''}">釘選</th>`;
        case 'completed':
            return `<th class="completed-col ${classAttr}" onclick="event.stopPropagation();">完成</th>`;
        case 'actions':
            return `<th class="${classAttr}" onclick="event.stopPropagation();">操作</th>`;
        default:
            return `<th class="${classAttr}" onclick="sortHistoryBy('${sortField || ''}')">${col.label}</th>`;
    }
}

function renderHistoryCell(col, menu, metrics, idx) {
    const orderInfo = menu.orderInfo || {};
    const total = metrics.total || 0;
    const perPerson = metrics.perPerson || 0;
    const depositPaid = orderInfo.depositPaid || 0;
    const companyName = orderInfo.companyName || menu.name || '';
    const taxId = orderInfo.taxId || '';
    const contactName = orderInfo.contactName || '';
    const lineName = orderInfo.lineName || '';
    const planType = orderInfo.planType || '';
    const venueScope = orderInfo.venueScope || '';
    const venueContent = orderInfo.venueContent || '';
    const diningStyle = orderInfo.diningStyle || '';
    const industry = orderInfo.industry || '';
    const paymentMethod = orderInfo.paymentMethod || '';
    const menuId = menu.id || '';
    const menuIdx = idx;
    const isPinned = menu.isPinned || false;
    switch (col.id) {
        case 'select':
            return `<td class="checkbox-col" onclick="event.stopPropagation();">
                <input type="checkbox" class="order-checkbox" data-menu-id="${menuId}">
            </td>`;
        case 'pin':
            return `<td class="pin-col" onclick="event.stopPropagation();">
                <button class="pin-btn ${isPinned ? 'pinned' : ''}" onclick="toggleOrderPin('${menuId}', event)" title="${isPinned ? '取消釘選' : '釘選'}">
                    <i class="fas fa-thumbtack"></i>
                </button>
            </td>`;
        case 'completed':
            const isCompleted = menu.is_completed || menu.isCompleted || false;
            return `<td class="completed-col" onclick="event.stopPropagation();">
                <input type="checkbox" class="completed-checkbox" data-menu-id="${menuId}" ${isCompleted ? 'checked' : ''} onchange="toggleOrderCompleted('${menuId}', this.checked, event)">
            </td>`;
        case 'date':
            // 歷史列表唯一可信來源：Supabase 回傳的 dining_datetime（或相容欄位）
            // 禁止 new Date()，避免 UTC->本地時區導致 12:00 變 20:00
            const rawDiningDateTime =
                (menu && (menu.dining_datetime || menu.diningDateTime)) ||
                (orderInfo && (orderInfo.dining_datetime || orderInfo.diningDateTime)) ||
                null;

            const dateTimeToDisplay = formatDiningDateTime24H(rawDiningDateTime);

            // Debug：確認沒有被時區轉換
            console.log('[History] dining_datetime raw -> display (24H):', {
                orderId: (menu && (menu.id || menu.orderId)) || null,
                rawDiningDateTime,
                dateTimeToDisplay,
            });
            
            return `<td class="date-cell">${dateTimeToDisplay}</td>`;
        case 'company':
            return `<td class="menu-name-cell" title="${companyName}">${companyName || '--'}</td>`;
        case 'taxId':
            return `<td class="tax-cell">${taxId || '--'}</td>`;
        case 'contact':
            return `<td class="contact-cell">${contactName || '--'}</td>`;
        case 'line':
            return `<td class="line-cell">${lineName || '--'}</td>`;
        case 'plan':
            return `<td class="plan-cell">${planType || '--'}</td>`;
        case 'venueScope':
            return `<td class="venue-cell">${venueScope || '--'}</td>`;
        case 'venueContent':
            return `<td class="venue-content-cell">${venueContent || '--'}</td>`;
        case 'diningStyle':
            return `<td class="dining-style-cell">${diningStyle || '--'}</td>`;
        case 'people':
            return `<td class="people-cell">${menu.peopleCount || 1}人/${menu.tableCount || 1}桌</td>`;
        case 'total':
            return `<td class="total-cell">${typeof total === 'number' ? '$' + Math.round(total).toLocaleString() : '--'}</td>`;
        case 'perPerson':
            return `<td class="perperson-cell">${typeof perPerson === 'number' ? '$' + Math.round(perPerson).toLocaleString() : '--'}</td>`;
        case 'depositPaid':
            return `<td class="deposit-cell">${depositPaid > 0 ? '$' + depositPaid.toLocaleString() : '--'}</td>`;
        case 'industry':
            return `<td class="industry-cell">${industry || '--'}</td>`;
        case 'actions':
            return `<td class="actions-cell" onclick="event.stopPropagation();">
                <button class="btn-small btn-delete" onclick="deleteHistoryMenuByData(this.closest('tr'))" title="刪除">
                    <i class="fas fa-trash"></i>
                </button>
            </td>`;
        default:
            return `<td>--</td>`;
    }
}

function renderHistoryList() {
    // 【關鍵修復】必須使用最新的 supabaseOrders 陣列，禁止使用舊的 cached copy
    // 每次渲染都重新生成 filtered/sorted，不 reuse 舊的 filteredOrders
    const allOrders = getMergedOrders(); // getMergedOrders() 內部使用最新的 supabaseOrders
    const historyList = document.getElementById('historyList');
    
    if (!historyList) {
        console.error('找不到 historyList 元素');
        return;
    }
    
    console.log('renderHistoryList - 總訂單數:', allOrders.length);
    console.log('renderHistoryList - 使用最新的 supabaseOrders 陣列，長度:', supabaseOrders.length);
    
    // 先檢查是否有訂單
    if (allOrders.length === 0) {
        historyList.innerHTML = '<div class="empty-history">目前沒有任何歷史記錄<br><small>請先儲存一張菜單</small></div>';
        return;
    }
    
    const searchTerm = document.getElementById('historySearch')?.value?.toLowerCase() || '';
    const industryFilter = document.getElementById('historyIndustryFilter')?.value || '';
    const sortBy = historySort.field;
    
    let filteredMenus = allOrders.filter(menu => {
        // 產業篩選
        if (industryFilter) {
            const menuIndustry = menu.orderInfo?.industry || '';
            if (menuIndustry !== industryFilter) {
                return false;
            }
        }
        
        // 如果沒有搜尋字詞，直接通過
        if (!searchTerm) return true;
        
        // 搜尋菜單名稱/公司名稱
        if (menu.name && menu.name.toLowerCase().includes(searchTerm)) {
            return true;
        }
        
        // 搜尋訂單資訊欄位
        if (menu.orderInfo) {
            const orderInfo = menu.orderInfo;
            if (orderInfo.companyName?.toLowerCase().includes(searchTerm) ||
                orderInfo.contactName?.toLowerCase().includes(searchTerm) ||
                orderInfo.contactPhone?.includes(searchTerm) ||
                orderInfo.taxId?.includes(searchTerm) ||
                orderInfo.industry?.toLowerCase().includes(searchTerm) ||
                orderInfo.planType?.toLowerCase().includes(searchTerm) ||
                orderInfo.lineName?.toLowerCase().includes(searchTerm) ||
                orderInfo.venueContent?.toLowerCase().includes(searchTerm) ||
                orderInfo.venueScope?.toLowerCase().includes(searchTerm) ||
                orderInfo.diningStyle?.toLowerCase().includes(searchTerm) ||
                orderInfo.paymentMethod?.toLowerCase().includes(searchTerm)) {
                return true;
            }
        }
        
        // 兼容舊格式的客戶資訊
        if (menu.customerName?.toLowerCase().includes(searchTerm) ||
            menu.customerTaxId?.includes(searchTerm)) {
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
    
    // 排序（擴展支援所有欄位）
    // 先按完成狀態排序（未完成在前），然後按用戶選擇的排序欄位排序
    filteredMenus.sort((a, b) => {
        // 先比較完成狀態（未完成的在前）
        const completedA = a.is_completed || a.isCompleted || false;
        const completedB = b.is_completed || b.isCompleted || false;
        if (completedA !== completedB) {
            return completedA ? 1 : -1; // 未完成的在前
        }
        
        // 完成狀態相同，再按用戶選擇的排序欄位排序
        let result = 0;
        const orderInfoA = a.orderInfo || {};
        const orderInfoB = b.orderInfo || {};
        
        switch (sortBy) {
            case 'pinned':
                const pinnedA = a.isPinned ? 1 : 0;
                const pinnedB = b.isPinned ? 1 : 0;
                result = pinnedB - pinnedA;
                break;
            case 'price':
            case 'perPerson':
                const aPrice = getHistoryMetrics(a).perPerson || 0;
                const bPrice = getHistoryMetrics(b).perPerson || 0;
                result = bPrice - aPrice;
                break;
            case 'date':
                // 使用字串排序，避免時區轉換問題
                const da = (a.dining_datetime || a.diningDateTime || a.savedAt || '');
                const db = (b.dining_datetime || b.diningDateTime || b.savedAt || '');
                result = db.localeCompare(da); // 新到舊（ISO 字串可直接比）
                break;
            case 'name':
            case 'companyName':
                result = ((orderInfoA.companyName || a.name || '') || '').localeCompare((orderInfoB.companyName || b.name || '') || '');
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
            case 'planType':
                result = (orderInfoA.planType || '').localeCompare(orderInfoB.planType || '');
                break;
            case 'lineName':
                result = (orderInfoA.lineName || '').localeCompare(orderInfoB.lineName || '');
                break;
            case 'diningStyle':
                result = (orderInfoA.diningStyle || '').localeCompare(orderInfoB.diningStyle || '');
                break;
            case 'venueContent':
                result = (orderInfoA.venueContent || '').localeCompare(orderInfoB.venueContent || '');
                break;
            case 'venueScope':
                result = (orderInfoA.venueScope || '').localeCompare(orderInfoB.venueScope || '');
                break;
            case 'paymentMethod':
                result = (orderInfoA.paymentMethod || '').localeCompare(orderInfoB.paymentMethod || '');
                break;
            case 'contactName':
                result = (orderInfoA.contactName || '').localeCompare(orderInfoB.contactName || '');
                break;
            case 'contactPhone':
                result = (orderInfoA.contactPhone || '').localeCompare(orderInfoB.contactPhone || '');
                break;
            case 'industry':
                result = (orderInfoA.industry || '').localeCompare(orderInfoB.industry || '');
                break;
            case 'taxId':
                result = (orderInfoA.taxId || '').localeCompare(orderInfoB.taxId || '');
                break;
            case 'depositPaid':
                result = (orderInfoB.depositPaid || 0) - (orderInfoA.depositPaid || 0);
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
    
    const activeColumns = getActiveHistoryColumns();
    const defMap = Object.fromEntries(historyColumnDefinitions.map(d => [d.id, d]));
    const headerCells = activeColumns.map(col => renderHistoryHeaderCell(col)).join('');
    const rowsHtml = filteredMenus.map((menu, idx) => {
        const metrics = getHistoryMetrics(menu);
        const menuId = menu.id || '';
        const menuIdx = idx;
        const isPinned = menu.isPinned || false;
        const isCompleted = menu.is_completed || menu.isCompleted || false;
        const rowCells = activeColumns.map(col => renderHistoryCell(col, menu, metrics, idx)).join('');
        return `
            <tr class="history-row ${isPinned ? 'pinned-row' : ''} ${isCompleted ? 'completed-row' : ''}" data-menu-id="${menuId}" data-idx="${menuIdx}" data-pinned="${isPinned}" data-completed="${isCompleted}" onclick="loadHistoryMenuByData(this)" style="cursor: pointer;">
                ${rowCells}
            </tr>
        `;
    }).join('');

    // 功能 C & D：完整的表格顯示，包含所有欄位和釘選功能
    historyList.innerHTML = `
        <div style="margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center;">
            <div>
                <button id="batchDeleteBtn" class="btn btn-danger" style="display: none; padding: 0.5rem 1rem;">
                    <i class="fas fa-trash"></i> 批量刪除 (<span id="selectedCount">0</span>)
                </button>
            </div>
            <div>
                <button class="btn btn-secondary" onclick="openHistoryColumnSettings()">欄位設定</button>
            </div>
        </div>
        <div class="history-table-wrapper">
            <table class="history-table-full" id="historyTable">
            <thead>
                <tr>
                    ${headerCells}
                </tr>
            </thead>
            <tbody>
                ${rowsHtml}
            </tbody>
        </table>
        </div>
    `;
    
    // 自動調整欄位寬度（像試算表）
    setTimeout(() => {
        autoResizeTableColumns('historyTable');
        
        // 綁定批量刪除按鈕事件（在DOM渲染後）
        const batchDeleteBtn = document.getElementById('batchDeleteBtn');
        if (batchDeleteBtn) {
            // 移除舊的事件監聽器（如果有的話）
            const newBtn = batchDeleteBtn.cloneNode(true);
            batchDeleteBtn.parentNode.replaceChild(newBtn, batchDeleteBtn);
            // 綁定新的事件監聽器
            newBtn.addEventListener('click', batchDeleteOrders);
        }
        
        // 綁定所有checkbox的change事件
        const checkboxes = document.querySelectorAll('.order-checkbox');
        checkboxes.forEach(cb => {
            cb.addEventListener('change', updateBatchDeleteButton);
        });
        
        // 綁定全選checkbox
        const selectAllCheckbox = document.getElementById('selectAllCheckbox');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', function() {
                toggleSelectAll(this);
            });
        }
    }, 100);
    
    // 儲存當前過濾後的訂單列表供後續使用
    window._currentFilteredMenus = filteredMenus;
    
    // 初始化批量刪除按鈕狀態
    updateBatchDeleteButton();
}

// ========== 批量刪除功能 ==========

/**
 * 全選/取消全選
 */
function toggleSelectAll(checkbox) {
    const checkboxes = document.querySelectorAll('.order-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = checkbox.checked;
    });
    updateBatchDeleteButton();
}

/**
 * 更新批量刪除按鈕顯示狀態
 */
function updateBatchDeleteButton() {
    const checkboxes = document.querySelectorAll('.order-checkbox:checked');
    const selectedCount = checkboxes.length;
    const batchDeleteBtn = document.getElementById('batchDeleteBtn');
    const selectedCountSpan = document.getElementById('selectedCount');
    
    if (batchDeleteBtn) {
        if (selectedCount > 0) {
            batchDeleteBtn.style.display = 'inline-block';
            if (selectedCountSpan) {
                selectedCountSpan.textContent = selectedCount;
            }
        } else {
            batchDeleteBtn.style.display = 'none';
        }
    }
    
    // 更新全選 checkbox 狀態
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    if (selectAllCheckbox) {
        const allCheckboxes = document.querySelectorAll('.order-checkbox');
        const allChecked = allCheckboxes.length > 0 && Array.from(allCheckboxes).every(cb => cb.checked);
        selectAllCheckbox.checked = allChecked;
        selectAllCheckbox.indeterminate = selectedCount > 0 && selectedCount < allCheckboxes.length;
    }
}

/**
 * 批量刪除選中的訂單
 */
async function batchDeleteOrders() {
    const checkboxes = document.querySelectorAll('.order-checkbox:checked');
    if (checkboxes.length === 0) {
        alert('請先選擇要刪除的訂單');
        return;
    }
    
    const selectedIds = Array.from(checkboxes).map(cb => cb.getAttribute('data-menu-id')).filter(id => id);
    
    if (selectedIds.length === 0) {
        alert('沒有有效的訂單 ID');
        return;
    }
    
    if (!confirm(`確定要刪除 ${selectedIds.length} 筆訂單嗎？\n\n此動作無法復原！`)) {
        return;
    }
    
    try {
        const client = supabaseClient || await initSupabaseClient();
        if (!client) {
            alert('無法連線到 Supabase');
            return;
        }
        
        // 批量刪除
        let successCount = 0;
        let failCount = 0;
        
        for (const id of selectedIds) {
            const { error } = await client
                .from('menu_orders')
                .delete()
                .eq('id', id);
            
            if (error) {
                console.error(`刪除訂單 ${id} 失敗：`, error);
                failCount++;
            } else {
                successCount++;
            }
        }
        
        if (successCount > 0) {
            showSyncStatus(`已成功刪除 ${successCount} 筆訂單${failCount > 0 ? `，${failCount} 筆失敗` : ''}`, failCount > 0 ? 'error' : 'success');
            
            // 重新載入訂單列表
            await loadOrdersFromSupabase();
            renderHistoryList();
            
            // 清空選中狀態
            const selectAllCheckbox = document.getElementById('selectAllCheckbox');
            if (selectAllCheckbox) {
                selectAllCheckbox.checked = false;
            }
            updateBatchDeleteButton();
        } else {
            alert('刪除失敗，請查看 Console 了解詳情');
        }
    } catch (error) {
        console.error('批量刪除訂單失敗：', error);
        alert('批量刪除失敗：' + error.message);
    }
}

// 將批量刪除相關函數暴露到全局
if (typeof window !== 'undefined') {
    window.toggleSelectAll = toggleSelectAll;
    window.updateBatchDeleteButton = updateBatchDeleteButton;
    window.batchDeleteOrders = batchDeleteOrders;
    window.openHistoryColumnSettings = openHistoryColumnSettings;
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
    
    // 嘗試從不同來源獲取總金額
    let total = null;
    let perPerson = null;
    
    // 優先使用 Supabase 的 order.total（如果訂單來自 Supabase）
    // 檢查是否有 fromSupabase 標記，且 meta.estimatedTotal 存在
    if (menu.fromSupabase && meta.estimatedTotal !== undefined && meta.estimatedTotal !== null) {
        const supabaseTotal = parseFloat(meta.estimatedTotal);
        if (!isNaN(supabaseTotal) && supabaseTotal >= 0) {
            total = supabaseTotal;
        }
    }
    
    // 如果沒有 Supabase 的 total，使用 meta 中的值
    if (total === null && meta.estimatedTotal !== undefined && meta.estimatedTotal !== null) {
        const metaTotal = parseFloat(meta.estimatedTotal);
        if (!isNaN(metaTotal) && metaTotal >= 0) {
            total = metaTotal;
        }
    }
    
    // 如果還是沒有，從 cart 計算
    if (total === null && legacy?.total) {
        total = legacy.total;
    }
    
    // 如果還是沒有，嘗試從 categories 計算
    if (total === null && Array.isArray(menu.categories)) {
        let subtotal = 0;
        menu.categories.forEach(cat => {
            (cat.items || []).forEach(item => {
                subtotal += (item.price || 0);
            });
        });
        if (subtotal > 0) {
            const serviceFee = Math.round(subtotal * 0.1);
            total = subtotal + serviceFee;
        }
    }
    
    // 人均計算
    if (menu.fromSupabase && meta.estimatedPerPerson !== undefined && meta.estimatedPerPerson !== null) {
        const supabasePerPerson = parseFloat(meta.estimatedPerPerson);
        if (!isNaN(supabasePerPerson) && supabasePerPerson >= 0) {
            perPerson = supabasePerPerson;
        }
    }
    
    if (perPerson === null && meta.estimatedPerPerson !== undefined && meta.estimatedPerPerson !== null) {
        const metaPerPerson = parseFloat(meta.estimatedPerPerson);
        if (!isNaN(metaPerPerson) && metaPerPerson >= 0) {
            perPerson = metaPerPerson;
        }
    }
    
    if (perPerson === null && legacy?.perPerson) {
        perPerson = legacy.perPerson;
    }
    
    // 如果還是沒有 perPerson，從 total 計算
    if (perPerson === null && total !== null && menu.peopleCount && menu.peopleCount > 0) {
        perPerson = Math.round(total / menu.peopleCount);
    }
    
    const itemCount = Number.isFinite(meta.itemCount) ? meta.itemCount : legacy?.itemCount ?? 0;
    const preview = meta.preview || legacy?.preview || '無品項預覽';
    return { total: total || 0, perPerson: perPerson || 0, itemCount, preview };
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

async function deleteHistoryMenu(index) {
    // 歷史訂單現在完全從 Supabase 載入，不再使用 localStorage
    // 此函數已棄用，請使用 deleteHistoryMenuByData
    const menus = window._currentFilteredMenus || getMergedOrders();
    const menu = menus[index];
    
    if (menu && confirm(`確定要刪除菜單「${menu.name || '未命名菜單'}」嗎？此操作無法復原。`)) {
        // 從 Supabase 刪除
        if (menu.id) {
            await deleteOrderFromSupabase(menu.id);
        }
        
        renderHistoryList();
        alert('菜單已刪除');
    }
}

// 根據 data 屬性載入歷史訂單（功能 B：支援編輯模式）
function loadHistoryMenuByData(row) {
    const idx = parseInt(row.dataset.idx);
    const menus = window._currentFilteredMenus || getMergedOrders();
    const menu = menus[idx];
    
    if (!menu) {
        alert('找不到該訂單');
        return;
    }
    
    // 設定當前編輯的訂單 ID
    currentEditingOrderId = menu.id || null;
    updateSaveButtonState();
    
    // 載入購物車
    if (menu.cart && menu.cart.length > 0) {
        cart = deepClone(menu.cart);
    } else {
        cart = [];
    }
    
    // 載入人數和桌數
    if (menu.peopleCount) {
        peopleCount = menu.peopleCount;
        if (elements.peopleCountInput) elements.peopleCountInput.value = peopleCount;
    }
    if (menu.tableCount) {
        tableCount = menu.tableCount;
        if (elements.tableCountInput) elements.tableCountInput.value = tableCount;
    }
    
    // 載入訂單資訊
    if (menu.orderInfo) {
        setOrderInfo(menu.orderInfo);
        // 如果 orderInfo 中有 diningDateTime，也要設置（優先使用 orderInfo 中的值）
        if (menu.orderInfo.diningDateTime) {
            setDiningDateTime(menu.orderInfo.diningDateTime);
        }
    } else {
        // 兼容舊格式
        if (menu.customerName && elements.companyName) elements.companyName.value = menu.customerName;
        if (menu.customerTaxId && elements.customerTaxId) elements.customerTaxId.value = menu.customerTaxId;
        // 更新填寫狀態顏色
        initFillStateStyling();
    }
    
    // 設定用餐日期時間（優先使用 dining_datetime，然後是 diningDateTime）
    // 【關鍵修復】優先使用 Supabase 的 dining_datetime（ISO 字串），避免時區轉換
    const rawDiningDateTime = menu.dining_datetime || menu.orderInfo?.dining_datetime || menu.diningDateTime || menu.orderInfo?.diningDateTime;
    if (rawDiningDateTime) {
        setDiningDateTime(rawDiningDateTime);
    }
    
    // 調試：確認載入的值
    console.log('🔍 載入訂單後的資料:', {
        menuId: menu.id,
        rawDiningDateTime: rawDiningDateTime,
        dining_datetime: menu.dining_datetime,
        diningDateTime: menu.diningDateTime,
        orderInfo: menu.orderInfo,
        currentDiningDate: elements.diningDate?.value,
        currentDiningHour: elements.diningHour?.value,
        currentDiningMinute: elements.diningMinute?.value,
        currentDiningHourCustom: document.getElementById('diningHourCustom')?.value
    });
    
    // 更新填寫狀態顏色（確保所有欄位顏色正確）
    initFillStateStyling();
    
    // 更新介面
    // 重新渲染左側菜單，讓選取狀態與購物車同步
    activeCategory = 'all';
    renderMenu();
    renderCart();
    updateCartSummary();
    persistCartState();
    
    // 關閉模態框
    closeModal('historyModal');
    
    showSyncStatus(`已載入訂單「${menu.name || '未命名'}」，可進行編輯`, 'success');
    console.log('✅ 已載入訂單進行編輯，ID:', currentEditingOrderId);
}

// 根據 data 屬性刪除歷史訂單（同時刪除本機和雲端）
async function deleteHistoryMenuByData(row) {
    const idx = parseInt(row.dataset.idx);
    const menuId = row.dataset.menuId;
    const menus = window._currentFilteredMenus || getMergedOrders();
    const menu = menus[idx];
    
    if (!menu) {
        alert('找不到該訂單');
        return;
    }
    
    if (!confirm(`確定要刪除訂單「${menu.name || '未命名'}」嗎？此操作無法復原。`)) {
        return;
    }
    
    let deletedFromCloud = false;
    let deletedFromLocal = false;
    
    const menuName = menu.name || '';
    const menuSavedAt = menu.savedAt || '';
    
    console.log('準備刪除訂單:', { menuName, menuSavedAt, menuId, fromSupabase: menu.fromSupabase, orderId: menu.id });
    
    // 1. 刪除 Supabase 訂單（優先使用 menu.id，其次使用 menuId）
    const supabaseId = menu.id || menuId;
    if (supabaseId) {
        deletedFromCloud = await deleteOrderFromSupabase(supabaseId);
        console.log('Supabase 刪除結果:', deletedFromCloud);
    }
    
    // 2. 從 supabaseOrders 快取中移除（不論刪除是否成功）
    if (supabaseId) {
        const prevLength = supabaseOrders.length;
        supabaseOrders = supabaseOrders.filter(o => o.id !== supabaseId);
        console.log(`從快取移除: ${prevLength} -> ${supabaseOrders.length}`);
    }
    
    // 3. 刪除本地訂單（多重匹配條件）
    // 不再使用 localStorage 儲存訂單
    // 所有訂單都從 Supabase 的 menu_orders 表載入和刪除
    deletedFromLocal = false; // 不再有本地訂單
    
    if (deletedFromCloud || deletedFromLocal) {
        showSyncStatus('訂單已刪除', 'success');
    } else {
        showSyncStatus('刪除失敗', 'error');
    }
    
    // 重新渲染（不重新載入 Supabase，避免刪除後又載回來）
    // 只有在確認雲端刪除成功後才重新載入
    if (!deletedFromCloud && menu.fromSupabase) {
        // 如果是來自 Supabase 但刪除失敗，重新載入確認狀態
        await loadOrdersFromSupabase();
    }
    renderHistoryList();
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
    const metrics = mergeMetricsFromSource(item);
    const weightValue = Number.isFinite(metrics.weight) ? metrics.weight : '';
    const weightDisabled = !isAdminMode;
    
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
                <div class="item-main">
                    <input class="item-weight-input" type="number" min="0" step="1" value="${weightValue}" placeholder="" ${weightDisabled ? 'disabled' : ''} onchange="updateItemWeight('${categoryId}', '${item.id}', this.value)" onclick="event.stopPropagation();" />
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
    // 確認儲存按鈕：根據是否為載入的菜單決定行為
    document.getElementById('confirmSaveMenu').addEventListener('click', () => {
        // 如果 saveMenuToStorage 是從「儲存菜單」按鈕觸發的，且目前有載入的訂單
        // 則儲存成新訂單（isNewOrder = true）
        const isNewOrder = currentEditingOrderId !== null;
        confirmSaveMenu(isNewOrder);
    });
    
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

// ====== 24H 顯示：禁止 new Date()，避免時區轉換 ======
function formatDiningDateTime24H(raw) {
    // raw example: "2026-01-08T12:00:00+00:00" or "2026-01-08T12:00:00"
    if (!raw || typeof raw !== 'string') return '--';

    const parts = raw.split('T');
    if (parts.length < 2) return '--';

    const datePart = parts[0];                 // "2026-01-08"
    const timePart = parts[1];                 // "12:00:00+00:00" / "12:00:00"
    const hh = timePart.slice(0, 2);           // "12"
    const mm = timePart.slice(3, 5);           // "00"

    // 24H 直接輸出，不做任何時區換算
    return `${datePart.replace(/-/g, '/')} ${hh}:${mm}`;
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

// ========== 功能 D：釘選功能 ==========
/**
 * 切換訂單釘選狀態
 * @param {string} orderId - 訂單 ID
 * @param {Event} event - 事件物件
 */
async function toggleOrderPin(orderId, event) {
    if (event) event.stopPropagation();
    
    try {
        const client = supabaseClient || await initSupabaseClient();
        if (!client) {
            alert('無法連線到 Supabase');
            return;
        }
        
        // 找到訂單目前的釘選狀態
        const order = supabaseOrders.find(o => o.id === orderId);
        const currentPinned = order?.isPinned || false;
        const newPinned = !currentPinned;
        
        console.log(`切換訂單釘選狀態: ${orderId}, ${currentPinned} -> ${newPinned}`);
        
        // 更新 Supabase
        const { error } = await client
            .from('menu_orders')
            .update({ is_pinned: newPinned })
            .eq('id', orderId);
        
        if (error) {
            console.error('更新釘選狀態失敗：', error);
            alert('更新失敗：' + error.message);
            return;
        }
        
        // 更新快取
        if (order) {
            order.isPinned = newPinned;
        }
        
        // 重新渲染列表（會自動重新排序）
        renderHistoryList();
        
        console.log(`✅ 訂單釘選狀態已更新: ${newPinned ? '已釘選' : '已取消釘選'}`);
    } catch (error) {
        console.error('切換釘選狀態失敗：', error);
        alert('操作失敗：' + error.message);
    }
}

// 切換訂單完成狀態
async function toggleOrderCompleted(orderId, completed, event) {
    if (event) event.stopPropagation();
    
    try {
        const client = supabaseClient || await initSupabaseClient();
        if (!client) {
            alert('無法連線到 Supabase');
            return;
        }
        
        console.log(`切換訂單完成狀態: ${orderId}, ${completed}`);
        
        // 更新 Supabase
        const { error } = await client
            .from('menu_orders')
            .update({ is_completed: completed })
            .eq('id', orderId);
        
        if (error) {
            console.error('更新完成狀態失敗：', error);
            alert('更新失敗：' + error.message);
            // 恢復 checkbox 狀態
            const checkbox = event?.target;
            if (checkbox) {
                checkbox.checked = !completed;
            }
            return;
        }
        
        // 更新快取
        const order = supabaseOrders.find(o => o.id === orderId);
        if (order) {
            order.is_completed = completed;
            order.isCompleted = completed;
        }
        
        // 重新渲染歷史列表（會自動重新排序）
        renderHistoryList();
        
        console.log('✅ 訂單完成狀態已更新');
    } catch (error) {
        console.error('切換完成狀態失敗：', error);
        alert('操作失敗：' + error.message);
        // 恢復 checkbox 狀態
        const checkbox = event?.target;
        if (checkbox) {
            checkbox.checked = !completed;
        }
    }
}

// ========== 功能 E：歷史訂單分析 ==========
/**
 * 顯示歷史訂單分析視圖
 */
async function showAnalysisModal() {
    const modal = document.getElementById('analysisModal');
    const content = document.getElementById('analysisContent');
    
    if (!modal || !content) {
        console.error('找不到分析模態框元素');
        return;
    }
    
    modal.style.display = 'block';
    content.innerHTML = '<div class="loading-analysis"><i class="fas fa-spinner fa-spin"></i> 載入分析資料中...</div>';
    
    try {
        const client = supabaseClient || await initSupabaseClient();
        if (!client) {
            content.innerHTML = '<div class="error-message">無法連線到 Supabase</div>';
            return;
        }
        
        // 載入所有訂單
        const { data: orders, error } = await client
            .from('menu_orders')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('載入訂單失敗：', error);
            content.innerHTML = '<div class="error-message">載入資料失敗：' + error.message + '</div>';
            return;
        }
        
        if (!orders || orders.length === 0) {
            content.innerHTML = '<div class="empty-analysis">目前沒有任何訂單資料</div>';
            return;
        }
        
        // 計算統計資料
        const stats = calculateOrderStatistics(orders);
        
        // 渲染分析結果
        renderAnalysisContent(content, stats);
        
    } catch (error) {
        console.error('分析失敗：', error);
        content.innerHTML = '<div class="error-message">分析失敗：' + error.message + '</div>';
    }
}

/**
 * 計算訂單統計資料
 * @param {Array} orders - 訂單陣列
 * @returns {Object} 統計資料
 */
function calculateOrderStatistics(orders) {
    // 取得自訂金額區間設定（從 localStorage 或使用預設值）
    const customRanges = getCustomAmountRanges();
    
    const stats = {
        totalOrders: orders.length,
        totalRevenue: 0,
        totalPeople: 0,
        averagePeople: 0,
        averagePerPerson: 0,
        perPersonStats: [],
        industryStats: {},
        venueContentStats: {},
        amountRanges: {},
        recentOrders: orders.slice(0, 10) // 最近 10 筆
    };
    
    // 初始化金額區間
    customRanges.forEach(range => {
        stats.amountRanges[range.label] = 0;
    });
    
    let totalPerPerson = 0;
    let validPerPersonCount = 0;
    let totalPeopleCount = 0;
    let validPeopleCount = 0;
    
    orders.forEach((order, orderIdx) => {
        // 統一取得每張訂單的總金額（使用 order.total 欄位）
        // 這是每張訂單的總金額，包含服務費
        // 如果 order.total 不存在或為 0，嘗試從 subtotal + service_fee 計算
        let orderTotal = parseFloat(order.total) || 0;
        let calculatedFrom = 'order.total';
        
        // 如果 total 為 0 或不存在，嘗試從 subtotal + service_fee 計算
        if (orderTotal === 0 && (order.subtotal || order.service_fee)) {
            const subtotal = parseFloat(order.subtotal) || 0;
            const serviceFee = parseFloat(order.service_fee) || 0;
            orderTotal = subtotal + serviceFee;
            calculatedFrom = 'subtotal+service_fee';
        }
        
        // 如果還是 0，嘗試從 cart_items 計算
        if (orderTotal === 0 && Array.isArray(order.cart_items) && order.cart_items.length > 0) {
            const subtotal = order.cart_items.reduce((sum, item) => {
                return sum + ((parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1));
            }, 0);
            const serviceFee = Math.round(subtotal * 0.1);
            orderTotal = subtotal + serviceFee;
            calculatedFrom = 'cart_items';
        }
        
        // Debug: 只記錄前 3 筆訂單的資料，確認欄位正確
        if (orderIdx < 3) {
            console.log(`📊 分析功能 - 訂單 #${orderIdx + 1}：`, {
                orderId: order.id,
                orderTotal: orderTotal,
                orderTotalRaw: order.total,
                subtotal: order.subtotal,
                service_fee: order.service_fee,
                calculatedFrom: calculatedFrom,
                cartItemsCount: Array.isArray(order.cart_items) ? order.cart_items.length : 0
            });
        }
        
        // 總營收
        if (orderTotal > 0) {
            stats.totalRevenue += orderTotal;
        }
        
        // 人數統計
        if (order.people_count && order.people_count > 0) {
            totalPeopleCount += parseInt(order.people_count);
            validPeopleCount++;
        }
        
        // 人均統計
        if (order.per_person && order.per_person > 0) {
            totalPerPerson += parseFloat(order.per_person);
            validPerPersonCount++;
            stats.perPersonStats.push(parseFloat(order.per_person));
        }
        
        // 產業別統計（處理空值和未分類）
        const industry = order.industry?.trim() || null;
        if (industry) {
            if (!stats.industryStats[industry]) {
                stats.industryStats[industry] = {
                    count: 0,
                    total: 0
                };
            }
            stats.industryStats[industry].count++;
            if (orderTotal > 0) {
                stats.industryStats[industry].total += orderTotal;
            }
        } else {
            // 統計未填寫的訂單
            if (!stats.industryStats['未分類']) {
                stats.industryStats['未分類'] = {
                    count: 0,
                    total: 0
                };
            }
            stats.industryStats['未分類'].count++;
            if (orderTotal > 0) {
                stats.industryStats['未分類'].total += orderTotal;
            }
        }
        
        // 包場內容統計（處理空值和未分類）
        const venueContent = order.venue_content?.trim() || null;
        if (venueContent) {
            if (!stats.venueContentStats[venueContent]) {
                stats.venueContentStats[venueContent] = {
                    count: 0,
                    total: 0
                };
            }
            stats.venueContentStats[venueContent].count++;
            if (orderTotal > 0) {
                stats.venueContentStats[venueContent].total += orderTotal;
            }
        } else {
            // 統計未填寫的訂單
            if (!stats.venueContentStats['未分類']) {
                stats.venueContentStats['未分類'] = {
                    count: 0,
                    total: 0
                };
            }
            stats.venueContentStats['未分類'].count++;
            if (orderTotal > 0) {
                stats.venueContentStats['未分類'].total += orderTotal;
            }
        }
        
        // 金額分布（使用自訂區間）- 基於「每張訂單的總金額」
        // 使用 orderTotal（每張訂單的總金額），不是人均或其他金額
        // 按順序檢查每個區間，找到第一個匹配的區間（避免重複計算）
        let rangeMatched = false;
        for (let i = 0; i < customRanges.length; i++) {
            const range = customRanges[i];
            const min = parseInt(range.min) || 0;
            const max = range.max !== null && range.max !== undefined ? parseInt(range.max) : null;
            
            // 判斷是否在此區間內
            if (orderTotal >= min) {
                if (max === null) {
                    // 無上限區間（最後一個區間）
                    stats.amountRanges[range.label]++;
                    rangeMatched = true;
                    break;
                } else if (orderTotal <= max) {
                    // 有上限的區間
                    stats.amountRanges[range.label]++;
                    rangeMatched = true;
                    break;
                }
            }
        }
        
        // 如果沒有匹配任何區間（理論上不應該發生，但為了安全）
        if (!rangeMatched && customRanges.length > 0) {
            console.warn(`訂單總金額 $${orderTotal} 沒有匹配任何區間，訂單ID: ${order.id || 'N/A'}`);
            // 歸類到最後一個區間（通常是無上限區間）
            const lastRange = customRanges[customRanges.length - 1];
            stats.amountRanges[lastRange.label]++;
        }
    });
    
    // 計算平均人數
    if (validPeopleCount > 0) {
        stats.totalPeople = totalPeopleCount;
        stats.averagePeople = Math.round((totalPeopleCount / validPeopleCount) * 10) / 10; // 保留一位小數
    } else {
        stats.totalPeople = 0;
        stats.averagePeople = 0;
    }
    
    // 計算平均人均
    if (validPerPersonCount > 0) {
        stats.averagePerPerson = totalPerPerson / validPerPersonCount;
    } else {
        stats.averagePerPerson = 0;
    }
    
    // 排序人均統計
    stats.perPersonStats.sort((a, b) => a - b);
    
    return stats;
}

/**
 * 取得自訂金額區間設定
 */
function getCustomAmountRanges() {
    try {
        const saved = localStorage.getItem('customAmountRanges');
        if (saved) {
            const parsed = JSON.parse(saved);
            // 驗證並清理讀取的資料
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed.map(range => {
                    const min = range.min !== undefined && range.min !== null ? parseInt(range.min) : 0;
                    const max = range.max !== undefined && range.max !== null && range.max !== '' ? parseInt(range.max) : null;
                    
                    // 自動生成標籤
                    let label = '';
                    if (max === null) {
                        label = `${min.toLocaleString()}+`;
                    } else {
                        label = `${min.toLocaleString()}-${max.toLocaleString()}`;
                    }
                    
                    return {
                        label: label,
                        min: min,
                        max: max
                    };
                }).filter(r => !isNaN(r.min) && (r.max === null || (!isNaN(r.max) && r.max > r.min)));
            }
        }
    } catch (e) {
        console.warn('無法讀取自訂金額區間設定，使用預設值', e);
        // 清除錯誤的資料
        try {
            localStorage.removeItem('customAmountRanges');
        } catch (e2) {
            console.warn('無法清除錯誤的設定', e2);
        }
    }
    
    // 預設區間（標籤會自動生成）
    return [
        { label: '0-5,000', min: 0, max: 5000 },
        { label: '5,001-10,000', min: 5001, max: 10000 },
        { label: '10,001-20,000', min: 10001, max: 20000 },
        { label: '20,001-30,000', min: 20001, max: 30000 },
        { label: '30,000+', min: 30001, max: null }
    ];
}

/**
 * 設定自訂金額區間
 */
function setCustomAmountRanges(ranges) {
    try {
        localStorage.setItem('customAmountRanges', JSON.stringify(ranges));
        return true;
    } catch (e) {
        console.error('無法儲存自訂金額區間設定', e);
        return false;
    }
}

/**
 * 渲染分析內容（加入圖表）
 * @param {HTMLElement} container - 容器元素
 * @param {Object} stats - 統計資料
 */
function renderAnalysisContent(container, stats) {
    const industryRows = Object.entries(stats.industryStats)
        .sort((a, b) => b[1].count - a[1].count) // 按訂單數排序
        .map(([industry, data]) => `
            <tr>
                <td>${industry || '未分類'}</td>
                <td>${data.count}</td>
                <td>$${Math.round(data.total).toLocaleString()}</td>
                <td>$${Math.round(data.total / data.count).toLocaleString()}</td>
            </tr>
        `).join('');
    
    // 準備圖表資料
    const industryLabels = Object.keys(stats.industryStats);
    const industryCounts = Object.values(stats.industryStats).map(d => d.count);
    const industryTotals = Object.values(stats.industryStats).map(d => Math.round(d.total));
    
    // 包場內容統計
    const venueContentRows = Object.entries(stats.venueContentStats)
        .sort((a, b) => b[1].count - a[1].count)
        .map(([content, data]) => `
            <tr>
                <td>${content || '未分類'}</td>
                <td>${data.count}</td>
                <td>$${Math.round(data.total).toLocaleString()}</td>
                <td>$${Math.round(data.total / data.count).toLocaleString()}</td>
            </tr>
        `).join('');
    
    // 準備金額分布圖表資料（使用自訂區間）
    const customRanges = getCustomAmountRanges();
    const amountLabels = customRanges.map(r => r.label);
    const amountCounts = customRanges.map(r => stats.amountRanges[r.label] || 0);
    
    container.innerHTML = `
        <div class="analysis-sections">
            <div class="analysis-section">
                <h3><i class="fas fa-chart-line"></i> 總覽</h3>
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-label">總訂單數</div>
                        <div class="stat-value">${stats.totalOrders}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">總營收</div>
                        <div class="stat-value">$${Math.round(stats.totalRevenue).toLocaleString()}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">總人數</div>
                        <div class="stat-value">${stats.totalPeople > 0 ? stats.totalPeople.toLocaleString() : '--'}</div>
                        <div class="stat-note" style="font-size: 0.75rem; color: #6c757d; margin-top: 0.25rem;">${stats.totalOrders} 筆訂單</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">平均人數</div>
                        <div class="stat-value">${stats.averagePeople > 0 ? stats.averagePeople.toFixed(1) : '--'}</div>
                        <div class="stat-note" style="font-size: 0.75rem; color: #6c757d; margin-top: 0.25rem;">每筆訂單平均</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">平均人均</div>
                        <div class="stat-value">$${Math.round(stats.averagePerPerson).toLocaleString()}</div>
                    </div>
                </div>
            </div>
            
            <div class="analysis-section">
                <h3><i class="fas fa-industry"></i> 產業別分布</h3>
                ${industryRows && industryRows.length > 0 ? `
                    <div class="chart-container">
                        <canvas id="industryChart"></canvas>
                    </div>
                    <table class="analysis-table">
                        <thead>
                            <tr>
                                <th>產業別</th>
                                <th>訂單數</th>
                                <th>總金額</th>
                                <th>平均金額</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${industryRows}
                        </tbody>
                    </table>
                ` : '<p style="color: #6c757d;">目前沒有產業別資料</p>'}
            </div>
            
            <div class="analysis-section">
                <h3><i class="fas fa-calendar-alt"></i> 包場內容分布</h3>
                ${venueContentRows && venueContentRows.length > 0 ? `
                    <table class="analysis-table">
                        <thead>
                            <tr>
                                <th>包場內容</th>
                                <th>訂單數</th>
                                <th>總金額</th>
                                <th>平均金額</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${venueContentRows}
                        </tbody>
                    </table>
                    <p style="margin-top: 0.5rem; font-size: 0.85rem; color: #6c757d;">
                        <i class="fas fa-info-circle"></i> 提示：未填寫包場內容的訂單會歸類為「未分類」
                    </p>
                ` : '<p style="color: #6c757d;"><i class="fas fa-info-circle"></i> 目前沒有包場內容資料，請在訂單中填寫「包場內容」欄位</p>'}
            </div>
            
            <div class="analysis-section">
                <h3><i class="fas fa-dollar-sign"></i> 消費金額分布（每張訂單的總金額）
                    <button onclick="showCustomAmountRangesDialog()" class="btn btn-small" style="margin-left: 1rem; padding: 0.3rem 0.6rem; font-size: 0.85rem;" title="自訂金額區間">
                        <i class="fas fa-cog"></i> 自訂區間
                    </button>
                </h3>
                <p style="margin-bottom: 0.5rem; font-size: 0.85rem; color: #6c757d;">
                    <i class="fas fa-info-circle"></i> 此分析基於每張訂單的總金額（包含服務費）
                </p>
                <div class="chart-container">
                    <canvas id="amountChart"></canvas>
                </div>
                <table class="analysis-table">
                    <thead>
                        <tr>
                            <th>金額區間</th>
                            <th>訂單數</th>
                            <th>占比</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${customRanges.map(range => {
                            const count = stats.amountRanges[range.label] || 0;
                            const percentage = stats.totalOrders > 0 ? ((count / stats.totalOrders) * 100).toFixed(1) : '0.0';
                            return `
                                <tr>
                                    <td>$${range.label}</td>
                                    <td>${count}</td>
                                    <td>${percentage}%</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
                <p style="margin-top: 0.5rem; font-size: 0.85rem; color: #6c757d;">
                    <i class="fas fa-info-circle"></i> 總計 ${stats.totalOrders} 筆訂單，總金額 $${Math.round(stats.totalRevenue).toLocaleString()}
                </p>
            </div>
            
            <div class="analysis-section">
                <h3><i class="fas fa-users"></i> 人均消費分析</h3>
                <div class="per-person-analysis">
                    ${stats.perPersonStats.length > 0 ? `
                        <table class="analysis-table" style="margin-top: 0.5rem;">
                            <thead>
                                <tr>
                                    <th>統計項目</th>
                                    <th>金額</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>平均人均</td>
                                    <td><strong>$${Math.round(stats.averagePerPerson).toLocaleString()}</strong></td>
                                </tr>
                                <tr>
                                    <td>最低人均</td>
                                    <td>$${Math.round(stats.perPersonStats[0]).toLocaleString()}</td>
                                </tr>
                                <tr>
                                    <td>最高人均</td>
                                    <td>$${Math.round(stats.perPersonStats[stats.perPersonStats.length - 1]).toLocaleString()}</td>
                                </tr>
                                <tr>
                                    <td>中位數人均</td>
                                    <td>$${Math.round(stats.perPersonStats[Math.floor(stats.perPersonStats.length / 2)]).toLocaleString()}</td>
                                </tr>
                            </tbody>
                        </table>
                        <p style="margin-top: 0.5rem; font-size: 0.85rem; color: #6c757d;">
                            <i class="fas fa-info-circle"></i> 基於 ${stats.perPersonStats.length} 筆有效人均資料
                        </p>
                    ` : '<p style="color: #6c757d;">無有效人均資料（訂單中未計算人均金額）</p>'}
                </div>
            </div>
        </div>
    `;
    
    // 渲染圖表（確保使用最新的自訂區間設定）
    setTimeout(() => {
        // 重新取得自訂區間（確保與表格一致）
        const currentCustomRanges = getCustomAmountRanges();
        const currentAmountLabels = currentCustomRanges.map(r => r.label);
        const currentAmountCounts = currentCustomRanges.map(r => stats.amountRanges[r.label] || 0);
        
        renderCharts(industryLabels, industryCounts, industryTotals, currentAmountLabels, currentAmountCounts);
    }, 100);
}

/**
 * 顯示自訂金額區間設定對話框
 */
function showCustomAmountRangesDialog() {
    const currentRanges = getCustomAmountRanges();
    let modal = document.getElementById('customAmountRangesModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'customAmountRangesModal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header">
                <h3><i class="fas fa-cog"></i> 自訂金額區間設定</h3>
                <button class="close-modal" onclick="document.getElementById('customAmountRangesModal').style.display='none'">&times;</button>
            </div>
            <div class="modal-body">
                <div id="amountRangesList"></div>
                <button onclick="addAmountRange()" class="btn btn-primary" style="margin-top: 1rem;">
                    <i class="fas fa-plus"></i> 新增區間
                </button>
                <div style="margin-top: 1rem; display: flex; gap: 0.5rem;">
                    <button onclick="saveCustomAmountRanges()" class="btn btn-primary" style="flex: 1;">
                        <i class="fas fa-save"></i> 儲存
                    </button>
                    <button onclick="resetCustomAmountRanges()" class="btn btn-secondary" style="flex: 1;">
                        <i class="fas fa-undo"></i> 重置為預設
                    </button>
                </div>
            </div>
        </div>
    `;
    
    modal.style.display = 'block';
    renderAmountRangesList(currentRanges);
}

function renderAmountRangesList(ranges) {
    const list = document.getElementById('amountRangesList');
    if (!list) return;
    
    // 確保 ranges 是有效的陣列
    if (!Array.isArray(ranges) || ranges.length === 0) {
        ranges = getCustomAmountRanges();
    }
    
    // 如果 window._currentAmountRanges 已存在，使用它（保留用戶的修改）
    if (!window._currentAmountRanges || window._currentAmountRanges.length !== ranges.length) {
        // 深拷貝 ranges 以避免引用問題
        window._currentAmountRanges = ranges.map(r => ({
            min: r.min !== undefined && r.min !== null ? parseInt(r.min) : 0,
            max: r.max !== undefined && r.max !== null ? (r.max === '' ? null : parseInt(r.max)) : null
        }));
    }
    
    list.innerHTML = window._currentAmountRanges.map((range, idx) => {
        // 確保 min 和 max 是正確的數值
        const min = range.min !== undefined && range.min !== null ? parseInt(range.min) : 0;
        const max = range.max !== undefined && range.max !== null ? parseInt(range.max) : '';
        
        // 自動生成標籤
        let label = '';
        if (max === '' || max === null || max === undefined) {
            label = `${min.toLocaleString()}+`;
        } else {
            label = `${min.toLocaleString()}-${parseInt(max).toLocaleString()}`;
        }
        
        return `
        <div style="display: flex; gap: 0.5rem; align-items: center; padding: 0.5rem; border-bottom: 1px solid #eee; margin-bottom: 0.5rem;">
            <div style="flex: 1; font-weight: 500; color: #495057;">${label}</div>
            <input type="number" value="${min}" placeholder="最小值" class="input-field" style="width: 120px;" oninput="updateAmountRangeMin(${idx}, this.value)" min="0">
            <span style="color: #6c757d;">~</span>
            <input type="number" value="${max}" placeholder="最大值（留空為無上限）" class="input-field" style="width: 150px;" oninput="updateAmountRangeMax(${idx}, this.value)" min="0">
            <button onclick="removeAmountRange(${idx})" class="btn btn-danger" style="padding: 0.25rem 0.5rem;">
                <i class="fas fa-trash"></i>
            </button>
        </div>
        `;
    }).join('');
}

function addAmountRange() {
    if (!window._currentAmountRanges) {
        window._currentAmountRanges = getCustomAmountRanges().map(r => ({
            min: r.min,
            max: r.max
        }));
    }
    
    // 找到最後一個區間的 max 值，新區間從那裡開始
    const lastRange = window._currentAmountRanges[window._currentAmountRanges.length - 1];
    const newMin = lastRange && lastRange.max ? lastRange.max + 1 : 0;
    
    window._currentAmountRanges.push({ min: newMin, max: null });
    renderAmountRangesList(window._currentAmountRanges);
}

function removeAmountRange(idx) {
    if (!window._currentAmountRanges || !confirm('確定要刪除此區間嗎？')) return;
    window._currentAmountRanges.splice(idx, 1);
    renderAmountRangesList(window._currentAmountRanges);
}

function updateAmountRangeMin(idx, min) {
    if (!window._currentAmountRanges || !window._currentAmountRanges[idx]) return;
    
    const minValue = parseInt(min);
    if (!isNaN(minValue) && minValue >= 0) {
        window._currentAmountRanges[idx].min = minValue;
        // 即時更新顯示的標籤
        renderAmountRangesList(window._currentAmountRanges);
    }
}

function updateAmountRangeMax(idx, max) {
    if (!window._currentAmountRanges || !window._currentAmountRanges[idx]) return;
    
    if (max === '' || max === null || max === undefined) {
        window._currentAmountRanges[idx].max = null;
    } else {
        const maxValue = parseInt(max);
        if (!isNaN(maxValue) && maxValue > 0) {
            window._currentAmountRanges[idx].max = maxValue;
        } else {
            window._currentAmountRanges[idx].max = null;
        }
    }
    // 即時更新顯示的標籤
    renderAmountRangesList(window._currentAmountRanges);
}

function saveCustomAmountRanges() {
    if (!window._currentAmountRanges || !Array.isArray(window._currentAmountRanges)) {
        alert('沒有可儲存的區間設定');
        return;
    }
    
    // 驗證並清理資料
    const cleanedRanges = window._currentAmountRanges.map((range, idx) => {
        const min = range.min !== undefined && range.min !== null ? parseInt(range.min) : 0;
        let max = null;
        if (range.max !== undefined && range.max !== null && range.max !== '') {
            const maxValue = parseInt(range.max);
            if (!isNaN(maxValue) && maxValue > 0) {
                max = maxValue;
            }
        }
        
        // 驗證邏輯：min 應該小於 max（如果 max 不是 null）
        if (max !== null && min >= max) {
            alert(`區間 ${idx + 1} 的最小值必須小於最大值！`);
            return null;
        }
        
        // 自動生成標籤
        let label = '';
        if (max === null) {
            label = `${min.toLocaleString()}+`;
        } else {
            label = `${min.toLocaleString()}-${max.toLocaleString()}`;
        }
        
        return {
            label: label,
            min: min,
            max: max
        };
    }).filter(r => r !== null);
    
    if (cleanedRanges.length === 0) {
        alert('至少需要一個有效的區間設定');
        return;
    }
    
    if (setCustomAmountRanges(cleanedRanges)) {
        alert('金額區間設定已儲存！');
        document.getElementById('customAmountRangesModal').style.display = 'none';
        // 重新載入分析
        showAnalysisModal();
    } else {
        alert('儲存失敗，請稍後再試');
    }
}

function resetCustomAmountRanges() {
    if (!confirm('確定要重置為預設區間嗎？\n\n這將清除目前的自訂設定並恢復為預設值。')) return;
    
    const defaultRanges = [
        { label: '0-5,000', min: 0, max: 5000 },
        { label: '5,001-10,000', min: 5001, max: 10000 },
        { label: '10,001-20,000', min: 10001, max: 20000 },
        { label: '20,001-30,000', min: 20001, max: 30000 },
        { label: '30,000+', min: 30001, max: null }
    ];
    
    setCustomAmountRanges(defaultRanges);
    renderAmountRangesList(defaultRanges);
    alert('已重置為預設區間設定！');
}

/**
 * 渲染圖表
 */
function renderCharts(industryLabels, industryCounts, industryTotals, amountLabels, amountCounts) {
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js 未載入，無法顯示圖表');
        return;
    }
    
    // 產業別圓餅圖（按訂單數）
    const industryCtx = document.getElementById('industryChart');
    if (industryCtx) {
        // 清除舊的圖表實例（如果存在）
        if (window._industryChartInstance) {
            window._industryChartInstance.destroy();
        }
        
        window._industryChartInstance = new Chart(industryCtx, {
            type: 'pie',
            data: {
                labels: industryLabels,
                datasets: [{
                    data: industryCounts,
                    backgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
                        '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'right'
                    },
                    title: {
                        display: true,
                        text: '產業別訂單數分布'
                    }
                }
            }
        });
    }
    
    // 消費金額分布直條圖
    const amountCtx = document.getElementById('amountChart');
    if (amountCtx) {
        // 清除舊的圖表實例（如果存在）
        if (window._amountChartInstance) {
            window._amountChartInstance.destroy();
        }
        
        window._amountChartInstance = new Chart(amountCtx, {
            type: 'bar',
            data: {
                labels: amountLabels,
                datasets: [{
                    label: '訂單數',
                    data: amountCounts,
                    backgroundColor: '#36A2EB'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: '消費金額分布'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }
}

// ========== 功能 F：建立測試訂單 ==========
/**
 * 建立 20 筆虛擬測試訂單
 */
async function createTestOrders() {
    try {
        console.log('開始建立測試訂單...');
        
        const client = supabaseClient || await initSupabaseClient();
        if (!client) {
            console.error('Supabase 客戶端未初始化');
            alert('無法連線到 Supabase，請檢查連線狀態');
            return;
        }
        
        console.log('檢查是否已有測試訂單...');
        // 檢查是否已有測試訂單
        const { data: existing, error: checkError } = await client
            .from('menu_orders')
            .select('id')
            .like('company_name', '【測試】%')
            .limit(1);
        
        if (checkError) {
            console.error('檢查測試訂單失敗：', checkError);
            alert('檢查失敗：' + checkError.message);
            return;
        }
        
        if (existing && existing.length > 0) {
            if (!confirm('已存在測試訂單，是否要重新建立？這會刪除現有的測試訂單。')) {
                console.log('用戶取消建立測試訂單');
                return;
            }
            
            console.log('刪除現有測試訂單...');
            // 刪除現有測試訂單
            const { error: deleteError } = await client
                .from('menu_orders')
                .delete()
                .like('company_name', '【測試】%');
            
            if (deleteError) {
                console.error('刪除測試訂單失敗：', deleteError);
                alert('刪除舊測試訂單失敗：' + deleteError.message);
                return;
            }
            console.log('已刪除現有測試訂單');
        }
        
        // 建立 20 筆測試訂單
        console.log('生成測試訂單資料...');
        const testOrders = generateTestOrders();
        console.log('生成的測試訂單數量:', testOrders.length);
        console.log('第一筆測試訂單範例:', testOrders[0]);
        
        // 依序插入 Supabase（使用 async/await 控制）
        console.log('開始依序插入測試訂單到 Supabase...');
        let successCount = 0;
        let failCount = 0;
        const errors = [];
        const insertedIds = [];
        
        for (let i = 0; i < testOrders.length; i++) {
            const order = testOrders[i];
            try {
                console.log(`正在插入第 ${i + 1}/${testOrders.length} 筆訂單...`);
                const { data, error } = await client
                    .from('menu_orders')
                    .insert(order)
                    .select();
                
                if (error) {
                    console.error(`❌ 插入第 ${i + 1} 筆訂單失敗：`, error);
                    errors.push(`第 ${i + 1} 筆：${error.message}`);
                    failCount++;
                } else {
                    const insertedId = data?.[0]?.id;
                    console.log(`✅ 成功插入第 ${i + 1} 筆訂單，ID: ${insertedId}`);
                    if (insertedId) insertedIds.push(insertedId);
                    successCount++;
                }
            } catch (err) {
                console.error(`❌ 插入第 ${i + 1} 筆訂單時發生異常：`, err);
                errors.push(`第 ${i + 1} 筆：${err.message}`);
                failCount++;
            }
        }
        
        // 顯示結果
        if (successCount > 0) {
            const message = `✅ 成功建立 ${successCount} 筆測試訂單${failCount > 0 ? `，${failCount} 筆失敗` : ''}`;
            console.log(message);
            console.log('建立的訂單 ID:', insertedIds);
            
            if (failCount > 0) {
                console.warn('失敗的訂單詳情：', errors);
                alert(`${message}\n\n失敗詳情請查看 Console。`);
            } else {
                alert(`${message}\n\n請重新開啟「載入菜單」查看結果。`);
            }
            
            // 更新快取
            await loadOrdersFromSupabase();
            
            // 如果歷史訂單視窗已開啟，重新載入
            if (document.getElementById('historyModal')?.style.display === 'block') {
                console.log('重新載入歷史訂單列表...');
                renderHistoryList();
            }
        } else {
            console.error('❌ 所有訂單建立失敗');
            console.error('失敗詳情：', errors);
            alert('❌ 所有訂單建立失敗，請查看 Console 了解詳情');
        }
    } catch (error) {
        console.error('建立測試訂單失敗（例外）：', error);
        console.error('錯誤堆疊:', error.stack);
        alert('建立失敗：' + (error.message || '未知錯誤') + '\n\n請查看 Console 查看詳細錯誤');
    }
}

/**
 * 生成常態分布的隨機數（Box-Muller 轉換）
 * @param {number} mean - 平均值 (μ)
 * @param {number} stdDev - 標準差 (σ)
 * @returns {number} 常態分布的隨機數
 */
function normalRandom(mean, stdDev) {
    let u = 0, v = 0;
    while(u === 0) u = Math.random(); // 轉換 [0,1) 到 (0,1)
    while(v === 0) v = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return z * stdDev + mean;
}

/**
 * 將數值限制在指定範圍內
 * @param {number} value - 原始值
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @returns {number} 限制後的值（四捨五入）
 */
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Math.round(value)));
}

/**
 * 生成測試訂單資料
 * @returns {Array} 測試訂單陣列
 */
function generateTestOrders() {
    // 產業別選項
    const industries = ['科技業', '金融業', '製造業', '服務業', '餐飲業', '零售業', '醫療業', '教育業', '建築業', '其他'];
    
    // 方案類型
    const planTypes = ['大訂', '包場'];
    
    // 包場範圍
    const venueScopes = ['全包', '叢林區', '蘆葦區', 'VIP區'];
    
    // 用餐方式
    const diningStyles = ['自助', '桌菜'];
    
    // 付款方式
    const paymentMethods = ['匯款', '刷卡', '當天結帳'];
    
    // LINE 群組名稱
    const lineNames = ['包場群組A', '春酒群組B', '尾牙群組C', '聚餐群組D', '會議群組E'];
    
    // 包場內容選項（與 venue_content_options 表一致）
    const venueContents = ['產品發表', '婚禮派對', '春酒尾牙', '公司聚餐'];
    
    // 聯絡人姓名
    const names = ['王小明', '李美麗', '張三', '陳四', '林五', '黃六', '吳七', '周八', '鄭九', '劉十', '陳雅文', '林志強', '黃文傑', '吳淑芬', '周志偉'];
    
    // 公司名稱
    const companies = ['科技公司', '行銷公司', '設計公司', '貿易公司', '建設公司', '餐飲集團', '零售連鎖', '醫療機構', '教育機構', '金融機構', '製造企業', '物流公司', '顧問公司', '廣告公司', '投資公司'];
    
    const orders = [];
    const now = new Date();
    
    // 人數分布參數：20-150人，常態分布 μ=70, σ=20
    const peopleMean = 70;      // 平均值
    const peopleStdDev = 20;    // 標準差
    const peopleMin = 20;       // 最小值
    const peopleMax = 150;      // 最大值
    
    // 金額分布參數：30,000-300,000，常態分布 μ=180,000, σ=40,000
    const amountMean = 180000;   // 平均值
    const amountStdDev = 40000;  // 標準差
    const amountMin = 30000;     // 最小值
    const amountMax = 300000;    // 最大值
    
    for (let i = 0; i < 20; i++) {
        // 生成人數：使用常態分布，然後限制在 20-150 範圍內
        const peopleCount = clamp(normalRandom(peopleMean, peopleStdDev), peopleMin, peopleMax);
        const tableCount = Math.ceil(peopleCount / 6);
        
        // 生成總金額：使用常態分布，然後限制在 30,000-300,000 範圍內
        let total = clamp(normalRandom(amountMean, amountStdDev), amountMin, amountMax);
        
        // 加入輕微隨機波動（±2%），讓數據更自然
        const randomVariation = 1 + (Math.random() * 0.04 - 0.02); // -2% 到 +2%
        total = Math.round(total * randomVariation);
        total = clamp(total, amountMin, amountMax); // 確保仍在範圍內
        
        // 計算小計和服務費
        const subtotal = Math.round(total * 0.9);  // 90%
        const serviceFee = total - subtotal;        // 10%
        const perPerson = Math.round(total / peopleCount);
        
        // 生成隨機日期（過去 30 天內）
        const diningDate = new Date(now);
        diningDate.setDate(diningDate.getDate() - Math.floor(Math.random() * 30));
        diningDate.setHours(Math.floor(Math.random() * 12) + 12, Math.floor(Math.random() * 6) * 10, 0, 0); // 12:00-23:50
        
        // 隨機選擇各項資料
        const companyIndex = Math.floor(Math.random() * companies.length);
        const nameIndex = Math.floor(Math.random() * names.length);
        const industryIndex = Math.floor(Math.random() * industries.length);
        const planTypeIndex = Math.floor(Math.random() * planTypes.length);
        const venueScopeIndex = Math.floor(Math.random() * venueScopes.length);
        const diningStyleIndex = Math.floor(Math.random() * diningStyles.length);
        const paymentMethodIndex = Math.floor(Math.random() * paymentMethods.length);
        const lineNameIndex = Math.floor(Math.random() * lineNames.length);
        const venueContentIndex = Math.floor(Math.random() * venueContents.length);
        
        // 隨機決定是否付訂金（30% 機率）
        const hasDeposit = Math.random() < 0.3;
        const depositPaid = hasDeposit ? Math.round(total * (0.2 + Math.random() * 0.2)) : 0; // 20%-40% 的訂金
        
        // 生成購物車項目（模擬餐點）
        const cartItems = [];
        const itemCount = 3 + Math.floor(Math.random() * 4); // 3-6 個項目
        const remainingSubtotal = subtotal;
        
        for (let j = 0; j < itemCount; j++) {
            const isLast = j === itemCount - 1;
            let itemPrice;
            if (isLast) {
                // 最後一個項目使用剩餘金額
                itemPrice = remainingSubtotal;
            } else {
                // 其他項目隨機分配
                itemPrice = Math.floor(remainingSubtotal / (itemCount - j) * (0.3 + Math.random() * 0.4));
            }
            
            const quantity = 1 + Math.floor(Math.random() * 3); // 1-3 份
            cartItems.push({
                name: `測試餐點${String.fromCharCode(65 + j)}`, // A, B, C, ...
                price: Math.round(itemPrice / quantity),
                quantity: quantity
            });
        }
        
        // 建立訂單物件
        const order = {
            company_name: `【測試】${companies[companyIndex]}`,
            tax_id: String(10000000 + i + Math.floor(Math.random() * 1000)).padStart(8, '0'),
            contact_name: names[nameIndex],
            contact_phone: `09${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
            plan_type: planTypes[planTypeIndex],
            line_name: lineNames[lineNameIndex],
            industry: industries[industryIndex],
            venue_content: venueContents[venueContentIndex],
            venue_scope: venueScopes[venueScopeIndex],
            dining_style: diningStyles[diningStyleIndex],
            payment_method: paymentMethods[paymentMethodIndex],
            deposit_paid: depositPaid,
            dining_datetime: diningDate.toISOString(),
            table_count: tableCount,
            people_count: peopleCount,
            subtotal: subtotal,
            service_fee: serviceFee,
            total: total,
            per_person: perPerson,
            cart_items: cartItems,
            created_by: '測試系統',
            is_pinned: i < 5 // 前 5 筆設為釘選
        };
        
        orders.push(order);
    }
    
    return orders;
}

/**
 * 自動調整表格欄位寬度（像試算表）
 * @param {string} tableId - 表格 ID
 */
function autoResizeTableColumns(tableId) {
    const table = document.getElementById(tableId);
    if (!table) return;
    
    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');
    if (!thead || !tbody) return;
    
    const headerCells = thead.querySelectorAll('th');
    const rows = tbody.querySelectorAll('tr');
    
    if (headerCells.length === 0 || rows.length === 0) return;
    
    // 為每個欄位計算最大寬度
    headerCells.forEach((header, colIndex) => {
        let maxWidth = 0;
        
        // 計算標題寬度
        const headerText = header.textContent.trim();
        const headerWidth = measureTextWidth(headerText, header);
        maxWidth = Math.max(maxWidth, headerWidth);
        
        // 計算所有資料行的寬度
        rows.forEach(row => {
            const cell = row.cells[colIndex];
            if (cell) {
                const cellText = cell.textContent.trim();
                const cellWidth = measureTextWidth(cellText, cell);
                maxWidth = Math.max(maxWidth, cellWidth);
            }
        });
        
        // 設定最小和最大寬度
        const minWidth = 60; // 最小寬度
        const maxColWidth = 300; // 最大寬度（避免過寬）
        const finalWidth = Math.min(Math.max(maxWidth + 20, minWidth), maxColWidth);
        
        header.style.width = finalWidth + 'px';
        header.style.minWidth = finalWidth + 'px';
        header.style.maxWidth = finalWidth + 'px';
        
        // 同步設定所有資料行
        rows.forEach(row => {
            const cell = row.cells[colIndex];
            if (cell) {
                cell.style.width = finalWidth + 'px';
                cell.style.minWidth = finalWidth + 'px';
                cell.style.maxWidth = finalWidth + 'px';
            }
        });
    });
}

/**
 * 測量文字寬度
 * @param {string} text - 文字內容
 * @param {HTMLElement} element - 參考元素（用於取得字體樣式）
 * @returns {number} 寬度（像素）
 */
function measureTextWidth(text, element) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const style = window.getComputedStyle(element);
    context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    return context.measureText(text).width;
}

// 在初始化時綁定事件（時間自訂與刪除按鈕等）
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        const diningHour = document.getElementById('diningHour');
        const diningHourCustom = document.getElementById('diningHourCustom');
        if (diningHour && diningHourCustom) {
            diningHour.addEventListener('change', function() {
                if (diningHour.value === '__CUSTOM__') {
                    diningHourCustom.style.display = 'block';
                    diningHourCustom.focus();
                } else {
                    diningHourCustom.style.display = 'none';
                    diningHourCustom.value = '';
                }
            });
        }
    }, 500);
    
    // 綁定刪除按鈕
    const deleteButton = document.getElementById('deleteOrder');
    if (deleteButton) {
        deleteButton.addEventListener('click', deleteCurrentOrder);
    }
    
    // 綁定分析按鈕
    const analysisButton = document.getElementById('showAnalysis');
    if (analysisButton) {
        analysisButton.addEventListener('click', showAnalysisModal);
    }
    
    // 綁定建立測試訂單按鈕
    const createTestOrdersBtn = document.getElementById('createTestOrdersBtn');
    if (createTestOrdersBtn) {
        createTestOrdersBtn.addEventListener('click', async () => {
            if (!confirm('確定要建立 20 筆測試訂單嗎？\n\n這將在資料庫中建立測試資料，可用於測試歷史訂單和分析功能。')) {
                return;
            }
            await createTestOrders();
        });
    }
    
    // 綁定包場內容管理按鈕
    const manageVenueContentBtn = document.getElementById('manageVenueContent');
    if (manageVenueContentBtn) {
        manageVenueContentBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showVenueContentManager();
        });
    }
    
    // 開發模式：在 Console 中提供建立測試訂單的函式
    if (typeof window !== 'undefined') {
        window.createTestOrders = createTestOrders;
        console.log('💡 開發提示：');
        console.log('   1. 可點擊「建立測試訂單（20筆）」按鈕');
        console.log('   2. 或在 Console 中執行 createTestOrders()');
    }
});
