'use client';
import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Order, Category } from '@/types';
import api from '@/lib/api';
import { getSocket } from '@/lib/socket';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { format } from 'date-fns';
import {
  ChefHat, Search, Clock, Flame, CheckCircle2, Play, X,
  SortAsc, Filter,
} from 'lucide-react';

type KS = 'TO_COOK' | 'PREPARING' | 'COMPLETED';
const NEXT: Partial<Record<KS, KS>> = { TO_COOK: 'PREPARING', PREPARING: 'COMPLETED' };

/* Timer — stops (freezes) when `stopped` is true */
function ElapsedTimer({ createdAt, stopped }: { createdAt: string; stopped: boolean }) {
  const startMs = new Date(createdAt).getTime();
  const [elapsed, setElapsed] = useState(() => Math.floor((Date.now() - startMs) / 1000));

  useEffect(() => {
    if (stopped) return;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startMs) / 1000)), 1000);
    return () => clearInterval(id);
  }, [stopped, startMs]);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const urgent = mins >= 5 && !stopped;
  return (
    <span className={clsx('font-mono text-xs font-bold flex items-center gap-1',
      stopped ? 'text-green-400' : urgent ? 'text-red-400' : 'text-orange-400')}>
      <Clock size={11} />
      {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
      {stopped && <span className="ml-1 text-green-500 text-[10px]">✓</span>}
    </span>
  );
}

/* Single order card */
function OrderCard({
  order, stage, onMove, onToggleItem,
}: {
  order: Order;
  stage: KS;
  onMove: () => void;
  onToggleItem: (itemId: string, current: boolean) => void;
}) {
  const isCompleted = stage === 'COMPLETED';
  const next = NEXT[stage];

  return (
    <div className={clsx(
      'rounded-xl overflow-hidden mb-3 border transition-all',
      isCompleted
        ? 'border-green-700/40 bg-gray-800/60'
        : stage === 'PREPARING'
        ? 'border-yellow-600/40 bg-gray-800'
        : 'border-red-600/30 bg-gray-800',
    )}>
      {/* Header */}
      <div className={clsx(
        'flex items-center justify-between px-3 py-2',
        isCompleted ? 'bg-green-900/20' : stage === 'PREPARING' ? 'bg-yellow-900/20' : 'bg-red-900/20',
      )}>
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-orange-400 font-bold font-mono text-sm shrink-0">{order.orderNumber}</span>
          {order.table && (
            <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shrink-0">
              T{order.table.tableNumber}
            </span>
          )}
          <span className="text-gray-500 text-xs capitalize truncate hidden sm:block">
            {order.orderType.replace('_', '-').toLowerCase()}
          </span>
        </div>
        <span className="text-gray-400 text-xs shrink-0">{format(new Date(order.createdAt), 'hh:mm aa')}</span>
      </div>

      {/* Items */}
      <div className="px-3 py-2.5 space-y-2">
        {order.items.map(item => {
          const done = isCompleted || item.kitchenCompleted;
          return (
            <div
              key={item.id}
              onClick={() => !isCompleted && onToggleItem(item.id, item.kitchenCompleted)}
              className={clsx('flex items-center gap-2.5', !isCompleted && 'cursor-pointer group')}
            >
              {/* Checkbox / checkmark */}
              <div className={clsx(
                'w-5 h-5 rounded flex-shrink-0 flex items-center justify-center transition-all',
                done
                  ? 'bg-green-500 border-2 border-green-500'
                  : 'border-2 border-gray-500 group-hover:border-green-400',
              )}>
                {done && <span className="text-white text-xs leading-none">✓</span>}
              </div>

              {/* Item name */}
              <span className={clsx('text-sm flex-1', done ? 'line-through text-gray-500' : 'text-gray-200')}>
                <span className={clsx('font-bold', done ? 'text-gray-500' : 'text-white')}>{item.quantity}×</span>
                {' '}{item.productName}
              </span>

              {/* Category dot */}
              {item.categoryColor && (
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.categoryColor }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-gray-700/60">
        <ElapsedTimer createdAt={order.createdAt} stopped={isCompleted} />

        {next && (
          <button
            onClick={onMove}
            className={clsx(
              'flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors',
              next === 'PREPARING'
                ? 'text-yellow-300 border-yellow-500/40 hover:bg-yellow-500/20'
                : 'text-green-300 border-green-500/40 hover:bg-green-500/20',
            )}
          >
            {next === 'PREPARING'
              ? <><Play size={11} />Tap to start</>
              : <><CheckCircle2 size={11} />Mark ready</>}
          </button>
        )}

        {isCompleted && (
          <span className="text-green-400 text-xs font-bold flex items-center gap-1">
            <CheckCircle2 size={11} /> Done
          </span>
        )}
      </div>
    </div>
  );
}

/* Column header */
function ColHeader({ label, count, icon: Icon, color }: { label: string; count: number; icon: React.ElementType; color: string }) {
  return (
    <div className={clsx('flex items-center justify-between px-4 py-3 border-b flex-shrink-0', color)}>
      <div className="flex items-center gap-2">
        <Icon size={16} className={
          label === 'To Cook' ? 'text-red-400' : label === 'Preparing' ? 'text-yellow-400' : 'text-green-400'
        } />
        <span className={clsx('font-bold text-sm uppercase tracking-wide',
          label === 'To Cook' ? 'text-red-300' : label === 'Preparing' ? 'text-yellow-300' : 'text-green-300'
        )}>{label}</span>
      </div>
      <span className={clsx('text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center',
        label === 'To Cook' ? 'bg-red-500' : label === 'Preparing' ? 'bg-yellow-500' : 'bg-green-500'
      )}>{count}</span>
    </div>
  );
}

export default function KDSPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [sortBy, setSortBy] = useState<'oldest' | 'newest'>('oldest');
  const [showAllCompleted, setShowAllCompleted] = useState(false);

  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ['kds-orders'],
    queryFn: () => api.get('/orders').then(r =>
      r.data.filter((o: Order) => ['TO_COOK', 'PREPARING', 'COMPLETED'].includes(o.kitchenStatus))
    ),
    refetchInterval: 15000,
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then(r => r.data),
  });

  /* Socket.IO live updates */
  useEffect(() => {
    const socket = getSocket();
    const refresh = () => qc.invalidateQueries({ queryKey: ['kds-orders'] });
    socket.on('kitchen:new-order', refresh);
    socket.on('kitchen:status-update', refresh);
    socket.on('kitchen:item-update', refresh);
    return () => {
      socket.off('kitchen:new-order', refresh);
      socket.off('kitchen:status-update', refresh);
      socket.off('kitchen:item-update', refresh);
    };
  }, [qc]);

  /* Move order to next stage */
  const moveStage = async (order: Order) => {
    const next = NEXT[order.kitchenStatus];
    if (!next) return;

    // Optimistic update so UI moves immediately
    qc.setQueryData(['kds-orders'], (prev: Order[] | undefined) =>
      prev?.map(o => {
        if (o.id !== order.id) return o;
        const updated = { ...o, kitchenStatus: next as KS };
        if (next === 'COMPLETED') {
          updated.items = o.items.map(i => ({ ...i, kitchenCompleted: true }));
        }
        return updated;
      }) ?? []
    );

    try {
      await api.put(`/orders/${order.id}/kitchen-status`, { kitchenStatus: next });

      if (next === 'COMPLETED') {
        // Mark all items complete in the DB
        const unchecked = order.items.filter(i => !i.kitchenCompleted);
        await Promise.all(
          unchecked.map(i =>
            api.put(`/orders/${order.id}/items/${i.id}/kitchen-complete`, { kitchenCompleted: true }).catch(() => {})
          )
        );
        // Advance order status to READY
        await api.put(`/orders/${order.id}/status`, { status: 'READY' }).catch(() => {});
        toast.success(`${order.orderNumber} is ready!`, { icon: '✅' });
      } else {
        toast.success(`${order.orderNumber} → ${next.replace('_', ' ')}`);
      }
    } catch {
      toast.error('Failed to update order — retrying...');
    } finally {
      // Always re-sync from server
      qc.invalidateQueries({ queryKey: ['kds-orders'] });
    }
  };

  /* Toggle single item */
  const toggleItem = async (order: Order, itemId: string, current: boolean) => {
    const newVal = !current;

    // Optimistic update
    qc.setQueryData(['kds-orders'], (prev: Order[] | undefined) =>
      prev?.map(o =>
        o.id !== order.id ? o : { ...o, items: o.items.map(i => i.id === itemId ? { ...i, kitchenCompleted: newVal } : i) }
      ) ?? []
    );

    try {
      await api.put(`/orders/${order.id}/items/${itemId}/kitchen-complete`, { kitchenCompleted: newVal });

      // Auto-advance when all items in PREPARING are done
      const updatedItems = order.items.map(i => i.id === itemId ? { ...i, kitchenCompleted: newVal } : i);
      const allDone = updatedItems.every(i => i.kitchenCompleted);
      if (allDone && order.kitchenStatus === 'PREPARING') {
        await api.put(`/orders/${order.id}/kitchen-status`, { kitchenStatus: 'COMPLETED' });
        await api.put(`/orders/${order.id}/status`, { status: 'READY' }).catch(() => {});
        toast.success(`${order.orderNumber} auto-completed!`, { icon: '✅' });
      }
    } catch {
      toast.error('Failed to update item');
    } finally {
      qc.invalidateQueries({ queryKey: ['kds-orders'] });
    }
  };

  /* Clear completed tickets */
  const clearCompleted = async () => {
    if (!confirm('Clear all completed tickets from KDS?')) return;
    const done = orders.filter(o => o.kitchenStatus === 'COMPLETED');
    await Promise.all(done.map(o => api.put(`/orders/${o.id}/status`, { status: 'SERVED' }).catch(() => {})));
    qc.invalidateQueries({ queryKey: ['kds-orders'] });
    toast.success('Completed tickets cleared');
  };

  /* Filter + sort */
  const filtered = orders
    .filter(o => {
      if (search) {
        const q = search.toLowerCase();
        if (!o.orderNumber.toLowerCase().includes(q) && !o.items.some(i => i.productName.toLowerCase().includes(q))) return false;
      }
      if (selectedType !== 'all' && o.orderType !== selectedType) return false;
      if (selectedCategory !== 'all' && !o.items.some(i => {
        const cat = categories.find(c => c.id === selectedCategory);
        return cat && i.categoryColor === cat.color;
      })) return false;
      return true;
    })
    .sort((a, b) =>
      sortBy === 'oldest'
        ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  const toCook = filtered.filter(o => o.kitchenStatus === 'TO_COOK');
  const preparing = filtered.filter(o => o.kitchenStatus === 'PREPARING');
  const completed = filtered.filter(o => o.kitchenStatus === 'COMPLETED');
  const completedShow = showAllCompleted ? completed : completed.slice(0, 6);
  const activeCount = orders.filter(o => o.kitchenStatus !== 'COMPLETED').length;

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white overflow-hidden">
      {/* ── Top Header ── */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-gray-800 bg-gray-950 flex-shrink-0">
        {/* Left: title + count */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-orange-500 p-1.5 rounded-lg"><ChefHat size={18} /></div>
          <div>
            <p className="font-bold text-sm leading-tight">Kitchen Display</p>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-gray-400">{activeCount} active ticket{activeCount !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>

        <div className="w-px h-8 bg-gray-700 mx-1 shrink-0" />

        {/* Center: search + filters */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Search */}
          <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 flex-1 max-w-xs">
            <Search size={13} className="text-gray-400 shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search order or item…"
              className="bg-transparent text-sm outline-none flex-1 text-white placeholder-gray-500 min-w-0"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-gray-400 hover:text-white">
                <X size={12} />
              </button>
            )}
          </div>

          {/* Category */}
          <div className="flex items-center gap-1 bg-gray-800 border border-gray-700 rounded-lg px-2 py-2">
            <Filter size={12} className="text-gray-400 shrink-0" />
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="bg-transparent text-sm text-gray-300 outline-none"
            >
              <option value="all">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Order type */}
          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 outline-none"
          >
            <option value="all">All Types</option>
            <option value="DINE_IN">Dine-in</option>
            <option value="TAKEAWAY">Takeaway</option>
            <option value="DELIVERY">Delivery</option>
          </select>
        </div>

        {/* Right: sort */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 bg-gray-800 border border-gray-700 rounded-lg px-2 py-2">
            <SortAsc size={13} className="text-gray-400" />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as 'oldest' | 'newest')}
              className="bg-transparent text-sm text-gray-300 outline-none"
            >
              <option value="oldest">Oldest first</option>
              <option value="newest">Newest first</option>
            </select>
          </div>
        </div>
      </header>

      {/* ── Three columns ── */}
      <div className="flex-1 grid grid-cols-3 gap-0 overflow-hidden">
        {/* TO COOK */}
        <div className="flex flex-col border-r border-gray-800 overflow-hidden">
          <ColHeader label="To Cook" count={toCook.length} icon={Flame} color="bg-red-600/10 border-red-500/20" />
          <div className="flex-1 overflow-y-auto p-3">
            {toCook.map(o => (
              <OrderCard key={o.id} order={o} stage="TO_COOK"
                onMove={() => moveStage(o)}
                onToggleItem={(id, cur) => toggleItem(o, id, cur)}
              />
            ))}
            {toCook.length === 0 && (
              <div className="text-center text-gray-600 py-16 text-sm">
                <Flame size={28} className="mx-auto mb-2 opacity-30" />
                No orders to cook
              </div>
            )}
          </div>
        </div>

        {/* PREPARING */}
        <div className="flex flex-col border-r border-gray-800 overflow-hidden">
          <ColHeader label="Preparing" count={preparing.length} icon={ChefHat} color="bg-yellow-600/10 border-yellow-500/20" />
          <div className="flex-1 overflow-y-auto p-3">
            {preparing.map(o => (
              <OrderCard key={o.id} order={o} stage="PREPARING"
                onMove={() => moveStage(o)}
                onToggleItem={(id, cur) => toggleItem(o, id, cur)}
              />
            ))}
            {preparing.length === 0 && (
              <div className="text-center text-gray-600 py-16 text-sm">
                <ChefHat size={28} className="mx-auto mb-2 opacity-30" />
                No orders preparing
              </div>
            )}
          </div>
        </div>

        {/* COMPLETED */}
        <div className="flex flex-col overflow-hidden">
          <ColHeader label="Completed" count={completed.length} icon={CheckCircle2} color="bg-green-600/10 border-green-500/20" />
          <div className="flex-1 overflow-y-auto p-3">
            {completedShow.map(o => (
              <OrderCard key={o.id} order={o} stage="COMPLETED"
                onMove={() => moveStage(o)}
                onToggleItem={() => {}}
              />
            ))}
            {!showAllCompleted && completed.length > 6 && (
              <button
                onClick={() => setShowAllCompleted(true)}
                className="w-full py-2.5 text-xs text-gray-400 hover:text-white border border-gray-700 rounded-xl hover:border-gray-500 transition-colors"
              >
                + {completed.length - 6} more completed tickets
              </button>
            )}
            {completed.length === 0 && (
              <div className="text-center text-gray-600 py-16 text-sm">
                <CheckCircle2 size={28} className="mx-auto mb-2 opacity-30" />
                No completed orders
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-800 bg-gray-950 flex-shrink-0">
        <div className="flex items-center gap-5 text-xs text-gray-500">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" />To Cook</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-yellow-500" />Preparing</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500" />Completed</span>
        </div>
        <p className="text-xs text-gray-600">Tap items to check · Tap button to advance</p>
        <button
          onClick={clearCompleted}
          className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20 transition-colors disabled:opacity-40"
          disabled={completed.length === 0}
        >
          Clear Completed ({completed.length})
        </button>
      </div>
    </div>
  );
}
