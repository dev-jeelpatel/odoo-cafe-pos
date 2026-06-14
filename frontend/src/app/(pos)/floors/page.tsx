'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Floor, Table } from '@/types';
import api from '@/lib/api';
import PageLayout from '@/components/ui/PageLayout';
import Modal from '@/components/ui/Modal';
import { useAuth } from '@/contexts/AuthContext';
import {
  Plus, Pencil, Trash2, Building2, Armchair, CheckCircle2, Users,
  Clock, Ban, LayoutGrid, ToggleLeft, ToggleRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const STATUS_META: Record<string, { label: string; icon: typeof CheckCircle2; classes: string; cardBorder: string; iconBg: string }> = {
  AVAILABLE: { label: 'Available', icon: CheckCircle2, classes: 'bg-emerald-100 text-emerald-700', cardBorder: 'border-emerald-200', iconBg: 'bg-emerald-50 text-emerald-600' },
  OCCUPIED: { label: 'Occupied', icon: Users, classes: 'bg-red-100 text-red-700', cardBorder: 'border-red-200', iconBg: 'bg-red-50 text-red-600' },
  RESERVED: { label: 'Reserved', icon: Clock, classes: 'bg-yellow-100 text-yellow-700', cardBorder: 'border-yellow-200', iconBg: 'bg-yellow-50 text-yellow-600' },
  DISABLED: { label: 'Disabled', icon: Ban, classes: 'bg-gray-100 text-gray-500', cardBorder: 'border-gray-200', iconBg: 'bg-gray-100 text-gray-400' },
};

export default function FloorsPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [floorModal, setFloorModal] = useState(false);
  const [tableModal, setTableModal] = useState(false);
  const [editFloor, setEditFloor] = useState<Floor | null>(null);
  const [editTable, setEditTable] = useState<Table | null>(null);
  const [floorForm, setFloorForm] = useState({ name: '' });
  const [tableForm, setTableForm] = useState({ tableNumber: '', seats: '4', floorId: '', status: 'AVAILABLE', active: true });

  // Employee-only: lightweight status-change modal
  const [statusModal, setStatusModal] = useState(false);
  const [statusTable, setStatusTable] = useState<Table | null>(null);
  const [pendingStatus, setPendingStatus] = useState('');

  const { data: floors = [] } = useQuery<Floor[]>({ queryKey: ['floors'], queryFn: () => api.get('/floors').then(r => r.data) });
  const { data: tables = [] } = useQuery<Table[]>({ queryKey: ['tables'], queryFn: () => api.get('/floors/tables').then(r => r.data) });

  const submitFloor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editFloor) await api.put(`/floors/${editFloor.id}`, floorForm);
      else await api.post('/floors', floorForm);
      qc.invalidateQueries({ queryKey: ['floors'] });
      setFloorModal(false);
      toast.success(editFloor ? 'Floor updated' : 'Floor created');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const submitTable = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editTable) await api.put(`/floors/tables/${editTable.id}`, tableForm);
      else await api.post('/floors/tables', tableForm);
      qc.invalidateQueries({ queryKey: ['tables'] });
      setTableModal(false);
      toast.success(editTable ? 'Table updated' : 'Table created');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const deleteFloor = async (id: string) => {
    if (!confirm('Delete floor and all its tables?')) return;
    await api.delete(`/floors/${id}`);
    qc.invalidateQueries({ queryKey: ['floors'] }); qc.invalidateQueries({ queryKey: ['tables'] });
    toast.success('Floor deleted');
  };

  const deleteTable = async (id: string) => {
    if (!confirm('Delete table?')) return;
    await api.delete(`/floors/tables/${id}`);
    qc.invalidateQueries({ queryKey: ['tables'] });
    toast.success('Table deleted');
  };

  const changeTableStatus = async () => {
    if (!statusTable || !pendingStatus) return;
    try {
      await api.put(`/floors/tables/${statusTable.id}`, { status: pendingStatus });
      qc.invalidateQueries({ queryKey: ['tables'] });
      setStatusModal(false);
      toast.success('Table status updated');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const openStatusModal = (t: Table) => {
    setStatusTable(t);
    setPendingStatus(t.status);
    setStatusModal(true);
  };

  const counts = {
    total: tables.length,
    available: tables.filter(t => t.status === 'AVAILABLE').length,
    occupied: tables.filter(t => t.status === 'OCCUPIED').length,
    reserved: tables.filter(t => t.status === 'RESERVED').length,
    seats: tables.reduce((s, t) => s + t.seats, 0),
  };

  return (
    <PageLayout title="Floors & Tables" actions={
      isAdmin ? (
        <div className="flex gap-2">
          <button onClick={() => { setEditFloor(null); setFloorForm({ name: '' }); setFloorModal(true); }} className="btn-secondary flex items-center gap-2"><Building2 size={16} />Add Floor</button>
          <button onClick={() => { setEditTable(null); setTableForm({ tableNumber: '', seats: '4', floorId: floors[0]?.id || '', status: 'AVAILABLE', active: true }); setTableModal(true); }} className="btn-primary flex items-center gap-2"><Plus size={16} />Add Table</button>
        </div>
      ) : undefined
    }>
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <div className="card flex items-center gap-3 py-4 hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="bg-indigo-50 text-indigo-600 p-2.5 rounded-xl"><LayoutGrid size={20} /></div>
          <div><p className="text-xs text-gray-500">Total Tables</p><p className="text-xl font-bold text-gray-900">{counts.total}</p></div>
        </div>
        <div className="card flex items-center gap-3 py-4 hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="bg-emerald-50 text-emerald-600 p-2.5 rounded-xl"><CheckCircle2 size={20} /></div>
          <div><p className="text-xs text-gray-500">Available</p><p className="text-xl font-bold text-gray-900">{counts.available}</p></div>
        </div>
        <div className="card flex items-center gap-3 py-4 hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="bg-red-50 text-red-600 p-2.5 rounded-xl"><Users size={20} /></div>
          <div><p className="text-xs text-gray-500">Occupied</p><p className="text-xl font-bold text-gray-900">{counts.occupied}</p></div>
        </div>
        <div className="card flex items-center gap-3 py-4 hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="bg-yellow-50 text-yellow-600 p-2.5 rounded-xl"><Clock size={20} /></div>
          <div><p className="text-xs text-gray-500">Reserved</p><p className="text-xl font-bold text-gray-900">{counts.reserved}</p></div>
        </div>
        <div className="card flex items-center gap-3 py-4 col-span-2 sm:col-span-1 hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="bg-purple-50 text-purple-600 p-2.5 rounded-xl"><Armchair size={20} /></div>
          <div><p className="text-xs text-gray-500">Total Seats</p><p className="text-xl font-bold text-gray-900">{counts.seats}</p></div>
        </div>
      </div>

      {floors.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Building2 size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No floors yet</p>
          <p className="text-sm mt-1 mb-4">Add a floor to start setting up your tables.</p>
          {isAdmin && (
            <button onClick={() => { setEditFloor(null); setFloorForm({ name: '' }); setFloorModal(true); }} className="btn-primary inline-flex items-center gap-2"><Plus size={16} />Add Floor</button>
          )}
        </div>
      )}

      {floors.map(floor => {
        const floorTables = tables.filter(t => t.floorId === floor.id);
        return (
          <div key={floor.id} className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <span className="bg-indigo-50 text-indigo-600 p-1.5 rounded-lg"><Building2 size={18} /></span>
                {floor.name}
                <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{floorTables.length} table{floorTables.length !== 1 ? 's' : ''}</span>
              </h2>
              {isAdmin && (
                <div className="flex gap-1">
                  <button onClick={() => { setEditFloor(floor); setFloorForm({ name: floor.name }); setFloorModal(true); }} className="p-1.5 hover:bg-indigo-50 hover:scale-110 rounded-lg text-indigo-600 transition-all"><Pencil size={14} /></button>
                  <button onClick={() => deleteFloor(floor.id)} className="p-1.5 hover:bg-red-50 hover:scale-110 rounded-lg text-red-500 transition-all"><Trash2 size={14} /></button>
                </div>
              )}
            </div>

            {floorTables.length === 0 ? (
              <div className="card text-center py-8 text-gray-400 text-sm border-dashed">
                No tables on this floor yet.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                {floorTables.map(t => {
                  const meta = STATUS_META[t.status];
                  const StatusIcon = meta.icon;
                  return (
                    <div
                      key={t.id}
                      onClick={() => !isAdmin && openStatusModal(t)}
                      className={clsx(
                        'card py-4 text-center group relative border-2 transition-all hover:shadow-lg hover:-translate-y-1',
                        meta.cardBorder,
                        !t.active && 'opacity-50',
                        !isAdmin && 'cursor-pointer'
                      )}
                    >
                      <div className={clsx('w-11 h-11 mx-auto rounded-2xl flex items-center justify-center mb-2 transition-transform group-hover:scale-110 group-hover:rotate-3', meta.iconBg)}>
                        <StatusIcon size={20} />
                      </div>
                      <p className="text-xl font-bold text-gray-800">T{t.tableNumber}</p>
                      <p className="text-xs text-gray-500 flex items-center justify-center gap-1 mt-0.5">
                        <Armchair size={12} /> {t.seats} seat{t.seats !== 1 ? 's' : ''}
                      </p>
                      <span className={clsx('badge mt-2 inline-flex items-center gap-1', meta.classes)}>
                        <StatusIcon size={11} /> {meta.label}
                      </span>
                      {!t.active && (
                        <span className="badge mt-1 ml-1 bg-gray-200 text-gray-500">Inactive</span>
                      )}
                      {isAdmin && (
                        <div className="flex justify-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setEditTable(t); setTableForm({ tableNumber: t.tableNumber, seats: String(t.seats), floorId: t.floorId, status: t.status, active: t.active }); setTableModal(true); }} className="p-1 hover:bg-indigo-50 hover:scale-110 rounded text-indigo-600 transition-all"><Pencil size={12} /></button>
                          <button onClick={() => deleteTable(t.id)} className="p-1 hover:bg-red-50 hover:scale-110 rounded text-red-500 transition-all"><Trash2 size={12} /></button>
                        </div>
                      )}
                      {!isAdmin && (
                        <p className="text-[10px] text-gray-400 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">Tap to change status</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Admin: Floor modal */}
      {isAdmin && (
        <Modal isOpen={floorModal} onClose={() => setFloorModal(false)} title={editFloor ? 'Edit Floor' : 'Add Floor'} size="sm">
          <form onSubmit={submitFloor} className="space-y-3">
            <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 border border-gray-100">
              <div className="bg-indigo-50 text-indigo-600 p-2.5 rounded-xl"><Building2 size={20} /></div>
              <div className="min-w-0">
                <p className="text-xs text-gray-400">Preview</p>
                <p className="font-semibold text-gray-800 truncate">{floorForm.name.trim() || 'Floor name'}</p>
              </div>
            </div>
            <input required value={floorForm.name} onChange={e => setFloorForm({ name: e.target.value })} placeholder="e.g. Ground Floor, Terrace" className="input" autoFocus />
            <div className="flex gap-2"><button type="button" onClick={() => setFloorModal(false)} className="btn-secondary flex-1">Cancel</button><button type="submit" className="btn-primary flex-1">{editFloor ? 'Update' : 'Create'}</button></div>
          </form>
        </Modal>
      )}

      {/* Admin: Table modal */}
      {isAdmin && (
        <Modal isOpen={tableModal} onClose={() => setTableModal(false)} title={editTable ? 'Edit Table' : 'Add Table'} size="sm">
          <form onSubmit={submitTable} className="space-y-3">
            <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 border border-gray-100">
              <div className={clsx('w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0', STATUS_META[tableForm.status]?.iconBg)}>
                {(() => { const Icon = STATUS_META[tableForm.status]?.icon || CheckCircle2; return <Icon size={20} />; })()}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-400">Preview</p>
                <p className="font-semibold text-gray-800 truncate">T{tableForm.tableNumber || '?'} · {tableForm.seats || 0} seats</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Table Number</label>
              <input required value={tableForm.tableNumber} onChange={e => setTableForm(p => ({ ...p, tableNumber: e.target.value }))} placeholder="e.g. 1, A1" className="input" />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Seats</label>
              <div className="flex items-center gap-2">
                <Armchair size={16} className="text-gray-400" />
                <input required type="number" min="1" value={tableForm.seats} onChange={e => setTableForm(p => ({ ...p, seats: e.target.value }))} placeholder="Seats" className="input flex-1" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Floor</label>
              <select value={tableForm.floorId} onChange={e => setTableForm(p => ({ ...p, floorId: e.target.value }))} className="input">
                {floors.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(STATUS_META).map(([key, meta]) => {
                  const Icon = meta.icon;
                  const active = tableForm.status === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setTableForm(p => ({ ...p, status: key }))}
                      className={clsx(
                        'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all',
                        active ? clsx(meta.classes, 'border-current scale-[1.02]') : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                      )}
                    >
                      <Icon size={14} /> {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <button type="button" onClick={() => setTableForm(p => ({ ...p, active: !p.active }))} className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-800">
              {tableForm.active ? <ToggleRight size={28} className="text-indigo-600" /> : <ToggleLeft size={28} className="text-gray-400" />}
              Table is {tableForm.active ? 'active' : 'inactive'}
            </button>

            <div className="flex gap-2 pt-1"><button type="button" onClick={() => setTableModal(false)} className="btn-secondary flex-1">Cancel</button><button type="submit" className="btn-primary flex-1">{editTable ? 'Update' : 'Create'}</button></div>
          </form>
        </Modal>
      )}

      {/* Employee: Status-change modal */}
      {!isAdmin && statusTable && (
        <Modal isOpen={statusModal} onClose={() => setStatusModal(false)} title={`Table T${statusTable.tableNumber} — Change Status`} size="sm">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(STATUS_META).map(([key, meta]) => {
                const Icon = meta.icon;
                const active = pendingStatus === key;
                return (
                  <button
                    key={key}
                    onClick={() => setPendingStatus(key)}
                    className={clsx(
                      'flex items-center gap-2 px-3 py-3 rounded-xl border text-sm font-medium transition-all',
                      active ? clsx(meta.classes, 'border-current scale-[1.02] shadow-sm') : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    )}
                  >
                    <Icon size={16} /> {meta.label}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setStatusModal(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={changeTableStatus} className="btn-primary flex-1">Update Status</button>
            </div>
          </div>
        </Modal>
      )}
    </PageLayout>
  );
}
