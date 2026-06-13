'use client';
import { useState } from 'react';
import Sidebar from '@/components/ui/Sidebar';
import ProductGrid from '@/components/pos/ProductGrid';
import CartPanel from '@/components/pos/CartPanel';
import { Menu } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';

export default function POSPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const { selectedTable } = useCart();

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center gap-3 shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 hover:bg-gray-100 rounded-lg">
            <Menu size={20} />
          </button>
          <h1 className="font-bold text-gray-900">POS Terminal</h1>
          {selectedTable && (
            <span className="ml-2 bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded-full font-medium">
              Table {selectedTable.number}
            </span>
          )}
          <div className="ml-auto flex items-center gap-2 text-sm text-gray-600">
            <div className="w-7 h-7 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
              {user?.name[0]}
            </div>
            <span className="hidden sm:block">{user?.name}</span>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Products */}
          <div className="flex-1 overflow-hidden p-3 lg:p-4">
            <ProductGrid />
          </div>

          {/* Cart */}
          <div className="w-72 lg:w-80 xl:w-96 border-l border-gray-200 flex-shrink-0 overflow-hidden">
            <CartPanel />
          </div>
        </div>
      </div>
    </div>
  );
}
