'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Product, Category } from '@/types';
import api from '@/lib/api';
import { useCart } from '@/contexts/CartContext';
import { getProductEmoji } from '@/lib/productVisuals';
import { Search, Plus, Minus, Sparkles } from 'lucide-react';

export default function ProductGrid() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const { items, addItem, removeItem, updateQty } = useCart();

  const { data: categories = [] } = useQuery<Category[]>({ queryKey: ['categories'], queryFn: () => api.get('/categories').then(r => r.data) });
  const { data: products = [] } = useQuery<Product[]>({ queryKey: ['products'], queryFn: () => api.get('/products').then(r => r.data) });

  const filtered = products.filter(p => {
    const matchCat = activeCategory === 'all' || p.categoryId === activeCategory;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch && p.active;
  });

  const qtyOf = (productId: string) => items.find(i => i.product.id === productId)?.quantity || 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 mb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..." className="input pl-9" />
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 flex-shrink-0 mb-3">
        <button onClick={() => setActiveCategory('all')} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 transition-colors flex items-center gap-1.5 ${activeCategory === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          <Sparkles size={12} /> All Items
        </button>
        {categories.map(cat => (
          <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
            className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 transition-colors flex items-center gap-1.5"
            style={activeCategory === cat.id ? { backgroundColor: cat.color, color: 'white' } : { border: `2px solid ${cat.color}`, color: cat.color }}
          >
            <span>{getProductEmoji(cat.name, cat.name)}</span>
            {cat.name}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
          {filtered.map(product => {
            const qty = qtyOf(product.id);
            const color = product.category?.color || '#6366f1';
            return (
              <div key={product.id}
                className="bg-white border border-gray-200 rounded-2xl overflow-hidden text-left hover:border-indigo-300 hover:shadow-lg transition-all group flex flex-col"
              >
                <button onClick={() => addItem(product)} className="block w-full text-left">
                  <div className="relative w-full aspect-[4/3] flex items-center justify-center overflow-hidden" style={{ background: `linear-gradient(135deg, ${color}22, ${color}08)` }}>
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-5xl drop-shadow-sm group-hover:scale-110 transition-transform">{getProductEmoji(product.name, product.category?.name)}</span>
                    )}
                    {qty > 0 && (
                      <span className="absolute top-1.5 right-1.5 bg-indigo-600 text-white text-[11px] font-bold rounded-full min-w-[20px] h-5 px-1 flex items-center justify-center shadow">
                        {qty}
                      </span>
                    )}
                  </div>
                  <div className="px-2.5 pt-2 pb-1">
                    <p className="text-sm font-semibold text-gray-800 leading-tight line-clamp-2 min-h-[2.5em]">{product.name}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5 truncate">{product.category?.name}</p>
                  </div>
                </button>

                <div className="px-2.5 pb-2.5 mt-auto flex items-center justify-between">
                  <span className="text-indigo-600 font-bold text-sm">₹{product.price}</span>
                  {qty > 0 ? (
                    <div className="flex items-center gap-1.5 bg-indigo-50 rounded-full px-1 py-0.5">
                      <button onClick={() => qty > 1 ? updateQty(product.id, qty - 1) : removeItem(product.id)} className="w-5 h-5 flex items-center justify-center rounded-full bg-white text-indigo-600 shadow-sm hover:bg-indigo-100">
                        <Minus size={11} />
                      </button>
                      <span className="text-xs font-bold text-indigo-700 w-4 text-center">{qty}</span>
                      <button onClick={() => addItem(product)} className="w-5 h-5 flex items-center justify-center rounded-full bg-indigo-600 text-white shadow-sm hover:bg-indigo-700">
                        <Plus size={11} />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => addItem(product)} className="bg-indigo-600 text-white rounded-full p-1 hover:bg-indigo-700 transition-colors">
                      <Plus size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && <div className="col-span-full text-center text-gray-400 py-12">No products found</div>}
        </div>
      </div>
    </div>
  );
}
