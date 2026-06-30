import { useState, useEffect, useCallback } from 'react';
import { Building2, Plus, Search, Edit, Power } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { CompanyForm } from '../components/CompanyForm';
import { maskCNPJ, maskPhone } from '../utils/masks';
import type { Company, CompanyStatus } from '../types/company';
import type { ServiceType } from '../types/company';

export function Companies() {
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);

  // Filtros
  const [filterName, setFilterName] = useState('');
  const [filterCnpj, setFilterCnpj] = useState('');
  const [filterServiceType, setFilterServiceType] = useState('');
  const [filterStatus, setFilterStatus] = useState<CompanyStatus | ''>('');

  const canEdit = user?.role === 'ADMIN' || user?.role === 'OPERADOR';

  const loadCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterName) params.name = filterName;
      if (filterCnpj) params.cnpj = filterCnpj;
      if (filterServiceType) params.serviceTypeId = filterServiceType;
      if (filterStatus) params.status = filterStatus;

      const { data } = await api.get('/companies', { params });
      setCompanies(data);
    } catch (err) {
      console.error('Erro ao carregar empresas:', err);
    } finally {
      setLoading(false);
    }
  }, [filterName, filterCnpj, filterServiceType, filterStatus]);

  const loadServiceTypes = useCallback(async () => {
    try {
      const { data } = await api.get('/service-types');
      setServiceTypes(data);
    } catch (err) {
      console.error('Erro ao carregar tipos de serviço:', err);
    }
  }, []);

  useEffect(() => {
    loadServiceTypes();
  }, [loadServiceTypes]);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  const handleToggleStatus = async (id: string) => {
    try {
      await api.patch(`/companies/${id}/toggle-status`);
      success('Status alterado com sucesso');
      loadCompanies();
    } catch (err) {
      console.error('Erro ao alterar status:', err);
      showError('Erro ao alterar status');
    }
  };

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingCompany(null);
  };

  const handleFormSuccess = () => {
    success(editingCompany ? 'Empresa atualizada' : 'Empresa cadastrada com sucesso');
    handleFormClose();
    loadCompanies();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2" style={{ fontFamily: 'var(--font-heading)' }}>
          <Building2 size={28} />
          Empresas
        </h2>
        {canEdit && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-[#57489c] hover:bg-[#57489c]/85 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            <Plus size={18} />
            Nova Empresa
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-[#57489c]/10 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Nome</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                placeholder="Buscar por nome..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#57489c] focus:border-[#57489c] outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">CNPJ</label>
            <input
              type="text"
              value={filterCnpj}
              onChange={(e) => setFilterCnpj(e.target.value)}
              placeholder="00.000.000/0000-00"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#57489c] focus:border-[#57489c] outline-none"
            />
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
              onChange={(e) => setFilterStatus(e.target.value as CompanyStatus | '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#57489c] focus:border-[#57489c] outline-none"
            >
              <option value="">Todos</option>
              <option value="ATIVA">Ativa</option>
              <option value="INATIVA">Inativa</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-[#57489c]/10 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#57489c]" />
          </div>
        ) : companies.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Nenhuma empresa encontrada.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#242424] border-b border-[#242424]">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-white">Nome</th>
                  <th className="text-left px-4 py-3 font-medium text-white">CNPJ</th>
                  <th className="text-left px-4 py-3 font-medium text-white">Tipo de Serviço</th>
                  <th className="text-left px-4 py-3 font-medium text-white">Telefone</th>
                  <th className="text-left px-4 py-3 font-medium text-white">Cidade/UF</th>
                  <th className="text-center px-4 py-3 font-medium text-white">Status</th>
                  {canEdit && <th className="text-center px-4 py-3 font-medium text-white">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {companies.map((company) => (
                  <tr key={company.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{company.name}</td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">{maskCNPJ(company.cnpj)}</td>
                    <td className="px-4 py-3 text-gray-600">{company.serviceType.name}</td>
                    <td className="px-4 py-3 text-gray-600">{maskPhone(company.phone)}</td>
                    <td className="px-4 py-3 text-gray-600">{company.city}/{company.state}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        company.status === 'ATIVA'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {company.status === 'ATIVA' ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleEdit(company)}
                            className="p-1.5 text-gray-500 hover:text-[#57489c] hover:bg-white/70 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(company.id)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              company.status === 'ATIVA'
                                ? 'text-gray-500 hover:text-red-600 hover:bg-red-50'
                                : 'text-gray-500 hover:text-green-600 hover:bg-green-50'
                            }`}
                            title={company.status === 'ATIVA' ? 'Inativar' : 'Ativar'}
                          >
                            <Power size={16} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Formulário */}
      {showForm && (
        <CompanyForm
          company={editingCompany}
          serviceTypes={serviceTypes}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
          onServiceTypeCreated={loadServiceTypes}
        />
      )}
    </div>
  );
}
