'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Floor, Table } from '@/types';
import api from '@/lib/api';
import { useCart } from '@/contexts/CartContext';
import clsx from 'clsx';
import { Users } from 'lucide-react';

interface Props { onClose: () => void; }

const statusColor: Record<string, string> = {
  available: 'bg-emerald-100 border-emerald-300 hover:border-emerald-500',
  occupied: 'bg-red-100 border-red-300 cursor-not-allowed opacity-70',
  reserved: 'bg-yellow-100 border-yellow-300',
  disabled: 'bg-gray-100 border-gray-300 cursor-not-allowed opacity-50',
};

export default function TableSelector({ onClose }: Props) {
  const { setSelectedTable } = useCart();
  const [activeFloor, setActiveFloor] = useState<string>('all');

  const { data: floors = [] } = useQuery<Floor[]>({ queryKey: ['floors'], queryFn: () => api.get('/floors').then(r => r.data) });
  const { data: tables = [] } = useQuery<Table[]>({ queryKey: ['tables'], queryFn: () => api.get('/floors/tables').then(r => r.data) });

  const filtered = activeFloor === 'all' ? tables : tables.filter(t => t.floor._id === activeFloor);

  const handleSelect = (table: Table) => {
    if (table.status === 'occupied' || table.status === 'disabled') return;
    setSelectedTable(table);
    onClose();
  };

  return (
    <div>
      <div className="flex gap-2 flex-wrap mb-4">
        <button onClick={() => setActiveFloor('all')} className={clsx('px-3 py-1.5 rounded-lg text-sm font-medium transition-colors', activeFloor === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')}>
          All Floors
        </button>
        {floors.map(f => (
          <button key={f._id} onClick={() => setActiveFloor(f._id)} className={clsx('px-3 py-1.5 rounded-lg text-sm font-medium transition-colors', activeFloor === f._id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')}>
            {f.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {filtered.map(table => (
          <button
            key={table._id}
            onClick={() => handleSelect(table)}
            className={clsx('border-2 rounded-xl p-3 text-left transition-all', statusColor[table.status])}
          >
            <div className="font-bold text-gray-800 text-lg">T{table.number}</div>
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
              <Users size={12} /> {table.seats} seats
            </div>
            <div className={clsx('text-xs font-medium mt-1 capitalize', {
              'text-emerald-600': table.status === 'available',
              'text-red-600': table.status === 'occupied',
              'text-yellow-600': table.status === 'reserved',
              'text-gray-500': table.status === 'disabled',
            })}>{table.status}</div>
          </button>
        ))}
        {filtered.length === 0 && <p className="col-span-4 text-center text-gray-400 py-8">No tables found</p>}
      </div>

      <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" />Available</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-400 inline-block" />Occupied</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-yellow-400 inline-block" />Reserved</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-gray-400 inline-block" />Disabled</span>
      </div>
    </div>
  );
}
