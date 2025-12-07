"use client";

import { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { supabase } from '../utils/supabaseClient';

interface MenuItem {
  id: string;
  name: string;
  enName: string;
  price: number;
}

interface Category {
  id: string;
  name: string;
  items: MenuItem[];
}

export default function Home() {
  const [categories, setCategories] = useState<Category[]>([
    {
      id: 'cat1',
      name: '400°C Napoli Pizza',
      items: [
        { id: '1', name: '經典瑪格麗特披薩', enName: 'Margherita Pizza', price: 400 },
        { id: '2', name: '塔雷吉歐四種起司堅果披薩', enName: 'Four Cheese Nut Pizza', price: 430 },
        { id: '3', name: '牛肝菌黑松露野菇披薩', enName: 'Truffle & Wild Mushroom Pizza', price: 450 },
        { id: '4', name: '普雷旺斯干貝海鮮披薩', enName: 'Scallop & Seafood Pizza', price: 480 },
        { id: '5', name: '墨西哥辣味牛肉起司披薩', enName: 'Spicy Beef & Cheese Pizza', price: 450 },
      ],
    },
    // additional categories can be fetched from supabase
  ]);

  const [cart, setCart] = useState<{ item: MenuItem; quantity: number }[]>([]);
  const [tableCount, setTableCount] = useState<number>(1);

  const handleItemClick = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((ci) => ci.item.id === item.id);
      if (existing) {
        // remove if clicked again
        return prev.filter((ci) => ci.item.id !== item.id);
      } else {
        return [...prev, { item, quantity: 1 }];
      }
    });
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const newCategories = Array.from(categories);
    const [removed] = newCategories.splice(result.source.index, 1);
    newCategories.splice(result.destination.index, 0, removed);
    setCategories(newCategories);
  };

  const totalPrice = cart.reduce((sum, ci) => sum + ci.item.price * ci.quantity, 0);
  const perPerson = tableCount > 0 ? Math.ceil(totalPrice / tableCount) : 0;

  return (
    <div className="flex flex-col md:flex-row p-4 gap-4 bg-gray-900 text-white">
      <div className="md:w-2/3">
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="categories">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef}>
                {categories.map((cat, index) => (
                  <Draggable key={cat.id} draggableId={cat.id} index={index}>
                    {(prov) => (
                      <div
                        ref={prov.innerRef}
                        {...prov.draggableProps}
                        {...prov.dragHandleProps}
                        className="mb-6 border rounded p-4 bg-gray-800"
                      >
                        <h2 className="font-bold text-lg mb-2 text-purple-400">{cat.name}</h2>
                        <ul>
                          {cat.items.map((item) => {
                            const selected = cart.some((ci) => ci.item.id === item.id);
                            return (
                              <li
                                key={item.id}
                                className={`flex justify-between p-2 cursor-pointer rounded-lg ${
                                  selected ? 'bg-purple-600 text-white' : 'bg-gray-700'
                                }`}
                                onClick={() => handleItemClick(item)}
                              >
                                <span>{item.name} ({item.enName})</span>
                                <span className="text-purple-400">${item.price}</span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
      <div className="md:w-1/3 border rounded p-4 bg-gray-800">
        <h2 className="font-bold text-xl mb-4 text-purple-400">已選擇的餐點</h2>
        <div className="flex items-center mb-4">
          <span className="mr-2">用餐人數:</span>
          <input
            type="number"
            min={1}
            value={tableCount}
            onChange={(e) => setTableCount(parseInt(e.target.value))}
            className="border px-2 py-1 w-20 bg-gray-700 text-white"
          />
        </div>
        <ul>
          {cart.map(({ item, quantity }) => (
            <li key={item.id} className="flex justify-between py-1">
              <span>{item.name}</span>
              <span>${item.price * quantity}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 font-semibold">
          <span>總金額: </span>
          <span className="text-purple-400">${totalPrice}</span>
        </div>
        <div className="mt-1">
          <span>人均: </span>
          <span className="text-purple-400">${perPerson}</span>
        </div>
        <button className="mt-4 w-full py-2 bg-purple-600 text-white rounded-lg">儲存訂單</button>
        <button className="mt-2 w-full py-2 bg-gray-700 text-white rounded-lg">清除訂單</button>
      </div>
    </div>
  );
}
