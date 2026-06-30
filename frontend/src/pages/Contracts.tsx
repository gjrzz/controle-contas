import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileText, Plus, Edit, Download, AlertTriangle, History } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { ContractForm } from '../components/ContractForm';
import { ContractHistory } from '../components/ContractHistory';
import type { Contract, ContractStatus } from '../types/contract';
import type { Company, ServiceType } from '../types/company';

export function Contracts() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [showHistory, setShowHistory] = useState<string | null>(null);

  // Filtros — inicializados a partir de query params
  const [filterCompany, setFilterCompany] = useState('');
  const [filterServiceType, setFilterServiceType] = useState('');
  const [filterStatus, setFilterStatus] = useState<ContractStatus | ''>(
    (searchParams.get('status') as ContractStatus) || ''
  );
  const [filterExpiring, setFilterExpiring] = useState(
    searchParams.get('expiringInDays') === '30'
  );

  const canEdit = user?.role === 'ADMIN' || user?.role === 'OPERADOR';

  const loadContracts = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterCompany) params.companyId = filterCompany;
      if (filterServiceType) params.serviceTypeId = filterServiceType;
      if (filterStatus) params.status = filterStatus;
      if (filterExpiring) params.expiringInDays = '30';

      const { data } = await api.get('/contracts', { params });
      setContracts(data);
    } catch (err) {
      console.error('Erro ao carregar contratos:', err);
    } finally {
      setLoading(false);
    }
  }, [filterCompany, filterServiceType, filterStatus, filterExpiring]);

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

  useEffect(() => {
    loadDependencies();
  }, [loadDependencies]);

  useEffect(() => {
    loadContracts();
  }, [loadContracts]);

  const handleFormClose = () => {
    setShowForm(false);
    setEditingContract(null);
  };

  const handleFormSuccess = () => {
    handleFormClose();
    loadContracts();
  };

  const handleDownload = async (contractId: string, files: string[]) => {
    if (files.length === 0) return;
    try {
      const response = await api.get(`/contracts/${contractId}/download-zip`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `contrato-${contractId}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Erro ao baixar arquivos');
    }
  };

  const isExpiringSoon = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && diffDays >= 0;
  };

  const formatCurrency = (value: string) => {
    return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const statusLabels: Record<ContractStatus, string> = {
    ATIVO: 'Ativo',
    ENCERRADO: 'Encerrado',
    SUSPENSO: 'Suspenso',
  };

  const statusColors: Record<ContractStatus, string> = {
    ATIVO: 'bg-green-100 text-green-800',
    ENCERRADO: 'bg-gray-100 text-gray-800',
    SUSPENSO: 'bg-yellow-100 text-yellow-800',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2" style={{ fontFamily: 'var(--font-heading)' }}>
          <FileText size={28} />
          Contratos
        </h2>
        {canEdit && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-[#57489c] hover:bg-[#57489c]/85 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            <Plus size={18} />
            Novo Contrato
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
              onChange={(e) => setFilterCompany(e.target.value)}
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
              onChange={(e) => setFilterServiceType(e.target.value)}
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
              onChange={(e) => setFilterStatus(e.target.value as ContractStatus | '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#57489c] focus:border-[#57489c] outline-none"
            >
              <option value="">Todos</option>
              <option value="ATIVO">Ativo</option>
              <option value="ENCERRADO">Encerrado</option>
              <option value="SUSPENSO">Suspenso</option>
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filterExpiring}
                onChange={(e) => setFilterExpiring(e.target.checked)}
                className="rounded border-gray-300 text-[#57489c] focus:ring-[#57489c]"
              />
              <span className="text-sm text-gray-700">Vencendo em 30 dias</span>
            </label>
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-[#57489c]/10 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#57489c]" />
          </div>
        ) : contracts.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Nenhum contrato encontrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#242424] border-b border-[#242424]">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-white">Nº Contrato</th>
                  <th className="text-left px-4 py-3 font-medium text-white">Empresa</th>
                  <th className="text-left px-4 py-3 font-medium text-white">Serviço</th>
                  <th className="text-right px-4 py-3 font-medium text-white">Valor Mensal</th>
                  <th className="text-center px-4 py-3 font-medium text-white">Vencimento</th>
                  <th className="text-center px-4 py-3 font-medium text-white">Dia Fatura</th>
                  <th className="text-center px-4 py-3 font-medium text-white">Status</th>
                  <th className="text-center px-4 py-3 font-medium text-white">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {contracts.map((contract) => (
                  <tr key={contract.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-gray-800">
                      <div className="flex items-center gap-1.5">
                        {isExpiringSoon(contract.endDate) && contract.status === 'ATIVO' && (
                          <span title="Vencendo em breve"><AlertTriangle size={14} className="text-orange-500" /></span>
                        )}
                        {contract.contractNumber}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{contract.company.name}</td>
                    <td className="px-4 py-3 text-gray-600">{contract.serviceType.name}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-800">
                      {formatCurrency(contract.monthlyValue)}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      {formatDate(contract.endDate)}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      Dia {contract.invoiceDueDay}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[contract.status]}`}>
                        {statusLabels[contract.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {canEdit && (
                          <button
                            onClick={() => { setEditingContract(contract); setShowForm(true); }}
                            className="p-1.5 text-gray-500 hover:text-[#57489c] hover:bg-white/70 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit size={16} />
                          </button>
                        )}
                        {contract.files && (contract.files as string[]).length > 0 && (
                          <button
                            onClick={() => handleDownload(contract.id, (contract.files as string[]) || [])}
                            className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Download contrato"
                          >
                            <Download size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => setShowHistory(contract.id)}
                          className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Histórico"
                        >
                          <History size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Formulário */}
      {showForm && (
        <ContractForm
          contract={editingContract}
          companies={companies}
          serviceTypes={serviceTypes}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Modal de Histórico */}
      {showHistory && (
        <ContractHistory
          contractId={showHistory}
          onClose={() => setShowHistory(null)}
        />
      )}
    </div>
  );
}
