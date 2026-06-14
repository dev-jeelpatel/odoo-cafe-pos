'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/contexts/SidebarContext';
import {
  Coffee, ShoppingCart, Users, LayoutGrid, Tag, Percent, CreditCard,
  BarChart3, LogOut, ChefHat, Layers, TicketPercent, Building2, X,
  Clock, Shield, ReceiptText, PanelLeftClose, PanelLeftOpen, Smartphone,
} from 'lucide-react';
import clsx from 'clsx';
import { avatarUrl } from '@/lib/avatar';

const groups: { label: string; links: { href: string; label: string; icon: any; roles: string[]; newTab?: boolean }[] }[] = [
  {
    label: 'Operations',
    links: [
      { href: '/pos', label: 'POS Terminal', icon: ShoppingCart, roles: ['ADMIN', 'EMPLOYEE'] },
      { href: '/orders', label: 'Orders', icon: LayoutGrid, roles: ['ADMIN', 'EMPLOYEE'] },
      { href: '/kds', label: 'Kitchen Display', icon: ChefHat, roles: ['ADMIN', 'EMPLOYEE'], newTab: true },
      { href: '/customers', label: 'Customers', icon: Users, roles: ['ADMIN', 'EMPLOYEE'] },
      { href: '/sessions', label: 'Sessions', icon: Clock, roles: ['ADMIN', 'EMPLOYEE'] },
    ],
  },
  {
    label: 'Catalog',
    links: [
      { href: '/products', label: 'Products', icon: Coffee, roles: ['ADMIN'] },
      { href: '/categories', label: 'Categories', icon: Tag, roles: ['ADMIN'] },
      { href: '/floors', label: 'Floors & Tables', icon: Building2, roles: ['ADMIN', 'EMPLOYEE'] },
      { href: '/payment-methods', label: 'Payment Methods', icon: CreditCard, roles: ['ADMIN'] },
      { href: '/coupons', label: 'Coupons', icon: TicketPercent, roles: ['ADMIN'] },
      { href: '/promotions', label: 'Promotions', icon: Percent, roles: ['ADMIN'] },
    ],
  },
  {
    label: 'Management',
    links: [
      { href: '/employees', label: 'Employees', icon: Layers, roles: ['ADMIN'] },
      { href: '/reports', label: 'Reports', icon: BarChart3, roles: ['ADMIN'] },
      { href: '/receipts', label: 'Receipts', icon: ReceiptText, roles: ['ADMIN', 'EMPLOYEE'] },
      { href: '/audit-logs', label: 'Audit Logs', icon: Shield, roles: ['ADMIN'] },
    ],
  },
];

interface SidebarProps { isOpen: boolean; onClose: () => void; }

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { collapsed, toggle } = useSidebar();

  const isActive = (href: string) => pathname === href || (pathname.startsWith(href) && href !== '/');

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={onClose} />}
      <aside className={clsx(
        'fixed left-0 top-0 h-full bg-white text-gray-900 z-40 flex flex-col transition-all duration-300 border-r border-gray-200 shadow-sm',
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        collapsed ? 'w-20' : 'w-64'
      )}>
        {/* Logo */}
        <div className={clsx('flex items-center p-4 border-b border-gray-200 h-[57px]', collapsed ? 'justify-center' : 'justify-between')}>
          <div className="flex items-center gap-2 min-w-0">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-1.5 rounded-lg shadow-lg shadow-indigo-900/20 flex-shrink-0 text-white"><Coffee size={20} /></div>
            {!collapsed && <span className="font-bold text-lg truncate">Cafe POS</span>}
          </div>
          <button onClick={onClose} className="lg:hidden p-1 hover:bg-gray-100 rounded"><X size={18} /></button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2.5 scrollbar-hide">
          {groups.map(group => {
            const visible = group.links.filter(l => user && l.roles.includes(user.role));
            if (visible.length === 0) return null;
            return (
              <div key={group.label} className="mb-4">
                {!collapsed && (
                  <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">{group.label}</p>
                )}
                <div className="space-y-0.5">
                  {visible.map(({ href, label, icon: Icon, newTab }) => {
                    const active = isActive(href);
                    const cls = clsx(
                      'group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                      collapsed && 'justify-center px-0',
                      active
                        ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-200'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    );
                    const inner = <>
                      {active && !collapsed && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-white/80" />}
                      <Icon size={18} className={clsx('flex-shrink-0 transition-transform', !active && 'group-hover:scale-110', active && 'drop-shadow-sm')} />
                      {!collapsed && <span className="truncate">{label}</span>}
                      {collapsed && (
                        <span className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded-md bg-gray-800 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 z-50">
                          {label}
                        </span>
                      )}
                    </>;
                    return newTab ? (
                      <a key={href} href={href} target="_blank" rel="noopener noreferrer" onClick={onClose} title={collapsed ? label : undefined} className={cls}>{inner}</a>
                    ) : (
                      <Link key={href} href={href} onClick={onClose} title={collapsed ? label : undefined} className={cls}>{inner}</Link>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Customer Menu — external */}
          <div className="mb-4">
            {!collapsed && <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">Customer</p>}
            <a
              href="/menu"
              target="_blank"
              rel="noopener noreferrer"
              title={collapsed ? 'Customer Menu' : undefined}
              className={clsx(
                'group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                collapsed && 'justify-center px-0'
              )}
            >
              <Smartphone size={18} className="flex-shrink-0 transition-transform group-hover:scale-110" />
              {!collapsed && <span className="truncate">Customer Menu</span>}
              {collapsed && (
                <span className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded-md bg-gray-800 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 z-50">
                  Customer Menu
                </span>
              )}
            </a>
          </div>
        </nav>

        {/* Collapse toggle */}
        <div className="hidden lg:block border-t border-gray-200 p-2.5">
          <button
            onClick={toggle}
            className={clsx('flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors', collapsed && 'justify-center px-0')}
            title={collapsed ? 'Expand sidebar' : undefined}
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>

        {/* User */}
        <div className={clsx('p-3 border-t border-gray-200', collapsed && 'flex flex-col items-center gap-2')}>
          <div className={clsx('flex items-center gap-3 rounded-xl px-1', collapsed ? 'justify-center' : 'mb-2 px-2 py-1.5 hover:bg-gray-100 transition-colors')}>
            <div className="w-9 h-9 rounded-full flex-shrink-0 ring-2 ring-gray-100 overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600">
              {user?.id && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl(user.id)} alt={user.name} className="w-full h-full object-cover" />
              )}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{user?.name}</p>
                <p className="text-xs text-gray-500 capitalize truncate">{user?.role.toLowerCase()}</p>
              </div>
            )}
          </div>
          <button
            onClick={logout}
            title={collapsed ? 'Sign out' : undefined}
            className={clsx(
              'group relative flex items-center gap-2 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors rounded-lg px-2 py-1.5',
              collapsed ? 'justify-center w-9 h-9' : 'w-full'
            )}
          >
            <LogOut size={16} className="flex-shrink-0" />
            {!collapsed && 'Sign out'}
            {collapsed && (
              <span className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded-md bg-gray-800 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 z-50">
                Sign out
              </span>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
