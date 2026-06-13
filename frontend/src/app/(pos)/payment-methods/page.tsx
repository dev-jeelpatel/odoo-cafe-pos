'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PaymentMethod } from '@/types';
import api from '@/lib/api';
import PageLayout from '@/components/ui/PageLayout';
import { Banknote, QrCode, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';

const icons: Record<string, React.ReactNode> = {
  CASH: <Banknote size={24} className="text-emerald-600" />,
  UPI: <QrCode size={24} className="text-blue-600" />,
  CARD: <CreditCard size={24} className="text-purple-600" />,
};

export default function PaymentMethodsPage() {
  const qc = useQueryClient();
  const { data: methods = [] } = useQuery<PaymentMethod[]>({ queryKey: ['payment-methods'], queryFn: () => api.get('/payment-methods').then(r => r.data) });

  const toggle = async (method: PaymentMethod) => {
    await api.put(`/payment-methods/${method.id}`, { enabled: !method.enabled });
    qc.invalidateQueries({ queryKey: ['payment-methods'] });
    toast.success(`${method.label} ${method.enabled ? 'disabled' : 'enabled'}`);
  };

  return (
    <PageLayout title="Payment Methods">
      <div className="max-w-lg space-y-4">
        {methods.map(m => (
          <div key={m.id} className="card flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center">{icons[m.method]}</div>
              <div>
                <p className="font-semibold text-gray-900">{m.label}</p>
                <p className="text-sm text-gray-500">{m.enabled ? 'Enabled in POS' : 'Hidden from POS'}</p>
              </div>
            </div>
            <button onClick={() => toggle(m)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${m.enabled ? 'bg-indigo-600' : 'bg-gray-200'}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${m.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        ))}
      </div>
    </PageLayout>
  );
}
