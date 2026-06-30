'use client';
import { useState, useRef, useEffect, memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Product, Category } from '@/types';
import api from '@/lib/api';
import { useCart } from '@/contexts/CartContext';
import { getProductEmoji } from '@/lib/productVisuals';
import { Search, Plus, Minus, Sparkles, Star, X, PackageSearch } from 'lucide-react';

const FAVORITES_KEY = 'pos_favorite_products';
// Products and categories rarely change — cache aggressively to avoid blocking LCP
const CATALOG_STALE_TIME = 10 * 60 * 1000; // 10 minutes

function ProductSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden flex flex-col animate-pulse">
      <div className="w-full aspect-[4/3] bg-gray-100" />
      <div className="px-2.5 pt-2 pb-1">
        <div className="h-3.5 bg-gray-200 rounded w-3/4 mb-1.5" />
        <div className="h-2.5 bg-gray-100 rounded w-1/2" />
      </div>
      <div className="px-2.5 pb-2.5 mt-auto flex items-center justify-between">
        <div className="h-3 bg-gray-200 rounded w-10" />
        <div className="w-6 h-6 bg-gray-200 rounded-full" />
      </div>
    </div>
  );
}

export default memo(function ProductGrid() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const searchRef = useRef<HTMLInputElement>(null);
  const { items, addItem, removeItem, updateQty } = useCart();

  const { data: categories = [], isLoading: catsLoading } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then(r => r.data),
    staleTime: CATALOG_STALE_TIME,
  });
  const { data: products = [], isLoading: prodsLoading } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: () => api.get('/products').then(r => r.data),
    staleTime: CATALOG_STALE_TIME,
  });

  const isLoading = catsLoading || prodsLoading;

  useEffect(() => {
    const saved = localStorage.getItem(FAVORITES_KEY);
    if (saved) setFavorites(new Set(JSON.parse(saved)));
  }, []);

  const toggleFavorite = (id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      localStorage.setItem(FAVORITES_KEY, JSON.stringify([...next]));
      return next;
    });
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      if (e.key === '/' && !isTyping) {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === 'Escape' && target === searchRef.current && search) {
        setSearch('');
        searchRef.current?.blur();
      } else if (e.altKey && !isTyping && /^[1-9]$/.test(e.key)) {
        e.preventDefault();
        const n = parseInt(e.key, 10);
        if (n === 1) setActiveCategory('all');
        else if (categories[n - 2]) setActiveCategory(categories[n - 2].id);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [categories, search]);

  const filtered = products.filter(p => {
    const matchCat = activeCategory === 'all' || (activeCategory === 'favorites' ? favorites.has(p.id) : p.categoryId === activeCategory);
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch && p.active;
  });

  const qtyOf = (productId: string) => items.find(i => i.product.id === productId)?.quantity || 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 mb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products... (press / to focus)" className="input pl-9 pr-9" />
          {search && (
            <button onClick={() => { setSearch(''); searchRef.current?.focus(); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 flex-shrink-0 mb-3">
        <button onClick={() => setActiveCategory('all')} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 transition-colors flex items-center gap-1.5 ${activeCategory === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          <Sparkles size={12} /> All Items
        </button>
        {favorites.size > 0 && (
          <button onClick={() => setActiveCategory('favorites')} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 transition-colors flex items-center gap-1.5 ${activeCategory === 'favorites' ? 'bg-yellow-400 text-yellow-900' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            <Star size={12} fill={activeCategory === 'favorites' ? 'currentColor' : 'none'} /> Favorites
          </button>
        )}
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
          {isLoading ? (
            Array.from({ length: 12 }).map((_, i) => <ProductSkeleton key={i} />)
          ) : (
            <>
              {filtered.map(product => {
                const qty = qtyOf(product.id);
                const color = product.category?.color || '#6366f1';
                return (
                  <div key={product.id}
                    className="relative bg-white border border-gray-200 rounded-2xl overflow-hidden text-left hover:border-indigo-300 hover:shadow-lg transition-all group flex flex-col"
                  >
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(product.id); }}
                      title={favorites.has(product.id) ? 'Remove from favorites' : 'Add to favorites'}
                      className="absolute top-1.5 left-1.5 z-10 w-6 h-6 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-sm shadow-sm hover:bg-white transition-colors"
                    >
                      <Star size={13} className={favorites.has(product.id) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'} />
                    </button>
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
              {filtered.length === 0 && (
                <div className="col-span-full text-center text-gray-400 py-12">
                  <PackageSearch size={40} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No products found</p>
                  {search && <p className="text-xs mt-1">Try a different search term</p>}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
});
