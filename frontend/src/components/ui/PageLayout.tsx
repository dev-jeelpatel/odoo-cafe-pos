'use client';
import { useState } from 'react';
import Sidebar from './Sidebar';
import { useSidebar } from '@/contexts/SidebarContext';
import { Menu } from 'lucide-react';
import clsx from 'clsx';

interface PageLayoutProps {
  children: React.ReactNode;
  title?: string;
  actions?: React.ReactNode;
}

export default function PageLayout({ children, title, actions }: PageLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { collapsed } = useSidebar();

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className={clsx('flex-1 flex flex-col min-w-0 transition-all duration-300', collapsed ? 'lg:ml-20' : 'lg:ml-64')}>
        {(title || actions) && (
          <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shrink-0">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 hover:bg-gray-100 rounded-lg">
              <Menu size={20} />
            </button>
            {title && <h1 className="text-xl font-bold text-gray-900 flex-1">{title}</h1>}
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </header>
        )}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
