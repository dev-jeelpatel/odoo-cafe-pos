'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PaymentMethod } from '@/types';
import api from '@/lib/api';
import PageLayout from '@/components/ui/PageLayout';
import { Banknote, QrCode, CreditCard, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';

const icons: Record<string, React.ReactNode> = {
  CASH: <Banknote size={24} className="text-emerald-600" />,
  UPI: <QrCode size={24} className="text-blue-600" />,
  CARD: <CreditCard size={24} className="text-purple-600" />,
};

const bgColors: Record<string, string> = {
  CASH: 'bg-emerald-50',
  UPI: 'bg-blue-50',
  CARD: 'bg-purple-50',
};

export default function PaymentMethodsPage() {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [upiInputs, setUpiInputs] = useState<Record<string, string>>({});

  const { data: methods = [] } = useQuery<PaymentMethod[]>({ queryKey: ['payment-methods'], queryFn: () => api.get('/payment-methods').then(r => r.data) });

  const toggle = async (method: PaymentMethod) => {
    await api.put(`/payment-methods/${method.id}`, { enabled: !method.enabled });
    qc.invalidateQueries({ queryKey: ['payment-methods'] });
    toast.success(`${method.label} ${method.enabled ? 'disabled' : 'enabled'}`);
  };

  const saveUpi = async (method: PaymentMethod) => {
    const upiId = upiInputs[method.id] ?? method.upiId ?? '';
    await api.put(`/payment-methods/${method.id}`, { upiId });
    qc.invalidateQueries({ queryKey: ['payment-methods'] });
    toast.success('UPI ID saved');
  };

  return (
    <PageLayout title="Payment Methods">
      <div className="max-w-2xl space-y-4">
        {methods.map(m => {
          const isOpen = expanded === m.id;
          const currentUpi = upiInputs[m.id] ?? m.upiId ?? '';
          const showQr = m.method === 'UPI' && currentUpi;

          return (
            <div key={m.id} className="card">
              {/* Row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 ${bgColors[m.method]} rounded-xl flex items-center justify-center`}>{icons[m.method]}</div>
                  <div>
                    <p className="font-semibold text-gray-900">{m.label}</p>
                    <p className="text-sm text-gray-500">{m.enabled ? 'Enabled in POS' : 'Hidden from POS'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {m.method === 'UPI' && (
                    <button onClick={() => setExpanded(isOpen ? null : m.id)} className="text-gray-400 hover:text-gray-600 transition-colors">
                      {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                  )}
                  <button onClick={() => toggle(m)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${m.enabled ? 'bg-indigo-600' : 'bg-gray-200'}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${m.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
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
                          <button onClick={() => saveUpi(m)} className="btn-primary px-4 whitespace-nowrap">Save</button>
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
                        <div className="bg-white p-3 rounded-xl shadow border border-gray-100">
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
