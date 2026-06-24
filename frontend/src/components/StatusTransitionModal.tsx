import { useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import api from '../services/api';
import type { Invoice, InvoiceStatus } from '../types/invoice';

interface StatusTransitionModalProps {
  invoice: Invoice;
  targetStatus: InvoiceStatus;
  onClose: () => void;
  onSuccess: () => void;
}

const statusLabels: Record<InvoiceStatus, string> = {
  PENDENTE: 'Pendente',
  EM_ANALISE: 'Em Análise',
  APROVADA: 'Aprovada',
  REJEITADA: 'Rejeitada',
  LIBERADA_FINANCEIRO: 'Liberada para Pagamento',
  PAGA: 'Paga',
};

export function StatusTransitionModal({ invoice, targetStatus, onClose, onSuccess }: StatusTransitionModalProps) {
  const [rejectionReason, setRejectionReason] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const needsRejectionReason = targetStatus === 'REJEITADA';
  const needsPaymentDate = targetStatus === 'PAGA';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (needsRejectionReason && !rejectionReason.trim()) {
      setError('Informe o motivo da rejeição');
      return;
    }
    if (needsPaymentDate && !paymentDate) {
      setError('Informe a data de pagamento');
      return;
    }

    setLoading(true);
    try {
      await api.patch(`/invoices/${invoice.id}/status`, {
        status: targetStatus,
        rejectionReason: needsRejectionReason ? rejectionReason : undefined,
        paymentDate: needsPaymentDate ? paymentDate : undefined,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao atualizar status');
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = () => {
    if (targetStatus === 'REJEITADA') return 'bg-red-600 hover:bg-red-700';
    if (targetStatus === 'PAGA') return 'bg-gray-700 hover:bg-gray-800';
    if (targetStatus === 'APROVADA') return 'bg-green-600 hover:bg-green-700';
    return 'bg-[#57489c] hover:bg-[#57489c]/85';
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">
            Confirmar Ação
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Fechar">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="text-sm text-gray-700">
            <p>
              Mover fatura <span className="font-medium">#{invoice.invoiceNumber}</span> de{' '}
              <span className="font-medium">{statusLabels[invoice.status]}</span> para{' '}
              <span className="font-medium">{statusLabels[targetStatus]}</span>?
            </p>
            <p className="text-gray-500 mt-1">
              Empresa: {invoice.company.name} | Valor: {Number(invoice.totalValue).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>

          {needsRejectionReason && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Motivo da Rejeição *</label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                required
                placeholder="Descreva o motivo da rejeição..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none resize-none"
              />
            </div>
          )}

          {needsPaymentDate && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data de Pagamento *</label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#57489c] outline-none"
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 border border-gray-300 rounded-lg transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-6 py-2 text-white font-medium rounded-lg transition-colors text-sm disabled:opacity-50 ${getActionColor()}`}
            >
              {loading ? 'Processando...' : 'Confirmar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
