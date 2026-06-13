'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Product, Category } from '@/types';
import api from '@/lib/api';
import { useCart } from '@/contexts/CartContext';
import { Search, Plus } from 'lucide-react';
import clsx from 'clsx';

export default function ProductGrid() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const { addItem } = useCart();

  const { data: categories = [] } = useQuery<Category[]>({ queryKey: ['categories'], queryFn: () => api.get('/categories').then(r => r.data) });
  const { data: products = [] } = useQuery<Product[]>({ queryKey: ['products'], queryFn: () => api.get('/products').then(r => r.data) });

  const filtered = products.filter(p => {
    const matchCat = activeCategory === 'all' || p.category?._id === activeCategory;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch && p.isAvailable;
  });

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 mb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..." className="input pl-9" />
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 flex-shrink-0 mb-3 scrollbar-hide">
        <button onClick={() => setActiveCategory('all')} className={clsx('px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 transition-colors', activeCategory === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
          All Items
        </button>
        {categories.map(cat => (
          <button key={cat._id} onClick={() => setActiveCategory(cat._id)} className={clsx('px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 transition-colors')}
            style={{ backgroundColor: activeCategory === cat._id ? cat.color : undefined, color: activeCategory === cat._id ? 'white' : undefined, border: activeCategory !== cat._id ? `2px solid ${cat.color}` : undefined, color: activeCategory !== cat._id ? cat.color : 'white' as any }}
          >
            {cat.name}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
          {filtered.map(product => (
            <button key={product._id} onClick={() => addItem(product)}
              className="bg-white border border-gray-200 rounded-xl p-3 text-left hover:border-indigo-300 hover:shadow-md transition-all group relative"
            >
              <div className="w-full h-1 rounded-full mb-2" style={{ backgroundColor: product.category?.color || '#6366f1' }} />
              <p className="text-sm font-semibold text-gray-800 leading-tight line-clamp-2">{product.name}</p>
              <p className="text-xs text-gray-400 mt-0.5 capitalize">{product.category?.name}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-indigo-600 font-bold text-sm">₹{product.price}</span>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-indigo-600 text-white rounded-full p-0.5">
                  <Plus size={12} />
                </span>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-4 text-center text-gray-400 py-12">No products found</div>
          )}
        </div>
      </div>
    </div>
  );
}
