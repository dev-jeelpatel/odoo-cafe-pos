'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PaymentMethod } from '@/types';
import api from '@/lib/api';
import PageLayout from '@/components/ui/PageLayout';
import { Banknote, QrCode, CreditCard, ChevronDown, ChevronUp, CheckCircle2, Wallet, Save, FlaskConical } from 'lucide-react';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import clsx from 'clsx';

const ICONS: Record<string, React.ReactNode> = {
  CASH: <Banknote size={26} />,
  UPI: <QrCode size={26} />,
  CARD: <CreditCard size={26} />,
  TEST: <FlaskConical size={26} />,
};

const COLORS: Record<string, { bg: string; text: string; ring: string; gradient: string }> = {
  CASH: { bg: 'bg-emerald-50', text: 'text-emerald-600', ring: 'ring-emerald-200', gradient: 'from-emerald-500 to-emerald-600' },
  UPI: { bg: 'bg-blue-50', text: 'text-blue-600', ring: 'ring-blue-200', gradient: 'from-blue-500 to-blue-600' },
  CARD: { bg: 'bg-purple-50', text: 'text-purple-600', ring: 'ring-purple-200', gradient: 'from-purple-500 to-purple-600' },
  TEST: { bg: 'bg-amber-50', text: 'text-amber-600', ring: 'ring-amber-200', gradient: 'from-amber-500 to-amber-600' },
};

const DESCRIPTIONS: Record<string, string> = {
  CASH: 'Accept physical cash at the counter',
  UPI: 'Scan & pay via UPI apps like GPay, PhonePe, Paytm',
  CARD: 'Accept credit & debit card payments',
  TEST: 'Simulated payment for demos & QA — no real money moves',
};

export default function PaymentMethodsPage() {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [upiInputs, setUpiInputs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const { data: methods = [] } = useQuery<PaymentMethod[]>({ queryKey: ['payment-methods'], queryFn: () => api.get('/payment-methods').then(r => r.data) });

  const toggle = async (method: PaymentMethod) => {
    await api.put(`/payment-methods/${method.id}`, { enabled: !method.enabled });
    qc.invalidateQueries({ queryKey: ['payment-methods'] });
    toast.success(`${method.label} ${method.enabled ? 'disabled' : 'enabled'}`);
  };

  const saveUpi = async (method: PaymentMethod) => {
    const upiId = upiInputs[method.id] ?? method.upiId ?? '';
    setSaving(method.id);
    try {
      await api.put(`/payment-methods/${method.id}`, { upiId });
      qc.invalidateQueries({ queryKey: ['payment-methods'] });
      toast.success('UPI ID saved');
    } finally { setSaving(null); }
  };

  const enabledCount = methods.filter(m => m.enabled).length;

  return (
    <PageLayout title="Payment Methods">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6 max-w-2xl">
        <div className="card flex items-center gap-3 py-4 hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="bg-indigo-50 text-indigo-600 p-2.5 rounded-xl"><Wallet size={20} /></div>
          <div><p className="text-xs text-gray-500">Total Methods</p><p className="text-xl font-bold text-gray-900">{methods.length}</p></div>
        </div>
        <div className="card flex items-center gap-3 py-4 hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="bg-green-50 text-green-600 p-2.5 rounded-xl"><CheckCircle2 size={20} /></div>
          <div><p className="text-xs text-gray-500">Enabled</p><p className="text-xl font-bold text-gray-900">{enabledCount}</p></div>
        </div>
      </div>

      <div className="max-w-2xl space-y-4">
        {methods.map(m => {
          const isOpen = expanded === m.id;
          const currentUpi = upiInputs[m.id] ?? m.upiId ?? '';
          const showQr = m.method === 'UPI' && currentUpi;
          const c = COLORS[m.method] || COLORS.CASH;

          return (
            <div key={m.id} className={clsx(
              'card overflow-hidden transition-all hover:shadow-md',
              m.enabled ? `ring-1 ${c.ring}` : 'opacity-70'
            )}>
              {/* Gradient accent bar */}
              <div className={clsx('h-1 -mx-4 -mt-4 mb-4 bg-gradient-to-r', m.enabled ? c.gradient : 'from-gray-300 to-gray-400')} />

              {/* Row */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform hover:scale-110', c.bg, c.text)}>{ICONS[m.method]}</div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">{m.label}</p>
                      <span className={clsx('badge text-[10px]', m.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                        {m.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 truncate">{DESCRIPTIONS[m.method]}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {m.method === 'UPI' && (
                    <button onClick={() => setExpanded(isOpen ? null : m.id)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-lg transition-colors">
                      {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                  )}
                  <button onClick={() => toggle(m)} className={clsx('relative inline-flex h-6 w-11 items-center rounded-full transition-colors', m.enabled ? 'bg-indigo-600' : 'bg-gray-200')}>
                    <span className={clsx('inline-block h-4 w-4 transform rounded-full bg-white transition-transform', m.enabled ? 'translate-x-6' : 'translate-x-1')} />
                  </button>
                </div>
              </div>

              {/* UPI Expand */}
              {m.method === 'UPI' && isOpen && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex flex-col sm:flex-row gap-4 items-start">
                    <div className="flex-1 space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">UPI ID</label>
                        <div className="flex gap-2">
                          <input
                            value={currentUpi}
                            onChange={e => setUpiInputs(prev => ({ ...prev, [m.id]: e.target.value }))}
                            placeholder="yourname@upi"
                            className="input flex-1"
                          />
                          <button onClick={() => saveUpi(m)} disabled={saving === m.id} className="btn-primary px-4 whitespace-nowrap flex items-center gap-1.5 disabled:opacity-60">
                            <Save size={14} />{saving === m.id ? 'Saving...' : 'Save'}
                          </button>
                        </div>
                      </div>
                      {currentUpi && (
                        <p className="text-xs text-gray-500">
                          QR code will be generated from: <span className="font-mono font-semibold text-gray-700">{currentUpi}</span>
                        </p>
                      )}
                    </div>
                    {showQr && (
                      <div className="flex flex-col items-center gap-2">
                        <div className="bg-white p-3 rounded-xl shadow border border-gray-100 transition-transform hover:scale-105">
                          <QRCodeSVG value={`upi://pay?pa=${currentUpi}&pn=Cafe+POS`} size={120} />
                        </div>
                        <p className="text-xs text-gray-400">Scan to pay via UPI</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </PageLayout>
  );
}
