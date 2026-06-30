import { useState, useEffect, type FormEvent } from 'react';
import { X, Upload, Plus, Trash2, AlertTriangle } from 'lucide-react';
import api from '../services/api';
import { SERVICE_CITIES } from '../utils/constants';
import type { Invoice, InvoiceItem, ValidationResult } from '../types/invoice';
import type { Company, ServiceType } from '../types/company';
import type { Contract } from '../types/contract';

interface InvoiceFormProps {
  invoice: Invoice | null;
  companies: Company[];
  serviceTypes: ServiceType[];
  onClose: () => void;
  onSuccess: () => void;
}

export function InvoiceForm({ invoice, companies, serviceTypes, onClose, onSuccess }: InvoiceFormProps) {
  const isEditing = !!invoice;

  const [form, setForm] = useState({
    companyId: invoice?.companyId || '',
    contractId: invoice?.contractId || '',
    serviceTypeId: invoice?.serviceTypeId || '',
    invoiceNumber: invoice?.invoiceNumber || '',
    issueDate: invoice ? invoice.issueDate.split('T')[0] : '',
    dueDate: invoice ? invoice.dueDate.split('T')[0] : '',
    competenceMonth: invoice?.competenceMonth?.toString() || '',
    competenceYear: invoice?.competenceYear?.toString() || new Date().getFullYear().toString(),
    serviceCity: invoice?.serviceCity || '',
    serviceState: invoice?.serviceState || '',
    description: invoice?.description || '',
    totalValue: invoice ? Number(invoice.totalValue).toString() : '',
    justification: invoice?.justification || '',
  });

  const [items, setItems] = useState<InvoiceItem[]>(
    invoice?.items?.map((i) => ({
      description: i.description,
      unitValue: Number(i.unitValue),
      quantity: Number(i.quantity),
      totalValue: Number(i.totalValue),
      serviceCity: i.serviceCity || '',
      serviceState: i.serviceState || '',
      serviceTypeId: i.serviceTypeId || '',
    })) || [{ description: '', unitValue: 0, quantity: 1, totalValue: 0, serviceCity: '', serviceState: '', serviceTypeId: '' }]
  );

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState('');

  // Carrega contratos da empresa selecionada
  useEffect(() => {
    if (!form.companyId) {
      setContracts([]);
      return;
    }
    api.get('/contracts', { params: { companyId: form.companyId, status: 'ATIVO' } })
      .then(({ data }) => setContracts(data))
      .catch(() => setContracts([]));
  }, [form.companyId]);

  // Ao selecionar contrato, herda tipo de serviço e descrição
  useEffect(() => {
    if (!form.contractId) return;
    const contract = contracts.find((c) => c.id === form.contractId);
    if (contract) {
      setForm((prev) => ({
        ...prev,
        serviceTypeId: contract.serviceTypeId,
        description: prev.description || contract.description || '',
      }));
    }
  }, [form.contractId, contracts]);

  // Valida valor ao mudar totalValue ou contrato
  useEffect(() => {
    if (!form.contractId || !form.totalValue) {
      setValidation(null);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const { data } = await api.post('/invoices/validate', {
          contractId: form.contractId,
          totalValue: form.totalValue,
          excludeInvoiceId: invoice?.id,
        });
        setValidation(data);
      } catch {
        setValidation(null);
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [form.contractId, form.totalValue, invoice?.id]);

  // Verifica duplicidade
  useEffect(() => {
    if (!form.companyId || !form.competenceMonth || !form.competenceYear) {
      setDuplicateWarning('');
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const { data } = await api.post('/invoices/check-duplicate', {
          companyId: form.companyId,
          competenceMonth: form.competenceMonth,
          competenceYear: form.competenceYear,
          excludeId: invoice?.id,
        });
        if (data.duplicate) {
          setDuplicateWarning(`Já existe fatura para esta empresa na competência ${form.competenceMonth}/${form.competenceYear}.`);
        } else {
          setDuplicateWarning('');
        }
      } catch {
        setDuplicateWarning('');
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [form.companyId, form.competenceMonth, form.competenceYear, invoice?.id]);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCompanyChange = (companyId: string) => {
    setForm((prev) => ({ ...prev, companyId, contractId: '' }));
  };

  // Items
  const addItem = () => {
    setItems([...items, { description: '', unitValue: 0, quantity: 1, totalValue: 0, serviceCity: '', serviceState: '', serviceTypeId: '' }]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const updated = { ...item, [field]: value };
        if (field === 'unitValue' || field === 'quantity') {
          updated.totalValue = Number((Number(updated.unitValue) * Number(updated.quantity)).toFixed(2));
        }
        return updated;
      })
    );
  };

  const itemsTotal = items.reduce((sum, item) => sum + Number(item.totalValue), 0);
  const totalMismatch = form.totalValue && Math.abs(itemsTotal - Number(form.totalValue)) > 0.01;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (totalMismatch) {
      setError(`Soma dos itens (R$ ${itemsTotal.toFixed(2)}) não confere com o valor total (R$ ${Number(form.totalValue).toFixed(2)}).`);
      return;
    }

    if (validation && !validation.valid && !form.justification) {
      setError('Valor diverge significativamente do contrato. Preencha a justificativa.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('companyId', form.companyId);
      formData.append('contractId', form.contractId);
      formData.append('serviceTypeId', form.serviceTypeId);
      formData.append('invoiceNumber', form.invoiceNumber);
      formData.append('issueDate', form.issueDate);
      formData.append('dueDate', form.dueDate);
      formData.append('competenceMonth', form.competenceMonth);
      formData.append('competenceYear', form.competenceYear);
      formData.append('serviceCity', form.serviceCity);
      formData.append('serviceState', form.serviceState);
      formData.append('totalValue', form.totalValue);
      formData.append('items', JSON.stringify(items));
      if (form.description) formData.append('description', form.description);
      if (form.justification) formData.append('justification', form.justification);
      for (const f of files) {
        formData.append('files', f);
      }

      if (isEditing) {
        await api.put(`/invoices/${invoice.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await api.post('/invoices', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao salvar fatura');
    } finally {
      setLoading(false);
    }
  };

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h3 className="text-lg font-semibold text-gray-800">
            {isEditing ? 'Editar Fatura' : 'Nova Fatura'}
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

          {/* Alertas de validação */}
          {validation && validation.alerts.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 text-orange-700 px-4 py-3 rounded-lg text-sm">
              <div className="flex items-center gap-2 mb-1 font-medium">
                <AlertTriangle size={16} />
                Alertas de validação
              </div>
              <ul className="list-disc pl-5 space-y-0.5">
                {validation.alerts.map((alert, i) => <li key={i}>{alert}</li>)}
              </ul>
            </div>
          )}

          {validation && !validation.valid && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              <div className="flex items-center gap-2 mb-1 font-medium">
                <AlertTriangle size={16} />
                Bloqueio — justificativa obrigatória
              </div>
              <ul className="list-disc pl-5 space-y-0.5">
                {validation.blocks.map((block, i) => <li key={i}>{block}</li>)}
              </ul>
            </div>
          )}

          {duplicateWarning && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
              <AlertTriangle size={16} />
              {duplicateWarning}
            </div>
          )}

          {/* Empresa e Contrato */}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Contrato *</label>
              <select
                value={form.contractId}
                onChange={(e) => handleChange('contractId', e.target.value)}
                required
                disabled={!form.companyId}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#57489c] focus:border-[#57489c] outline-none disabled:bg-gray-100"
              >
                <option value="">Selecione...</option>
                {contracts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.contractNumber} — {Number(c.monthlyValue).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/mês
                  </option>
                ))}
              </select>
              {validation?.contractValue && (
                <p className="text-xs text-gray-500 mt-1">
                  Valor contrato: {validation.contractValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  {validation.lastPaidValue && (
                    <> | Última paga: {validation.lastPaidValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</>
                  )}
                </p>
              )}
            </div>
          </div>

          {/* Tipo de serviço e NF */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Número da NF *</label>
              <input
                type="text"
                value={form.invoiceNumber}
                onChange={(e) => handleChange('invoiceNumber', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#57489c] focus:border-[#57489c] outline-none"
              />
            </div>
          </div>

          {/* Datas e Competência */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Emissão *</label>
              <input
                type="date"
                value={form.issueDate}
                onChange={(e) => handleChange('issueDate', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#57489c] focus:border-[#57489c] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Vencimento *</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => handleChange('dueDate', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#57489c] focus:border-[#57489c] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mês Competência *</label>
              <select
                value={form.competenceMonth}
                onChange={(e) => handleChange('competenceMonth', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#57489c] focus:border-[#57489c] outline-none"
              >
                <option value="">Mês</option>
                {months.map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ano Competência *</label>
              <input
                type="number"
                min="2020"
                max="2100"
                value={form.competenceYear}
                onChange={(e) => handleChange('competenceYear', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#57489c] focus:border-[#57489c] outline-none"
              />
            </div>
          </div>

          {/* Praça */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Praça de Prestação *</label>
            <select
              value={form.serviceCity ? `${form.serviceCity}|${form.serviceState}` : ''}
              onChange={(e) => {
                const [city, state] = e.target.value.split('|');
                setForm(prev => ({ ...prev, serviceCity: city || '', serviceState: state || '' }));
              }}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#57489c] focus:border-[#57489c] outline-none"
            >
              <option value="">Selecione...</option>
              {SERVICE_CITIES.map((c) => (
                <option key={`${c.city}-${c.state}`} value={`${c.city}|${c.state}`}>{c.city}/{c.state}</option>
              ))}
            </select>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição dos Serviços</label>
            <textarea
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#57489c] focus:border-[#57489c] outline-none resize-none"
            />
          </div>

          {/* Itens da Fatura */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-700">Itens da Fatura *</p>
              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-1 text-sm text-[#57489c] hover:text-[#57489c]"
              >
                <Plus size={14} />
                Adicionar item
              </button>
            </div>

            <div className="space-y-2">
              {items.map((item, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-3 space-y-2">
                  <div className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5">
                      {index === 0 && <label className="block text-xs text-gray-500 mb-1">Descrição</label>}
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        required
                        placeholder="Descrição do item"
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-[#57489c] outline-none"
                      />
                    </div>
                    <div className="col-span-2">
                      {index === 0 && <label className="block text-xs text-gray-500 mb-1">Valor Unit.</label>}
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unitValue || ''}
                        onChange={(e) => updateItem(index, 'unitValue', Number(e.target.value))}
                        required
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-[#57489c] outline-none"
                      />
                    </div>
                    <div className="col-span-2">
                      {index === 0 && <label className="block text-xs text-gray-500 mb-1">Qtd.</label>}
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.quantity || ''}
                        onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                        required
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-[#57489c] outline-none"
                      />
                    </div>
                    <div className="col-span-2">
                      {index === 0 && <label className="block text-xs text-gray-500 mb-1">Subtotal</label>}
                      <input
                        type="text"
                        value={Number(item.totalValue).toFixed(2)}
                        disabled
                        className="w-full px-2 py-1.5 border border-gray-200 bg-gray-50 rounded text-sm text-gray-600"
                      />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Localidade e Tipo do item */}
                  <div className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-4">
                      <label className="block text-xs text-gray-400 mb-0.5">Praça (opcional)</label>
                      <select
                        value={item.serviceCity ? `${item.serviceCity}|${item.serviceState}` : ''}
                        onChange={(e) => {
                          const [city, state] = e.target.value.split('|');
                          updateItem(index, 'serviceCity', city || '');
                          updateItem(index, 'serviceState', state || '');
                        }}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-[#57489c] outline-none"
                      >
                        <option value="">—</option>
                        {SERVICE_CITIES.map((c) => (
                          <option key={`${c.city}-${c.state}`} value={`${c.city}|${c.state}`}>{c.city}/{c.state}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-3">
                      <label className="block text-xs text-gray-400 mb-0.5">Tipo de Serviço</label>
                      <select
                        value={item.serviceTypeId || ''}
                        onChange={(e) => updateItem(index, 'serviceTypeId', e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-[#57489c] outline-none"
                      >
                        <option value="">—</option>
                        {serviceTypes.map((st) => (
                          <option key={st.id} value={st.id}>{st.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-5"></div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end mt-3 text-sm">
              <span className="text-gray-600">
                Soma dos itens: <span className={`font-medium ${totalMismatch ? 'text-red-600' : 'text-gray-800'}`}>
                  R$ {itemsTotal.toFixed(2)}
                </span>
              </span>
            </div>
          </div>

          {/* Valor total */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor Total (R$) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.totalValue}
                onChange={(e) => handleChange('totalValue', e.target.value)}
                required
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#57489c] outline-none ${
                  totalMismatch ? 'border-red-400 bg-red-50' : 'border-gray-300'
                }`}
              />
              {totalMismatch && (
                <p className="text-xs text-red-600 mt-1">
                  Valor não confere com a soma dos itens (R$ {itemsTotal.toFixed(2)})
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Upload NF (PDF)</label>
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
            </div>
          </div>

          {/* Justificativa (quando valor diverge >30%) */}
          {validation && !validation.valid && (
            <div>
              <label className="block text-sm font-medium text-red-700 mb-1">Justificativa (obrigatória) *</label>
              <textarea
                value={form.justification}
                onChange={(e) => handleChange('justification', e.target.value)}
                rows={2}
                required
                placeholder="Explique a divergência de valor..."
                className="w-full px-3 py-2 border border-red-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none resize-none"
              />
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
