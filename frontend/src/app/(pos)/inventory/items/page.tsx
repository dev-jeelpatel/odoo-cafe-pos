'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Sidebar from '@/components/ui/Sidebar';
import { useSidebar } from '@/contexts/SidebarContext';
import api from '@/lib/api';
import clsx from 'clsx';
import { Plus, Search, Edit2, Trash2, History, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';

const UNITS = ['G', 'KG', 'ML', 'L', 'PCS', 'DOZEN'];

function StatusBadge({ item }: { item: any }) {
  if (item.currentStock <= 0) return <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Out of Stock</span>;
  if (item.currentStock <= item.minStock) return <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">Low Stock</span>;
  return <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">OK</span>;
}

function ItemModal({ item, categories, suppliers, onClose, onSaved }: any) {
  const [form, setForm] = useState(item ?? { name: '', sku: '', categoryId: '', unit: 'KG', currentStock: 0, minStock: 0, maxStock: '', unitCost: 0, supplierId: '', storageLocation: '' });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.name || !form.categoryId) return toast.error('Name and category are required');
    setSaving(true);
    try {
      const payload = { ...form, maxStock: form.maxStock === '' ? null : parseFloat(form.maxStock), supplierId: form.supplierId || null };
      if (item) await api.put(`/inventory/items/${item.id}`, payload);
      else await api.post('/inventory/items', payload);
      toast.success(item ? 'Item updated' : 'Item created');
      onSaved();
    } catch (e: any) { toast.error(e.response?.data?.message ?? 'Error'); }
    finally { setSaving(false); }
  };

  const f = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b"><h2 className="text-lg font-bold">{item ? 'Edit Item' : 'Add Inventory Item'}</h2></div>
        <div className="p-5 grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="label">Item Name *</label><input className="input" value={form.name} onChange={e => f('name', e.target.value)} /></div>
          <div><label className="label">SKU Code</label><input className="input" value={form.sku} onChange={e => f('sku', e.target.value)} placeholder="Auto if blank" /></div>
          <div><label className="label">Unit *</label>
            <select className="input" value={form.unit} onChange={e => f('unit', e.target.value)}>
              {UNITS.map(u => <option key={u}>{u}</option>)}
            </select>
          </div>
          <div className="col-span-2"><label className="label">Category *</label>
            <select className="input" value={form.categoryId} onChange={e => f('categoryId', e.target.value)}>
              <option value="">Select category</option>
              {categories?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div><label className="label">Current Stock</label><input type="number" className="input" value={form.currentStock} onChange={e => f('currentStock', parseFloat(e.target.value) || 0)} /></div>
          <div><label className="label">Min Stock (Reorder)</label><input type="number" className="input" value={form.minStock} onChange={e => f('minStock', parseFloat(e.target.value) || 0)} /></div>
          <div><label className="label">Max Stock</label><input type="number" className="input" value={form.maxStock} onChange={e => f('maxStock', e.target.value)} /></div>
          <div><label className="label">Unit Cost (₹)</label><input type="number" className="input" value={form.unitCost} onChange={e => f('unitCost', parseFloat(e.target.value) || 0)} /></div>
          <div className="col-span-2"><label className="label">Supplier</label>
            <select className="input" value={form.supplierId} onChange={e => f('supplierId', e.target.value)}>
              <option value="">No supplier</option>
              {suppliers?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="col-span-2"><label className="label">Storage Location</label><input className="input" value={form.storageLocation} onChange={e => f('storageLocation', e.target.value)} placeholder="e.g. Refrigerator A" /></div>
        </div>
        <div className="p-5 border-t flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={save} disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : 'Save Item'}</button>
        </div>
      </div>
    </div>
  );
}

export default function InventoryItemsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { collapsed } = useSidebar();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [editing, setEditing] = useState<any>(null);
  const [adding, setAdding] = useState(false);

  const { data } = useQuery({ queryKey: ['inventory-items', search, status, categoryId], queryFn: () => api.get('/inventory/items', { params: { search, status, categoryId } }).then(r => r.data) });
  const { data: cats } = useQuery({ queryKey: ['inv-categories'], queryFn: () => api.get('/inventory/categories').then(r => r.data) });
  const { data: suppliers } = useQuery({ queryKey: ['suppliers'], queryFn: () => api.get('/suppliers').then(r => r.data) });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/inventory/items/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventory-items'] }); toast.success('Item removed'); },
  });

  const refresh = () => { qc.invalidateQueries({ queryKey: ['inventory-items'] }); setAdding(false); setEditing(null); };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className={clsx('flex-1 flex flex-col min-w-0 transition-all duration-300', collapsed ? 'lg:ml-20' : 'lg:ml-64')}>
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Inventory Items</h1>
          <button onClick={() => setAdding(true)} className="btn-primary flex items-center gap-2"><Plus size={16} /> Add Item</button>
        </header>

        {/* Filters */}
        <div className="bg-white border-b border-gray-100 px-6 py-3 flex flex-wrap gap-3">
          <div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input className="input pl-9 w-56 text-sm" placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} /></div>
          <select className="input text-sm w-40" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">All Status</option><option value="OK">OK</option><option value="LOW">Low Stock</option><option value="OUT">Out of Stock</option>
          </select>
          <select className="input text-sm w-48" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
            <option value="">All Categories</option>
            {cats?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Item Name', 'SKU', 'Category', 'Stock', 'Min', 'Unit', 'Cost (₹)', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data?.items?.map((item: any, i: number) => (
                  <tr key={item.id} className={clsx('hover:bg-gray-50', i % 2 === 1 && 'bg-gray-50/50')}>
                    <td className="px-4 py-3 font-medium text-gray-800">{item.name}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{item.sku}</td>
                    <td className="px-4 py-3 text-gray-600">{item.category?.name}</td>
                    <td className="px-4 py-3 font-semibold">{item.currentStock}</td>
                    <td className="px-4 py-3 text-gray-500">{item.minStock}</td>
                    <td className="px-4 py-3 text-gray-500">{item.unit}</td>
                    <td className="px-4 py-3">₹{item.unitCost}</td>
                    <td className="px-4 py-3"><StatusBadge item={item} /></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => setEditing(item)} className="p-1.5 hover:bg-gray-100 rounded text-gray-500"><Edit2 size={14} /></button>
                        <button onClick={() => { if (confirm('Delete this item?')) deleteMut.mutate(item.id); }} className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {(!data?.items || data.items.length === 0) && (
                  <tr><td colSpan={9} className="text-center py-12 text-gray-400">No items found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {(adding || editing) && (
        <ItemModal item={editing} categories={cats} suppliers={suppliers} onClose={() => { setAdding(false); setEditing(null); }} onSaved={refresh} />
      )}
    </div>
  );
}
