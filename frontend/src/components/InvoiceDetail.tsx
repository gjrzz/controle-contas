import { X } from 'lucide-react';
import type { Invoice } from '../types/invoice';

interface InvoiceDetailProps {
  invoice: Invoice;
  onClose: () => void;
}

const statusLabels: Record<string, string> = {
  PENDENTE: 'Pendente',
  EM_ANALISE: 'Em Análise',
  APROVADA: 'Aprovada',
  REJEITADA: 'Rejeitada',
  LIBERADA_FINANCEIRO: 'Liberada para Pagamento',
  PAGA: 'Paga',
};

export function InvoiceDetail({ invoice, onClose }: InvoiceDetailProps) {
  const formatCurrency = (value: string | number) =>
    Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const formatDate = (date: string | null) =>
    date ? new Date(date).toLocaleDateString('pt-BR') : '—';

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h3 className="text-lg font-semibold text-gray-800">
            Fatura #{invoice.invoiceNumber}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Fechar">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Info principal */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Empresa:</span>
              <p className="font-medium text-gray-800">{invoice.company.name}</p>
            </div>
            <div>
              <span className="text-gray-500">Contrato:</span>
              <p className="font-medium text-gray-800">{invoice.contract.contractNumber}</p>
            </div>
            <div>
              <span className="text-gray-500">Tipo de Serviço:</span>
              <p className="font-medium text-gray-800">{invoice.serviceType.name}</p>
            </div>
            <div>
              <span className="text-gray-500">Status:</span>
              <p className="font-medium text-gray-800">{statusLabels[invoice.status]}</p>
            </div>
            <div>
              <span className="text-gray-500">Competência:</span>
              <p className="font-medium text-gray-800">
                {months[invoice.competenceMonth - 1]}/{invoice.competenceYear}
              </p>
            </div>
            <div>
              <span className="text-gray-500">Praça:</span>
              <p className="font-medium text-gray-800">{invoice.serviceCity}/{invoice.serviceState}</p>
            </div>
            <div>
              <span className="text-gray-500">Data de Emissão:</span>
              <p className="font-medium text-gray-800">{formatDate(invoice.issueDate)}</p>
            </div>
            <div>
              <span className="text-gray-500">Data de Vencimento:</span>
              <p className="font-medium text-gray-800">{formatDate(invoice.dueDate)}</p>
            </div>
            <div>
              <span className="text-gray-500">Valor Total:</span>
              <p className="font-bold text-gray-800 text-lg">{formatCurrency(invoice.totalValue)}</p>
            </div>
            <div>
              <span className="text-gray-500">Valor Contrato (mensal):</span>
              <p className="font-medium text-gray-800">{formatCurrency(invoice.contract.monthlyValue)}</p>
            </div>
            {invoice.paymentDate && (
              <div>
                <span className="text-gray-500">Data de Pagamento:</span>
                <p className="font-medium text-green-700">{formatDate(invoice.paymentDate)}</p>
              </div>
            )}
          </div>

          {/* Descrição */}
          {invoice.description && (
            <div>
              <span className="text-sm text-gray-500">Descrição dos Serviços:</span>
              <p className="text-sm text-gray-700 mt-1">{invoice.description}</p>
            </div>
          )}

          {/* Justificativa */}
          {invoice.justification && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <span className="text-sm font-medium text-yellow-800">Justificativa de valor:</span>
              <p className="text-sm text-yellow-700 mt-1">{invoice.justification}</p>
            </div>
          )}

          {/* Motivo da Rejeição */}
          {invoice.rejectionReason && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <span className="text-sm font-medium text-red-800">Motivo da Rejeição:</span>
              <p className="text-sm text-red-700 mt-1">{invoice.rejectionReason}</p>
            </div>
          )}

          {/* Itens */}
          {invoice.items && invoice.items.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Itens da Fatura</p>
              <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                <thead className="bg-[#242424]">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-white">Descrição</th>
                    <th className="text-left px-3 py-2 font-medium text-white">Local</th>
                    <th className="text-right px-3 py-2 font-medium text-white">Valor Unit.</th>
                    <th className="text-right px-3 py-2 font-medium text-white">Qtd.</th>
                    <th className="text-right px-3 py-2 font-medium text-white">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoice.items.map((item, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-gray-700">{item.description}</td>
                      <td className="px-3 py-2 text-gray-500 text-xs">
                        {item.serviceCity ? `${item.serviceCity}/${item.serviceState}` : '—'}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-700">{formatCurrency(item.unitValue)}</td>
                      <td className="px-3 py-2 text-right text-gray-700">{Number(item.quantity)}</td>
                      <td className="px-3 py-2 text-right font-medium text-gray-800">{formatCurrency(item.totalValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
