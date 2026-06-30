import { useState, type FormEvent } from 'react';
import { X, Upload } from 'lucide-react';
import api from '../services/api';
import type { Contract } from '../types/contract';
import type { Company, ServiceType } from '../types/company';

interface ContractFormProps {
  contract: Contract | null;
  companies: Company[];
  serviceTypes: ServiceType[];
  onClose: () => void;
  onSuccess: () => void;
}

export function ContractForm({ contract, companies, serviceTypes, onClose, onSuccess }: ContractFormProps) {
  const isEditing = !!contract;

  const [form, setForm] = useState({
    companyId: contract?.companyId || '',
    serviceTypeId: contract?.serviceTypeId || '',
    contractNumber: contract?.contractNumber || '',
    monthlyValue: contract ? Number(contract.monthlyValue).toString() : '',
    startDate: contract ? contract.startDate.split('T')[0] : '',
    endDate: contract ? contract.endDate.split('T')[0] : '',
    invoiceDueDay: contract?.invoiceDueDay?.toString() || '',
    description: contract?.description || '',
    status: contract?.status || 'ATIVO',
  });

  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // Ao selecionar empresa, herda o tipo de serviço
  const handleCompanyChange = (companyId: string) => {
    handleChange('companyId', companyId);
    const company = companies.find((c) => c.id === companyId);
    if (company) {
      handleChange('serviceTypeId', company.serviceTypeId);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('companyId', form.companyId);
      formData.append('serviceTypeId', form.serviceTypeId);
      formData.append('contractNumber', form.contractNumber);
      formData.append('monthlyValue', form.monthlyValue);
      formData.append('startDate', form.startDate);
      formData.append('endDate', form.endDate);
      formData.append('invoiceDueDay', form.invoiceDueDay);
      if (form.description) formData.append('description', form.description);
      if (isEditing) formData.append('status', form.status);
      for (const f of files) {
        formData.append('files', f);
      }

      if (isEditing) {
        await api.put(`/contracts/${contract.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await api.post('/contracts', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao salvar contrato');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">
            {isEditing ? 'Editar Contrato' : 'Novo Contrato'}
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

          {/* Empresa e Tipo de Serviço */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Empresa *</label>
              <select
                value={form.companyId}
                onChange={(e) => handleCompanyChange(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#57489c] focus:border-[#57489c] outline-none"
              >
                <option value="">Selecione...</option>
                {companies.filter((c) => c.status === 'ATIVA').map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Serviço *</label>
              <select
                value={form.serviceTypeId}
                onChange={(e) => handleChange('serviceTypeId', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#57489c] focus:border-[#57489c] outline-none"
              >
                <option value="">Selecione...</option>
                {serviceTypes.map((st) => (
                  <option key={st.id} value={st.id}>{st.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Número e Valor */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Número do Contrato *</label>
              <input
                type="text"
                value={form.contractNumber}
                onChange={(e) => handleChange('contractNumber', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#57489c] focus:border-[#57489c] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor Mensal (R$) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.monthlyValue}
                onChange={(e) => handleChange('monthlyValue', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#57489c] focus:border-[#57489c] outline-none"
              />
            </div>
          </div>

          {/* Datas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data de Início *</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => handleChange('startDate', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#57489c] focus:border-[#57489c] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data de Vencimento *</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => handleChange('endDate', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#57489c] focus:border-[#57489c] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dia Vencimento Fatura *</label>
              <input
                type="number"
                min="1"
                max="31"
                value={form.invoiceDueDay}
                onChange={(e) => handleChange('invoiceDueDay', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#57489c] focus:border-[#57489c] outline-none"
              />
            </div>
          </div>



          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição / Observações</label>
            <textarea
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#57489c] focus:border-[#57489c] outline-none resize-none"
            />
          </div>

          {/* Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Arquivo do Contrato (PDF)</label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors text-sm text-gray-700">
                <Upload size={16} />
                {files.length > 0 ? `${files.length} arquivo(s)` : 'Selecionar arquivos'}
                <input
                  type="file"
                  accept="application/pdf"
                  multiple
                  onChange={(e) => setFiles(Array.from(e.target.files || []))}
                  className="hidden"
                />
              </label>
              {contract?.files && (contract.files as string[]).length > 0 && !files.length && (
                <span className="text-xs text-green-600">{(contract.files as string[]).length} arquivo(s) anexado(s)</span>
              )}
            </div>
          </div>

          {/* Status (apenas edição) */}
          {isEditing && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#57489c] focus:border-[#57489c] outline-none"
              >
                <option value="ATIVO">Ativo</option>
                <option value="ENCERRADO">Encerrado</option>
                <option value="SUSPENSO">Suspenso</option>
              </select>
            </div>
          )}

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
