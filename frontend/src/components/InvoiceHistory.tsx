import { useState, useEffect } from 'react';
import { X, Clock } from 'lucide-react';
import api from '../services/api';

interface AuditEntry {
  id: string;
  action: string;
  details: Record<string, unknown> | null;
  createdAt: string;
  user: { name: string; email: string };
}

interface InvoiceHistoryProps {
  invoiceId: string;
  onClose: () => void;
}

const actionLabels: Record<string, string> = {
  CREATE: 'Criação',
  UPDATE: 'Alteração',
  STATUS_CHANGE: 'Mudança de Status',
};

export function InvoiceHistory({ invoiceId, onClose }: InvoiceHistoryProps) {
  const [history, setHistory] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get(`/invoices/${invoiceId}/history`);
        setHistory(data);
      } catch (err) {
        console.error('Erro ao carregar histórico:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [invoiceId]);

  const formatDate = (date: string) => new Date(date).toLocaleString('pt-BR');

  const formatDetails = (entry: AuditEntry) => {
    if (!entry.details) return null;
    const d = entry.details as Record<string, unknown>;

    if (entry.action === 'STATUS_CHANGE') {
      const parts: string[] = [];
      if (d.from && d.to) parts.push(`${d.from} → ${d.to}`);
      if (d.rejectionReason) parts.push(`Motivo: ${d.rejectionReason}`);
      if (d.paymentDate) parts.push(`Pagamento: ${new Date(d.paymentDate as string).toLocaleDateString('pt-BR')}`);
      return parts.join(' | ');
    }

    return JSON.stringify(d, null, 2);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Clock size={20} />
            Histórico da Fatura
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Fechar">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#57489c]" />
            </div>
          ) : history.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Nenhum registro encontrado.</p>
          ) : (
            <div className="space-y-4">
              {history.map((entry) => (
                <div key={entry.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      entry.action === 'STATUS_CHANGE' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {actionLabels[entry.action] || entry.action}
                    </span>
                    <span className="text-xs text-gray-500">{formatDate(entry.createdAt)}</span>
                  </div>
                  <p className="text-sm text-gray-700">
                    Por: <span className="font-medium">{entry.user.name}</span>
                  </p>
                  {entry.details && (
                    <div className="mt-2 bg-gray-50 rounded p-2">
                      <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                        {formatDetails(entry)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
