'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Floor, Table } from '@/types';
import api from '@/lib/api';
import PageLayout from '@/components/ui/PageLayout';
import Modal from '@/components/ui/Modal';
import { Plus, Pencil, Trash2, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const statusColor: Record<string, string> = { available: 'bg-emerald-100 text-emerald-700', occupied: 'bg-red-100 text-red-700', reserved: 'bg-yellow-100 text-yellow-700', disabled: 'bg-gray-100 text-gray-500' };

export default function FloorsPage() {
  const qc = useQueryClient();
  const [floorModal, setFloorModal] = useState(false);
  const [tableModal, setTableModal] = useState(false);
  const [editFloor, setEditFloor] = useState<Floor | null>(null);
  const [editTable, setEditTable] = useState<Table | null>(null);
  const [floorForm, setFloorForm] = useState({ name: '' });
  const [tableForm, setTableForm] = useState({ number: '', seats: '4', floor: '', status: 'available', isActive: true });

  const { data: floors = [] } = useQuery<Floor[]>({ queryKey: ['floors'], queryFn: () => api.get('/floors').then(r => r.data) });
  const { data: tables = [] } = useQuery<Table[]>({ queryKey: ['tables'], queryFn: () => api.get('/floors/tables').then(r => r.data) });

  const submitFloor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editFloor) await api.put(`/floors/${editFloor._id}`, floorForm);
      else await api.post('/floors', floorForm);
      qc.invalidateQueries({ queryKey: ['floors'] });
      setFloorModal(false);
      toast.success(editFloor ? 'Floor updated' : 'Floor created');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const submitTable = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...tableForm, seats: parseInt(tableForm.seats) };
    try {
      if (editTable) await api.put(`/floors/tables/${editTable._id}`, payload);
      else await api.post('/floors/tables', payload);
      qc.invalidateQueries({ queryKey: ['tables'] });
      setTableModal(false);
      toast.success(editTable ? 'Table updated' : 'Table created');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Error'); }
  };

  return (
    <PageLayout title="Floors & Tables" actions={
      <div className="flex gap-2">
        <button onClick={() => { setEditFloor(null); setFloorForm({ name: '' }); setFloorModal(true); }} className="btn-secondary flex items-center gap-2"><Building2 size={16} />Add Floor</button>
        <button onClick={() => { setEditTable(null); setTableForm({ number: '', seats: '4', floor: floors[0]?._id || '', status: 'available', isActive: true }); setTableModal(true); }} className="btn-primary flex items-center gap-2"><Plus size={16} />Add Table</button>
      </div>
    }>
      {floors.map(floor => (
        <div key={floor._id} className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Building2 size={18} className="text-indigo-600" />{floor.name}</h2>
            <div className="flex gap-1">
              <button onClick={() => { setEditFloor(floor); setFloorForm({ name: floor.name }); setFloorModal(true); }} className="p-1.5 hover:bg-indigo-50 rounded-lg text-indigo-600"><Pencil size={14} /></button>
              <button onClick={async () => { if (!confirm('Delete floor and all its tables?')) return; await api.delete(`/floors/${floor._id}`); qc.invalidateQueries({ queryKey: ['floors'] }); qc.invalidateQueries({ queryKey: ['tables'] }); toast.success('Floor deleted'); }} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500"><Trash2 size={14} /></button>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {tables.filter(t => t.floor._id === floor._id).map(t => (
              <div key={t._id} className="card py-3 text-center hover:shadow-md transition-shadow">
                <p className="text-xl font-bold text-gray-800">T{t.number}</p>
                <p className="text-xs text-gray-500">{t.seats} seats</p>
                <span className={clsx('badge mt-1 capitalize', statusColor[t.status])}>{t.status}</span>
                <div className="flex justify-center gap-1 mt-2">
                  <button onClick={() => { setEditTable(t); setTableForm({ number: t.number, seats: String(t.seats), floor: t.floor._id, status: t.status, isActive: t.isActive }); setTableModal(true); }} className="p-1 hover:bg-indigo-50 rounded text-indigo-600"><Pencil size={12} /></button>
                  <button onClick={async () => { if (!confirm('Delete table?')) return; await api.delete(`/floors/tables/${t._id}`); qc.invalidateQueries({ queryKey: ['tables'] }); toast.success('Table deleted'); }} className="p-1 hover:bg-red-50 rounded text-red-500"><Trash2 size={12} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <Modal isOpen={floorModal} onClose={() => setFloorModal(false)} title={editFloor ? 'Edit Floor' : 'Add Floor'} size="sm">
        <form onSubmit={submitFloor} className="space-y-3">
          <input required value={floorForm.name} onChange={e => setFloorForm({ name: e.target.value })} placeholder="Floor name" className="input" />
          <div className="flex gap-2">
            <button type="button" onClick={() => setFloorModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1">{editFloor ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={tableModal} onClose={() => setTableModal(false)} title={editTable ? 'Edit Table' : 'Add Table'} size="sm">
        <form onSubmit={submitTable} className="space-y-3">
          <input required value={tableForm.number} onChange={e => setTableForm(p => ({ ...p, number: e.target.value }))} placeholder="Table number" className="input" />
          <input required type="number" min="1" value={tableForm.seats} onChange={e => setTableForm(p => ({ ...p, seats: e.target.value }))} placeholder="Number of seats" className="input" />
          <select value={tableForm.floor} onChange={e => setTableForm(p => ({ ...p, floor: e.target.value }))} className="input">
            {floors.map(f => <option key={f._id} value={f._id}>{f.name}</option>)}
          </select>
          <select value={tableForm.status} onChange={e => setTableForm(p => ({ ...p, status: e.target.value }))} className="input">
            {['available', 'occupied', 'reserved', 'disabled'].map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
          </select>
          <div className="flex gap-2">
            <button type="button" onClick={() => setTableModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1">{editTable ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </Modal>
    </PageLayout>
  );
}
