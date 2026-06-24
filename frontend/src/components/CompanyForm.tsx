import { useState, type FormEvent } from 'react';
import { X, Plus } from 'lucide-react';
import api from '../services/api';
import { fetchAddress } from '../services/viaCep';
import { validateCNPJ } from '../utils/cnpj';
import { maskCNPJ, maskCEP, maskPhone, unmask } from '../utils/masks';
import type { Company } from '../types/company';
import type { ServiceType } from '../types/company';

interface CompanyFormProps {
  company: Company | null;
  serviceTypes: ServiceType[];
  onClose: () => void;
  onSuccess: () => void;
  onServiceTypeCreated: () => void;
}

export function CompanyForm({ company, serviceTypes, onClose, onSuccess, onServiceTypeCreated }: CompanyFormProps) {
  const isEditing = !!company;

  const [form, setForm] = useState({
    name: company?.name || '',
    cnpj: company ? maskCNPJ(company.cnpj) : '',
    serviceTypeId: company?.serviceTypeId || '',
    email: company?.email || '',
    phone: company ? maskPhone(company.phone) : '',
    cep: company ? maskCEP(company.cep) : '',
    street: company?.street || '',
    number: company?.number || '',
    complement: company?.complement || '',
    neighborhood: company?.neighborhood || '',
    city: company?.city || '',
    state: company?.state || '',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [showNewServiceType, setShowNewServiceType] = useState(false);
  const [newServiceTypeName, setNewServiceTypeName] = useState('');

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCNPJChange = (value: string) => {
    handleChange('cnpj', maskCNPJ(value));
  };

  const handlePhoneChange = (value: string) => {
    handleChange('phone', maskPhone(value));
  };

  const handleCEPChange = async (value: string) => {
    const masked = maskCEP(value);
    handleChange('cep', masked);

    const cleaned = unmask(value);
    if (cleaned.length === 8) {
      setCepLoading(true);
      const address = await fetchAddress(cleaned);
      if (address) {
        setForm((prev) => ({
          ...prev,
          cep: masked,
          street: address.logradouro,
          neighborhood: address.bairro,
          city: address.localidade,
          state: address.uf,
          complement: address.complemento || prev.complement,
        }));
      }
      setCepLoading(false);
    }
  };

  const handleCreateServiceType = async () => {
    if (!newServiceTypeName.trim()) return;
    try {
      await api.post('/service-types', { name: newServiceTypeName.trim() });
      onServiceTypeCreated();
      setNewServiceTypeName('');
      setShowNewServiceType(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao criar tipo de serviço');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // Validações
    if (!isEditing && !validateCNPJ(form.cnpj)) {
      setError('CNPJ inválido — verifique os dígitos');
      return;
    }

    if (!form.serviceTypeId) {
      setError('Selecione um tipo de serviço');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: form.name,
        cnpj: unmask(form.cnpj),
        serviceTypeId: form.serviceTypeId,
        email: form.email,
        phone: unmask(form.phone),
        cep: unmask(form.cep),
        street: form.street,
        number: form.number,
        complement: form.complement || undefined,
        neighborhood: form.neighborhood,
        city: form.city,
        state: form.state,
      };

      if (isEditing) {
        await api.put(`/companies/${company.id}`, payload);
      } else {
        await api.post('/companies', payload);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao salvar empresa');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">
            {isEditing ? 'Editar Empresa' : 'Nova Empresa'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Fechar">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Nome e CNPJ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Empresa *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#57489c] focus:border-[#57489c] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ *</label>
              <input
                type="text"
                value={form.cnpj}
                onChange={(e) => handleCNPJChange(e.target.value)}
                required
                disabled={isEditing}
                placeholder="00.000.000/0000-00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#57489c] focus:border-[#57489c] outline-none disabled:bg-gray-100"
              />
            </div>
          </div>

          {/* Tipo de Serviço */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Serviço *</label>
            <div className="flex gap-2">
              <select
                value={form.serviceTypeId}
                onChange={(e) => handleChange('serviceTypeId', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#57489c] focus:border-[#57489c] outline-none"
              >
                <option value="">Selecione...</option>
                {serviceTypes.map((st) => (
                  <option key={st.id} value={st.id}>{st.name}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowNewServiceType(!showNewServiceType)}
                className="px-3 py-2 text-[#57489c] hover:bg-white/70 border border-gray-300 rounded-lg transition-colors"
                title="Novo tipo"
              >
                <Plus size={18} />
              </button>
            </div>
            {showNewServiceType && (
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  value={newServiceTypeName}
                  onChange={(e) => setNewServiceTypeName(e.target.value)}
                  placeholder="Nome do novo tipo..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#57489c] focus:border-[#57489c] outline-none"
                />
                <button
                  type="button"
                  onClick={handleCreateServiceType}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors"
                >
                  Criar
                </button>
              </div>
            )}
          </div>

          {/* Contato */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#57489c] focus:border-[#57489c] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefone *</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                required
                placeholder="(00) 00000-0000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#57489c] focus:border-[#57489c] outline-none"
              />
            </div>
          </div>

          {/* Endereço */}
          <div className="border-t border-gray-200 pt-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Endereço</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">CEP *</label>
                <input
                  type="text"
                  value={form.cep}
                  onChange={(e) => handleCEPChange(e.target.value)}
                  required
                  placeholder="00000-000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#57489c] focus:border-[#57489c] outline-none"
                />
                {cepLoading && <p className="text-xs text-[#57489c] mt-1">Buscando endereço...</p>}
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">Logradouro *</label>
                <input
                  type="text"
                  value={form.street}
                  onChange={(e) => handleChange('street', e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#57489c] focus:border-[#57489c] outline-none"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Número *</label>
                <input
                  type="text"
                  value={form.number}
                  onChange={(e) => handleChange('number', e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#57489c] focus:border-[#57489c] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Complemento</label>
                <input
                  type="text"
                  value={form.complement}
                  onChange={(e) => handleChange('complement', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#57489c] focus:border-[#57489c] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Bairro *</label>
                <input
                  type="text"
                  value={form.neighborhood}
                  onChange={(e) => handleChange('neighborhood', e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#57489c] focus:border-[#57489c] outline-none"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Cidade *</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#57489c] focus:border-[#57489c] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">UF *</label>
                  <input
                    type="text"
                    value={form.state}
                    onChange={(e) => handleChange('state', e.target.value.toUpperCase())}
                    required
                    maxLength={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#57489c] focus:border-[#57489c] outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
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
              className="px-6 py-2 bg-[#57489c] hover:bg-[#57489c]/85 disabled:bg-[#57489c]/50 text-white font-medium rounded-lg transition-colors text-sm"
            >
              {loading ? 'Salvando...' : isEditing ? 'Salvar' : 'Cadastrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
