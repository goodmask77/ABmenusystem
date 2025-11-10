import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function MenuPage() {
  const [menuItems, setMenuItems] = useState([]);
  const [newItem, setNewItem] = useState({ name: '', price: '', category: '' });

  useEffect(() => {
    // Fetch initial menu items
    fetchMenu();
    // Subscribe to realtime changes on menu_items table
    const channel = supabase
      .channel('menu_items_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'menu_items' },
        payload => {
          fetchMenu();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchMenu() {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .order('inserted_at', { ascending: true });
    if (!error) {
      setMenuItems(data);
    }
  }

  async function addItem() {
    // Insert a new menu item into Supabase
    const { error } = await supabase.from('menu_items').insert([
      {
        name: newItem.name,
        price: newItem.price ? parseFloat(newItem.price) : null,
        category: newItem.category,
      },
    ]);
    if (!error) {
      setNewItem({ name: '', price: '', category: '' });
    }
  }

  async function deleteItem(id) {
    await supabase.from('menu_items').delete().eq('id', id);
  }

  return (
    <main style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Menu</h1>
      <ul>
        {menuItems &&
          menuItems.map(item => (
            <li key={item.id} style={{ marginBottom: '8px' }}>
              {item.name} - ${item.price ?? ''}
              <button onClick={() => deleteItem(item.id)} style={{ marginLeft: '8px' }}>
                Delete
              </button>
            </li>
          ))}
      </ul>
      <h2>Add Item</h2>
      <input
        value={newItem.name}
        onChange={e => setNewItem({ ...newItem, name: e.target.value })}
        placeholder="Name"
        style={{ marginRight: '8px' }}
      />
      <input
        value={newItem.price}
        onChange={e => setNewItem({ ...newItem, price: e.target.value })}
        placeholder="Price"
        type="number"
        style={{ marginRight: '8px' }}
      />
      <input
        value={newItem.category}
        onChange={e => setNewItem({ ...newItem, category: e.target.value })}
        placeholder="Category"
        style={{ marginRight: '8px' }}
      />
      <button onClick={addItem}>Add</button>
    </main>
  );
}
