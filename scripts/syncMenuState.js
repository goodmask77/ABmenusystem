// Script to update menu_state with new menu items from menu_items table
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rpbnexbvxgbjzslrunya.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwYm5leGJ2eGdianpzbHJ1bnlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2NzM3NTUsImV4cCI6MjA3ODI0OTc1NX0.tYWUb6ZmEPGCUYeHnQwE0PHlFBEzu-Mkcqm3kF_tKOg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const MENU_STATE_KEY = 'MENU_STATE';

// Category ID mapping
const categoryIdMap = {
  'New York-Style Pizza': 'ny-style-pizza',
  'Salads': 'salads-soup',
  'Soup': 'salads-soup',
  'Appetizers': 'appetizers',
  'All Day Brunch': 'all-day-brunch',
  'La Pasta': 'la-pasta',
  'Risotto': 'risotto-main-dishes',
  'Main Dishes': 'risotto-main-dishes',
  'Fried & Loved': 'fried-loved',
  'Soft Drink': 'soft-drink',
  'COFFEE': 'coffee',
  'Smoothies': 'smoothies',
  'Hot Tea': 'hot-tea',
  'Beer': 'beer',
  'Draft Cocktail': 'draft-cocktail',
  'HAPPY (Wine)': 'happy-wine',
  'Sweetie': 'sweetie'
};

const categoryDisplayNames = {
  'ny-style-pizza': 'NY-Style Pizza',
  'salads-soup': 'Salads & Soup',
  'appetizers': 'Appetizers',
  'all-day-brunch': 'All Day Brunch',
  'la-pasta': 'La Pasta',
  'risotto-main-dishes': 'Risotto & Main Dishes',
  'fried-loved': 'Fried & Loved',
  'soft-drink': 'Soft Drink',
  'coffee': 'COFFEE',
  'smoothies': 'Smoothies',
  'hot-tea': 'Hot Tea',
  'beer': 'Beer',
  'draft-cocktail': 'Draft Cocktail',
  'happy-wine': 'HAPPY (Wine)',
  'sweetie': 'Sweetie'
};

async function updateMenuState() {
  console.log('Fetching menu items from menu_items table...');
  
  // Fetch all menu items
  const { data: menuItems, error: fetchError } = await supabase
    .from('menu_items')
    .select('*')
    .order('category', { ascending: true })
    .order('price', { ascending: true });

  if (fetchError) {
    console.error('Error fetching menu items:', fetchError);
    return;
  }

  console.log(`Found ${menuItems.length} menu items`);

  // Group by category
  const categoriesMap = new Map();
  
  menuItems.forEach(item => {
    const catId = categoryIdMap[item.category] || item.category.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    if (!categoriesMap.has(catId)) {
      categoriesMap.set(catId, {
        id: catId,
        name: categoryDisplayNames[catId] || item.category,
        items: []
      });
    }
    
    categoriesMap.get(catId).items.push({
      id: item.id,
      name: item.name,
      enName: item.name_en || '',
      price: parseFloat(item.price),
      isNew: false,
      isHot: false
    });
  });

  // Convert to array and sort
  const categories = Array.from(categoriesMap.values());
  
  // Fetch existing menu_state to preserve other settings
  const { data: existingState, error: stateError } = await supabase
    .from('menu_state')
    .select('payload')
    .eq('name', MENU_STATE_KEY)
    .maybeSingle();

  let payload;
  if (existingState && existingState.payload) {
    // Update existing payload with new categories
    payload = existingState.payload;
    payload.menu = payload.menu || {};
    payload.menu.categories = categories;
    payload.updatedAt = new Date().toISOString();
    console.log('Updating existing menu_state with new categories...');
  } else {
    // Create new payload
    payload = {
      menu: {
        categories: categories
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

  console.log('\n✅ Successfully updated menu_state!');
  console.log(`Total categories: ${categories.length}`);
  categories.forEach(cat => {
    console.log(`  - ${cat.name}: ${cat.items.length} items`);
  });
}

updateMenuState();
