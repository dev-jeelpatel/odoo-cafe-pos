'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  Coffee, ShoppingCart, Users, LayoutGrid, Tag, Percent, CreditCard,
  BarChart3, LogOut, ChefHat, Layers, TicketPercent, Building2, X,
  Clock, Shield, ReceiptText, Smartphone,
} from 'lucide-react';
import clsx from 'clsx';

const allLinks = [
  { href: '/pos', label: 'POS Terminal', icon: ShoppingCart, roles: ['ADMIN', 'EMPLOYEE', 'CASHIER'] },
  { href: '/orders', label: 'Orders', icon: LayoutGrid, roles: ['ADMIN', 'EMPLOYEE', 'CASHIER'] },
  { href: '/customers', label: 'Customers', icon: Users, roles: ['ADMIN', 'EMPLOYEE', 'CASHIER'] },
  { href: '/kds', label: 'Kitchen Display', icon: ChefHat, roles: ['ADMIN', 'EMPLOYEE', 'CASHIER'] },
  { href: '/sessions', label: 'Sessions', icon: Clock, roles: ['ADMIN', 'EMPLOYEE', 'CASHIER'] },
  { href: '/products', label: 'Products', icon: Coffee, roles: ['ADMIN'] },
  { href: '/categories', label: 'Categories', icon: Tag, roles: ['ADMIN'] },
  { href: '/floors', label: 'Floors & Tables', icon: Building2, roles: ['ADMIN'] },
  { href: '/payment-methods', label: 'Payment Methods', icon: CreditCard, roles: ['ADMIN'] },
  { href: '/coupons', label: 'Coupons', icon: TicketPercent, roles: ['ADMIN'] },
  { href: '/promotions', label: 'Promotions', icon: Percent, roles: ['ADMIN'] },
  { href: '/employees', label: 'Employees', icon: Layers, roles: ['ADMIN'] },
  { href: '/reports', label: 'Reports', icon: BarChart3, roles: ['ADMIN'] },
  { href: '/receipts', label: 'Receipts', icon: ReceiptText, roles: ['ADMIN'] },
  { href: '/audit-logs', label: 'Audit Logs', icon: Shield, roles: ['ADMIN'] },
];

interface SidebarProps { isOpen: boolean; onClose: () => void; }

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const links = allLinks.filter(l => user && l.roles.includes(user.role));

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={onClose} />}
      <aside className={clsx(
        'fixed left-0 top-0 h-full w-64 bg-gray-900 text-white z-40 flex flex-col transition-transform duration-300',
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg"><Coffee size={20} /></div>
            <span className="font-bold text-lg">Cafe POS</span>
          </div>
          <button onClick={onClose} className="lg:hidden p-1 hover:bg-gray-700 rounded"><X size={18} /></button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {links.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} onClick={onClose}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-sm font-medium transition-colors',
                pathname === href || (pathname.startsWith(href) && href !== '/')
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
          <a href="/menu" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-sm font-medium transition-colors text-gray-300 hover:bg-gray-800 hover:text-white"
          >
            <Smartphone size={18} />
            Customer Menu
          </a>
        </nav>

        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-xs font-bold">
              {user?.name[0].toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-gray-400 capitalize">{user?.role.toLowerCase()}</p>
            </div>
          </div>
          <button onClick={logout} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors w-full">
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
