'use client';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Sidebar from '@/components/ui/Sidebar';
import ProductGrid from '@/components/pos/ProductGrid';
import { SkeletonBox } from '@/components/ui/Skeleton';
import { Menu, Clock, Keyboard } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { avatarUrl } from '@/lib/avatar';
import { format } from 'date-fns';
import clsx from 'clsx';

// Lazy-loaded — not needed until the user interacts with the cart or keyboard shortcut
const CartPanel = dynamic(() => import('@/components/pos/CartPanel'), {
  ssr: false,
  loading: () => (
    <div className="h-full p-4 space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <SkeletonBox key={i} className={`h-14 ${i === 0 ? 'w-full' : i === 4 ? 'w-1/2' : 'w-4/5'}`} />
      ))}
    </div>
  ),
});
const KeyboardShortcutsModal = dynamic(() => import('@/components/pos/KeyboardShortcutsModal'), { ssr: false });

export default function POSPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [now, setNow] = useState(new Date());
  const { user } = useAuth();
  const { selectedTable } = useCart();
  const { collapsed } = useSidebar();

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className={clsx('flex-1 flex flex-col min-w-0 transition-all duration-300', collapsed ? 'lg:ml-20' : 'lg:ml-64')}>
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center gap-3 shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 hover:bg-gray-100 rounded-lg">
            <Menu size={20} />
          </button>
          <h1 className="font-bold text-gray-900">POS Terminal</h1>
          {selectedTable && (
            <span className="ml-2 bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded-full font-medium">
              Table {selectedTable.tableNumber}
            </span>
          )}
          <div className="ml-auto flex items-center gap-3 text-sm text-gray-600">
            <div className="hidden md:flex items-center gap-1.5 text-gray-400">
              <Clock size={14} />
              <span className="tabular-nums">{format(now, 'h:mm a')}</span>
            </div>
            <button onClick={() => setShortcutsOpen(true)} title="Keyboard shortcuts" className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors">
              <Keyboard size={16} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full overflow-hidden bg-indigo-600 flex-shrink-0">
                {user?.id && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl(user.id)} alt={user.name} className="w-full h-full object-cover" />
                )}
              </div>
              <span className="hidden sm:block">{user?.name}</span>
            </div>
          </div>
        </header>

        {shortcutsOpen && (
          <KeyboardShortcutsModal isOpen={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
        )}

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-hidden p-3 lg:p-4">
            <ProductGrid />
          </div>
          <div className="w-72 lg:w-80 xl:w-96 border-l border-gray-200 flex-shrink-0 overflow-hidden">
            <CartPanel />
          </div>
        </div>
      </div>
    </div>
  );
}
