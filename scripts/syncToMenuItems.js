// Script to sync menu_state (frontend) back to menu_items table
// 以前端 menu_state 為主，更新 Supabase menu_items 表
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabaseUrl = 'https://rpbnexbvxgbjzslrunya.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwYm5leGJ2eGdianpzbHJ1bnlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2NzM3NTUsImV4cCI6MjA3ODI0OTc1NX0.tYWUb6ZmEPGCUYeHnQwE0PHlFBEzu-Mkcqm3kF_tKOg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const MENU_STATE_KEY = 'MENU_STATE';

async function syncToMenuItems() {
  console.log('讀取前端 menu_state 資料...');
  
  // 1. 讀取 menu_state
  const { data: stateData, error: stateError } = await supabase
    .from('menu_state')
    .select('payload')
    .eq('name', MENU_STATE_KEY)
    .maybeSingle();

  if (stateError || !stateData?.payload?.menu?.categories) {
    console.error('無法讀取 menu_state:', stateError);
    return;
  }

  const categories = stateData.payload.menu.categories;
  console.log(`找到 ${categories.length} 個類別`);

  // 2. 讀取現有的 menu_items
  const { data: existingItems, error: fetchError } = await supabase
    .from('menu_items')
    .select('id, name');

  if (fetchError) {
    console.error('讀取 menu_items 失敗:', fetchError);
    return;
  }

  const existingIds = new Set(existingItems?.map(item => item.id) || []);
  console.log(`現有 menu_items: ${existingIds.size} 筆`);

  // 3. 準備要同步的資料
  let categoryOrder = 0;
  const itemsToUpsert = [];
  const idsInState = new Set();

  for (const category of categories) {
    categoryOrder++;
    let itemOrder = 0;

    for (const item of category.items || []) {
      itemOrder++;
      idsInState.add(item.id);

      // 檢查 ID 是否為有效的 UUID 格式
      const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.id);
      
      itemsToUpsert.push({
        id: isValidUUID ? item.id : crypto.randomUUID(),
        name: item.name,
        name_en: item.nameEn || item.enName || '',
        price: item.price,
        category: category.name,
        category_order: categoryOrder,
        item_order: itemOrder,
        inserted_at: new Date().toISOString()
      });
    }
  }

  console.log(`準備同步 ${itemsToUpsert.length} 個品項...`);

  // 4. 先刪除不在 menu_state 中的項目
  const idsToDelete = [...existingIds].filter(id => !idsInState.has(id));
  if (idsToDelete.length > 0) {
    console.log(`刪除 ${idsToDelete.length} 個不存在的項目...`);
    for (const id of idsToDelete) {
      await supabase.from('menu_items').delete().eq('id', id);
    }
  }

  // 5. Upsert 所有項目
  // 分批處理，每批 50 筆
  const batchSize = 50;
  for (let i = 0; i < itemsToUpsert.length; i += batchSize) {
    const batch = itemsToUpsert.slice(i, i + batchSize);
    const { error: upsertError } = await supabase
      .from('menu_items')
      .upsert(batch, { onConflict: 'id' });

    if (upsertError) {
      console.error(`批次 ${i / batchSize + 1} 同步失敗:`, upsertError);
    } else {
      console.log(`批次 ${i / batchSize + 1}: 同步 ${batch.length} 筆`);
    }
  }

  console.log('\n✅ 同步完成！');
  console.log(`總共: ${categories.length} 個類別, ${itemsToUpsert.length} 個品項`);

  // 顯示類別順序
  console.log('\n類別順序:');
  categories.forEach((cat, index) => {
    console.log(`  ${index + 1}. ${cat.name} (${cat.items?.length || 0} items)`);
  });
}

syncToMenuItems();
