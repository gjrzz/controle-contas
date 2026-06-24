import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar,
} from 'recharts';
import { BarChart3, TrendingUp, AlertTriangle, FileText, DollarSign, Clock } from 'lucide-react';
import api from '../services/api';
import type { Company, ServiceType } from '../types/company';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'];

interface Summary {
  totalMonth: number;
  totalYear: number;
  pendingCount: number;
  pendingValue: number;
  overdueCount: number;
  overdueValue: number;
  activeContracts: number;
  expiringContracts: number;
}

interface MonthlyData {
  month: number;
  label: string;
  previsto: number;
  realizado: number;
}

interface ServiceTypeData {
  name: string;
  value: number;
  percentage: number;
}

interface CompanyData {
  name: string;
  value: number;
}

interface StackedData {
  data: Record<string, number | string>[];
  serviceTypes: string[];
}

interface TopInvoice {
  id: string;
  invoiceNumber: string;
  totalValue: string;
  competenceMonth: number;
  competenceYear: number;
  paymentDate: string;
  company: { name: string };
  serviceType: { name: string };
}

type PeriodType = 'month' | 'quarter' | 'year' | 'custom';

export function Dashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [serviceTypeData, setServiceTypeData] = useState<ServiceTypeData[]>([]);
  const [companyData, setCompanyData] = useState<CompanyData[]>([]);
  const [stackedData, setStackedData] = useState<StackedData>({ data: [], serviceTypes: [] });
  const [topInvoices, setTopInvoices] = useState<TopInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [period, setPeriod] = useState<PeriodType>('year');
  const [filterCompany, setFilterCompany] = useState('');
  const [filterServiceType, setFilterServiceType] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const getDateRange = useCallback(() => {
    const now = new Date();
    let startDate: string;
    let endDate: string;

    switch (period) {
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
        break;
      case 'quarter': {
        const qStart = Math.floor(now.getMonth() / 3) * 3;
        startDate = new Date(now.getFullYear(), qStart, 1).toISOString();
        endDate = new Date(now.getFullYear(), qStart + 3, 0).toISOString();
        break;
      }
      case 'custom':
        startDate = customStart || new Date(now.getFullYear(), 0, 1).toISOString();
        endDate = customEnd || new Date(now.getFullYear(), 11, 31).toISOString();
        break;
      default: // year
        startDate = new Date(now.getFullYear(), 0, 1).toISOString();
        endDate = new Date(now.getFullYear(), 11, 31).toISOString();
    }
    return { startDate, endDate };
  }, [period, customStart, customEnd]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { startDate, endDate } = getDateRange();
    const params: Record<string, string> = { startDate, endDate };
    if (filterCompany) params.companyId = filterCompany;
    if (filterServiceType) params.serviceTypeId = filterServiceType;

    try {
      const [summaryRes, monthlyRes, serviceRes, companyRes, stackedRes, topRes] = await Promise.all([
        api.get('/dashboard/summary', { params }),
        api.get('/dashboard/monthly-evolution', { params }),
        api.get('/dashboard/by-service-type', { params }),
        api.get('/dashboard/by-company', { params }),
        api.get('/dashboard/stacked-evolution', { params }),
        api.get('/dashboard/top-invoices', { params }),
      ]);

      setSummary(summaryRes.data);
      setMonthlyData(monthlyRes.data);
      setServiceTypeData(serviceRes.data);
      setCompanyData(companyRes.data);
      setStackedData(stackedRes.data);
      setTopInvoices(topRes.data);
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [getDateRange, filterCompany, filterServiceType]);

  useEffect(() => {
    api.get('/companies').then(({ data }) => setCompanies(data));
    api.get('/service-types').then(({ data }) => setServiceTypes(data));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const formatCompact = (value: number) => {
    if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(1)}K`;
    return formatCurrency(value);
  };

  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#57489c]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header + Filtros */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2" style={{ fontFamily: 'var(--font-heading)' }}>
          <BarChart3 size={28} />
          Dashboard
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as PeriodType)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#57489c] outline-none"
          >
            <option value="month">Mês atual</option>
            <option value="quarter">Trimestre atual</option>
            <option value="year">Ano atual</option>
            <option value="custom">Personalizado</option>
          </select>
          {period === 'custom' && (
            <>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#57489c] outline-none"
              />
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#57489c] outline-none"
              />
            </>
          )}
          <select
            value={filterCompany}
            onChange={(e) => setFilterCompany(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#57489c] outline-none"
          >
            <option value="">Todas empresas</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select
            value={filterServiceType}
            onChange={(e) => setFilterServiceType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#57489c] outline-none"
          >
            <option value="">Todos serviços</option>
            {serviceTypes.map((st) => <option key={st.id} value={st.id}>{st.name}</option>)}
          </select>
        </div>
      </div>

      {/* Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <div
            onClick={() => navigate('/faturas?status=PAGA')}
            className="bg-white/90 backdrop-blur-sm rounded-xl border border-[#57489c]/10 p-4 cursor-pointer hover:border-[#57489c]/30 transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <DollarSign size={16} className="text-green-600" />
              <span className="text-xs text-gray-500">Gasto no mês</span>
            </div>
            <p className="text-lg font-bold text-gray-800">{formatCompact(summary.totalMonth)}</p>
          </div>
          <div
            onClick={() => navigate('/faturas?status=PAGA')}
            className="bg-white/90 backdrop-blur-sm rounded-xl border border-[#57489c]/10 p-4 cursor-pointer hover:border-[#57489c]/30 transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={16} className="text-[#57489c]" />
              <span className="text-xs text-gray-500">Gasto no ano</span>
            </div>
            <p className="text-lg font-bold text-gray-800">{formatCompact(summary.totalYear)}</p>
          </div>
          <div
            onClick={() => navigate('/faturas?status=PENDENTE')}
            className="bg-white/90 backdrop-blur-sm rounded-xl border border-[#57489c]/10 p-4 cursor-pointer hover:border-[#57489c]/30 transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <Clock size={16} className="text-yellow-600" />
              <span className="text-xs text-gray-500">Pendentes</span>
            </div>
            <p className="text-lg font-bold text-yellow-700">{summary.pendingCount}</p>
            <p className="text-xs text-gray-500">{formatCompact(summary.pendingValue)}</p>
          </div>
          <div
            onClick={() => navigate('/faturas?status=VENCIDAS')}
            className="bg-white/90 backdrop-blur-sm rounded-xl border border-[#57489c]/10 p-4 cursor-pointer hover:border-[#57489c]/30 transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle size={16} className="text-red-600" />
              <span className="text-xs text-gray-500">Vencidas</span>
            </div>
            <p className="text-lg font-bold text-red-700">{summary.overdueCount}</p>
            <p className="text-xs text-gray-500">{formatCompact(summary.overdueValue)}</p>
          </div>
          <div
            onClick={() => navigate('/contratos?status=ATIVO')}
            className="bg-white/90 backdrop-blur-sm rounded-xl border border-[#57489c]/10 p-4 cursor-pointer hover:border-[#57489c]/30 transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <FileText size={16} className="text-[#57489c]" />
              <span className="text-xs text-gray-500">Contratos ativos</span>
            </div>
            <p className="text-lg font-bold text-gray-800">{summary.activeContracts}</p>
          </div>
          <div
            onClick={() => navigate('/contratos?expiringInDays=30')}
            className="bg-white/90 backdrop-blur-sm rounded-xl border border-[#57489c]/10 p-4 cursor-pointer hover:border-[#57489c]/30 transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle size={16} className="text-orange-500" />
              <span className="text-xs text-gray-500">Vencendo 30d</span>
            </div>
            <p className="text-lg font-bold text-orange-700">{summary.expiringContracts}</p>
          </div>
        </div>
      )}

      {/* Gráfico 1 — Evolução mensal (Linha) */}
      <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-[#57489c]/10 p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Custo Mensal — Previsto vs Realizado</h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}K`} />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              labelFormatter={(label) => `Mês: ${label}`}
            />
            <Legend />
            <Line type="monotone" dataKey="previsto" name="Previsto" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" dot={false} />
            <Line type="monotone" dataKey="realizado" name="Realizado" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Gráficos 2 e 3 lado a lado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pizza — Por tipo de serviço */}
        <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-[#57489c]/10 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Custo por Tipo de Serviço</h3>
          {serviceTypeData.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-10">Sem dados no período</p>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={220}>
                <PieChart>
                  <Pie
                    data={serviceTypeData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {serviceTypeData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {serviceTypeData.slice(0, 6).map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-gray-700 truncate max-w-[120px]">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-gray-800 font-medium">{item.percentage.toFixed(0)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Barras horizontais — Por empresa */}
        <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-[#57489c]/10 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Top 10 Empresas por Custo</h3>
          {companyData.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-10">Sem dados no período</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={companyData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}K`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="value" name="Valor" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Gráfico 4 — Barras empilhadas */}
      <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-[#57489c]/10 p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Evolução por Tipo de Serviço (últimos 6 meses)</h3>
        {stackedData.data.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-10">Sem dados no período</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stackedData.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}K`} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              {stackedData.serviceTypes.map((st, i) => (
                <Bar key={st} dataKey={st} stackId="a" fill={COLORS[i % COLORS.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Tabela — Top faturas */}
      <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-[#57489c]/10 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700">Top 10 Faturas Pagas no Período</h3>
        </div>
        {topInvoices.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">Sem faturas pagas no período</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#242424] border-b border-[#242424]">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-white">Empresa</th>
                  <th className="text-left px-4 py-3 font-medium text-white">Tipo</th>
                  <th className="text-center px-4 py-3 font-medium text-white">Competência</th>
                  <th className="text-right px-4 py-3 font-medium text-white">Valor</th>
                  <th className="text-center px-4 py-3 font-medium text-white">Pagamento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {topInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-800 font-medium">{inv.company.name}</td>
                    <td className="px-4 py-3 text-gray-600">{inv.serviceType.name}</td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      {months[inv.competenceMonth - 1]}/{inv.competenceYear}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-800">
                      {formatCurrency(Number(inv.totalValue))}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      {inv.paymentDate ? new Date(inv.paymentDate).toLocaleDateString('pt-BR') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
