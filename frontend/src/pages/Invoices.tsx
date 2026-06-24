import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle, Plus, Edit, Download, History, AlertTriangle, Eye } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { InvoiceForm } from '../components/InvoiceForm';
import { InvoiceDetail } from '../components/InvoiceDetail';
import { InvoiceHistory } from '../components/InvoiceHistory';
import { StatusTransitionModal } from '../components/StatusTransitionModal';
import type { Invoice, InvoiceStatus, InvoicePaginatedResponse } from '../types/invoice';
import type { Company, ServiceType } from '../types/company';

const statusLabels: Record<InvoiceStatus, string> = {
  PENDENTE: 'Pendente',
  EM_ANALISE: 'Em Análise',
  APROVADA: 'Aprovada',
  REJEITADA: 'Rejeitada',
  LIBERADA_FINANCEIRO: 'Liberada',
  PAGA: 'Paga',
};

const statusColors: Record<InvoiceStatus, string> = {
  PENDENTE: 'bg-yellow-100 text-yellow-800',
  EM_ANALISE: 'bg-blue-100 text-blue-800',
  APROVADA: 'bg-green-100 text-green-800',
  REJEITADA: 'bg-red-100 text-red-800',
  LIBERADA_FINANCEIRO: 'bg-purple-100 text-purple-800',
  PAGA: 'bg-gray-100 text-gray-800',
};

export function Invoices() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Modais
  const [showForm, setShowForm] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [showHistory, setShowHistory] = useState<string | null>(null);
  const [transitionInvoice, setTransitionInvoice] = useState<Invoice | null>(null);
  const [transitionAction, setTransitionAction] = useState<InvoiceStatus | null>(null);

  // Filtros — inicializados a partir de query params
  const [filterCompany, setFilterCompany] = useState(searchParams.get('companyId') || '');
  const [filterServiceType, setFilterServiceType] = useState('');
  const [filterStatus, setFilterStatus] = useState<InvoiceStatus | 'VENCIDAS' | ''>(
    (searchParams.get('status') as InvoiceStatus | 'VENCIDAS') || ''
  );
  const [filterCompetenceMonth, setFilterCompetenceMonth] = useState('');
  const [filterCompetenceYear, setFilterCompetenceYear] = useState('');

  const canCreate = user?.role === 'ADMIN' || user?.role === 'OPERADOR';

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 15 };
      if (filterCompany) params.companyId = filterCompany;
      if (filterServiceType) params.serviceTypeId = filterServiceType;
      if (filterStatus && filterStatus !== 'VENCIDAS') params.status = filterStatus;
      if (filterStatus === 'VENCIDAS') params.overdue = 'true';
      if (filterCompetenceMonth) params.competenceMonth = filterCompetenceMonth;
      if (filterCompetenceYear) params.competenceYear = filterCompetenceYear;

      const { data } = await api.get<InvoicePaginatedResponse>('/invoices', { params });
      setInvoices(data.data);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch (err) {
      console.error('Erro ao carregar faturas:', err);
    } finally {
      setLoading(false);
    }
  }, [page, filterCompany, filterServiceType, filterStatus, filterCompetenceMonth, filterCompetenceYear]);

  const loadDependencies = useCallback(async () => {
    try {
      const [companiesRes, typesRes] = await Promise.all([
        api.get('/companies'),
        api.get('/service-types'),
      ]);
      setCompanies(companiesRes.data);
      setServiceTypes(typesRes.data);
    } catch (err) {
      console.error('Erro ao carregar dependências:', err);
    }
  }, []);

  useEffect(() => { loadDependencies(); }, [loadDependencies]);
  useEffect(() => { loadInvoices(); }, [loadInvoices]);

  const handleDownload = async (invoice: Invoice) => {
    try {
      const response = await api.get(`/invoices/${invoice.id}/file`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `fatura-${invoice.invoiceNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Arquivo não encontrado');
    }
  };

  const isDueSoon = (dueDate: string, status: InvoiceStatus) => {
    if (status === 'PAGA' || status === 'REJEITADA') return false;
    const due = new Date(dueDate);
    const now = new Date();
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 5 && diffDays >= 0;
  };

  const isOverdue = (dueDate: string, status: InvoiceStatus) => {
    if (status === 'PAGA' || status === 'REJEITADA') return false;
    return new Date(dueDate) < new Date();
  };

  const getValueDivergence = (invoice: Invoice) => {
    const invoiceValue = Number(invoice.totalValue);
    const contractValue = Number(invoice.contract.monthlyValue);
    if (!contractValue) return 0;
    return Math.abs(invoiceValue - contractValue) / contractValue;
  };

  const formatCurrency = (value: string | number) => {
    return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  // Ações contextuais por perfil
  const getActions = (invoice: Invoice) => {
    const actions: { label: string; status: InvoiceStatus; color: string }[] = [];
    const role = user?.role;

    if (role === 'APROVADOR' || role === 'ADMIN') {
      if (invoice.status === 'PENDENTE') {
        actions.push({ label: 'Iniciar Análise', status: 'EM_ANALISE', color: 'text-[#57489c] hover:bg-white/70' });
      }
      if (invoice.status === 'EM_ANALISE') {
        actions.push({ label: 'Aprovar', status: 'APROVADA', color: 'text-green-600 hover:bg-green-50' });
        actions.push({ label: 'Rejeitar', status: 'REJEITADA', color: 'text-red-600 hover:bg-red-50' });
      }
    }
    if (role === 'FINANCEIRO' || role === 'ADMIN') {
      if (invoice.status === 'APROVADA') {
        actions.push({ label: 'Liberar Pagamento', status: 'LIBERADA_FINANCEIRO', color: 'text-purple-600 hover:bg-purple-50' });
      }
      if (invoice.status === 'LIBERADA_FINANCEIRO') {
        actions.push({ label: 'Confirmar Pagamento', status: 'PAGA', color: 'text-gray-600 hover:bg-gray-100' });
      }
    }
    return actions;
  };

  const handleTransition = (invoice: Invoice, status: InvoiceStatus) => {
    setTransitionInvoice(invoice);
    setTransitionAction(status);
  };

  const handleTransitionSuccess = () => {
    setTransitionInvoice(null);
    setTransitionAction(null);
    loadInvoices();
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingInvoice(null);
    loadInvoices();
  };

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2" style={{ fontFamily: 'var(--font-heading)' }}>
          <CheckCircle size={28} />
          Faturas
          <span className="text-sm font-normal text-gray-500 ml-2">({total} registros)</span>
        </h2>
        {canCreate && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-[#57489c] hover:bg-[#57489c]/85 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            <Plus size={18} />
            Nova Fatura
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-[#57489c]/10 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Empresa</label>
            <select
              value={filterCompany}
              onChange={(e) => { setFilterCompany(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#57489c] focus:border-[#57489c] outline-none"
            >
              <option value="">Todas</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Tipo de Serviço</label>
            <select
              value={filterServiceType}
              onChange={(e) => { setFilterServiceType(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#57489c] focus:border-[#57489c] outline-none"
            >
              <option value="">Todos</option>
              {serviceTypes.map((st) => (
                <option key={st.id} value={st.id}>{st.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value as InvoiceStatus | 'VENCIDAS' | ''); setPage(1); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#57489c] focus:border-[#57489c] outline-none"
            >
              <option value="">Todos</option>
              <option value="VENCIDAS">Vencidas (não pagas)</option>
              {Object.entries(statusLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Competência Mês</label>
            <select
              value={filterCompetenceMonth}
              onChange={(e) => { setFilterCompetenceMonth(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#57489c] focus:border-[#57489c] outline-none"
            >
              <option value="">Todos</option>
              {months.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Competência Ano</label>
            <input
              type="number"
              min="2020"
              max="2100"
              value={filterCompetenceYear}
              onChange={(e) => { setFilterCompetenceYear(e.target.value); setPage(1); }}
              placeholder="2026"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#57489c] focus:border-[#57489c] outline-none"
            />
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-[#57489c]/10 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#57489c]" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-12 text-gray-500">Nenhuma fatura encontrada.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#242424] border-b border-[#242424]">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-white">NF</th>
                  <th className="text-left px-4 py-3 font-medium text-white">Empresa</th>
                  <th className="text-left px-4 py-3 font-medium text-white">Competência</th>
                  <th className="text-right px-4 py-3 font-medium text-white">Valor</th>
                  <th className="text-right px-4 py-3 font-medium text-white">Contrato</th>
                  <th className="text-center px-4 py-3 font-medium text-white">Vencimento</th>
                  <th className="text-center px-4 py-3 font-medium text-white">Status</th>
                  <th className="text-center px-4 py-3 font-medium text-white">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map((invoice) => {
                  const divergence = getValueDivergence(invoice);
                  const dueSoon = isDueSoon(invoice.dueDate, invoice.status);
                  const overdue = isOverdue(invoice.dueDate, invoice.status);
                  const actions = getActions(invoice);

                  return (
                    <tr key={invoice.id} className={`hover:bg-gray-50 ${overdue ? 'bg-red-50/50' : ''}`}>
                      <td className="px-4 py-3 font-mono text-xs font-medium text-gray-800">
                        <div className="flex items-center gap-1.5">
                          {(dueSoon || overdue) && (
                            <span title={overdue ? 'Vencida' : 'Vence em breve'}>
                              <AlertTriangle size={14} className={overdue ? 'text-red-500' : 'text-orange-500'} />
                            </span>
                          )}
                          {invoice.invoiceNumber}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{invoice.company.name}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {months[invoice.competenceMonth - 1]?.slice(0, 3)}/{invoice.competenceYear}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-800">
                        <div className="flex items-center justify-end gap-1">
                          {divergence > 0.1 && (
                            <span title="Valor diverge do contrato">
                              <AlertTriangle size={12} className={divergence > 0.3 ? 'text-red-500' : 'text-orange-400'} />
                            </span>
                          )}
                          {formatCurrency(invoice.totalValue)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500 text-xs">
                        {formatCurrency(invoice.contract.monthlyValue)}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">
                        {formatDate(invoice.dueDate)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[invoice.status]}`}>
                          {statusLabels[invoice.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1 flex-wrap">
                          <button
                            onClick={() => setViewingInvoice(invoice)}
                            className="p-1.5 text-gray-500 hover:text-[#57489c] hover:bg-white/70 rounded-lg transition-colors"
                            title="Ver detalhes"
                          >
                            <Eye size={15} />
                          </button>
                          {canCreate && invoice.status === 'PENDENTE' && (
                            <button
                              onClick={() => { setEditingInvoice(invoice); setShowForm(true); }}
                              className="p-1.5 text-gray-500 hover:text-[#57489c] hover:bg-white/70 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Edit size={15} />
                            </button>
                          )}
                          {invoice.filePath && (
                            <button
                              onClick={() => handleDownload(invoice)}
                              className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Download"
                            >
                              <Download size={15} />
                            </button>
                          )}
                          <button
                            onClick={() => setShowHistory(invoice.id)}
                            className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Histórico"
                          >
                            <History size={15} />
                          </button>
                          {actions.map((action) => (
                            <button
                              key={action.status}
                              onClick={() => handleTransition(invoice, action.status)}
                              className={`px-2 py-1 text-xs font-medium rounded-lg transition-colors ${action.color}`}
                            >
                              {action.label}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-600">
              Página {page} de {totalPages} ({total} total)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-white transition-colors"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-white transition-colors"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modais */}
      {showForm && (
        <InvoiceForm
          invoice={editingInvoice}
          companies={companies}
          serviceTypes={serviceTypes}
          onClose={() => { setShowForm(false); setEditingInvoice(null); }}
          onSuccess={handleFormSuccess}
        />
      )}

      {viewingInvoice && (
        <InvoiceDetail
          invoice={viewingInvoice}
          onClose={() => setViewingInvoice(null)}
        />
      )}

      {showHistory && (
        <InvoiceHistory
          invoiceId={showHistory}
          onClose={() => setShowHistory(null)}
        />
      )}

      {transitionInvoice && transitionAction && (
        <StatusTransitionModal
          invoice={transitionInvoice}
          targetStatus={transitionAction}
          onClose={() => { setTransitionInvoice(null); setTransitionAction(null); }}
          onSuccess={handleTransitionSuccess}
        />
      )}
    </div>
  );
}
