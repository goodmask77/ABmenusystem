const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const MENU_STATE_KEY = 'MENU_STATE';
const TARGET_CATEGORY_ID = 'all-day-brunch';
const TARGET_PRICE = 350;

async function loadSupabaseConfig() {
    const envPath = path.resolve(__dirname, '../env.json');
    if (!fs.existsSync(envPath)) {
        throw new Error('env.json 不存在，無法讀取 Supabase 設定');
    }
    const raw = fs.readFileSync(envPath, 'utf-8');
    const config = JSON.parse(raw);
    const { supabaseUrl, supabaseAnonKey } = config;
    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase 設定不完整，請提供 supabaseUrl 與 supabaseAnonKey');
    }
    return { supabaseUrl, supabaseAnonKey };
}

async function fetchMenuState(client) {
    const { data, error } = await client
        .from('menu_state')
        .select('payload')
        .eq('name', MENU_STATE_KEY)
        .maybeSingle();

    if (error) {
        throw new Error(`讀取 menu_state 失敗：${error.message}`);
    }
    if (!data) {
        throw new Error('找不到既有的 MENU_STATE 紀錄');
    }
    return data.payload;
}

function updateBrunchPrices(payload) {
    if (!payload?.menu?.categories) {
        throw new Error('menu payload 結構不正確，缺少 categories');
    }

    const category = payload.menu.categories.find(cat => cat.id === TARGET_CATEGORY_ID);
    if (!category) {
        throw new Error('找不到 All Day Brunch 類別 (all-day-brunch)');
    }

    const changedItems = [];
    category.items = category.items.map(item => {
        if (item.price !== TARGET_PRICE) {
            changedItems.push({ id: item.id, previousPrice: item.price });
            return { ...item, price: TARGET_PRICE };
        }
        return item;
    });

    if (!changedItems.length) {
        console.log('All Day Brunch 價格已經全部是 350，仍會更新時間戳記以確保 Supabase 與本機同步。');
    } else {
        console.log('已更新下列品項價格為 350：');
        changedItems.forEach(item => {
            console.log(` - ${item.id}: ${item.previousPrice} -> ${TARGET_PRICE}`);
        });
    }

    payload.menu = { ...payload.menu, categories: payload.menu.categories };
    payload.updatedAt = new Date().toISOString();

    return payload;
}

async function persistMenuState(client, payload) {
    const { error } = await client
        .from('menu_state')
        .upsert({
            name: MENU_STATE_KEY,
            payload,
            updated_at: new Date().toISOString()
        }, { onConflict: 'name' });

    if (error) {
        throw new Error(`更新 Supabase 失敗：${error.message}`);
    }
}

(async function main() {
    try {
        const { supabaseUrl, supabaseAnonKey } = await loadSupabaseConfig();
        const client = createClient(supabaseUrl, supabaseAnonKey);

        console.log('讀取現有 Supabase menu_state…');
        const payload = await fetchMenuState(client);

        console.log('更新 All Day Brunch 價格為 350…');
        const updatedPayload = updateBrunchPrices(payload);

        console.log('寫回 Supabase…');
        await persistMenuState(client, updatedPayload);

        console.log('All Day Brunch 價格已同步到 Supabase。');
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    }
})();
