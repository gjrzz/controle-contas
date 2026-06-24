import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, AlertTriangle, CircleDot } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import type { CalendarEvent, CalendarResponse, CalendarSummary } from '../types/calendar';
import type { Company, ServiceType } from '../types/company';

const months = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const eventColors: Record<string, string> = {
  FATURA_EMITIDA: 'bg-blue-500',
  FATURA_VENCENDO: 'bg-orange-500',
  FATURA_VENCENDO_PAGA: 'bg-green-500',
  FATURA_NAO_INFORMADA: 'bg-red-500',
  FATURA_PENDENTE_APROVACAO: 'bg-yellow-500',
};

export function Calendar() {
  const navigate = useNavigate();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [summary, setSummary] = useState<CalendarSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [filterCompany, setFilterCompany] = useState('');
  const [filterServiceType, setFilterServiceType] = useState('');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const loadCalendar = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { month, year };
      if (filterCompany) params.companyId = filterCompany;
      if (filterServiceType) params.serviceTypeId = filterServiceType;

      const { data } = await api.get<CalendarResponse>('/calendar', { params });
      setEvents(data.events);
      setSummary(data.summary);
    } catch (err) {
      console.error('Erro ao carregar calendário:', err);
    } finally {
      setLoading(false);
    }
  }, [month, year, filterCompany, filterServiceType]);

  useEffect(() => {
    api.get('/companies').then(({ data }) => setCompanies(data));
    api.get('/service-types').then(({ data }) => setServiceTypes(data));
  }, []);

  useEffect(() => { loadCalendar(); }, [loadCalendar]);

  const goToPrevMonth = () => {
    if (month === 1) { setMonth(12); setYear(year - 1); }
    else setMonth(month - 1);
  };

  const goToNextMonth = () => {
    if (month === 12) { setMonth(1); setYear(year + 1); }
    else setMonth(month + 1);
  };

  const goToToday = () => {
    setMonth(now.getMonth() + 1);
    setYear(now.getFullYear());
  };

  // Gera dias do calendário
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const calendarDays: (number | null)[] = [];

  for (let i = 0; i < firstDayOfMonth; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

  const getEventsForDay = (day: number) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter((e) => e.date === dateStr);
  };

  const getEventColor = (event: CalendarEvent) => {
    if (event.type === 'FATURA_VENCENDO' && event.status === 'PAGA') {
      return eventColors['FATURA_VENCENDO_PAGA'];
    }
    return eventColors[event.type] || 'bg-gray-400';
  };

  const handleEventClick = (event: CalendarEvent) => {
    if (event.type === 'FATURA_NAO_INFORMADA') {
      // Redireciona para cadastro com empresa/contrato pré-selecionados
      navigate(`/faturas?action=new&companyId=${event.companyId}&contractId=${event.contractId}`);
    } else if (event.invoiceId) {
      navigate(`/faturas?invoiceId=${event.invoiceId}`);
    }
  };

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const selectedDateStr = selectedDay
    ? `${year}-${String(month).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`
    : null;

  const selectedDayEvents = selectedDay ? getEventsForDay(Number(selectedDay)) : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2" style={{ fontFamily: 'var(--font-heading)' }}>
          <CalendarIcon size={28} />
          Calendário
        </h2>
      </div>

      {/* Filtros */}
      <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-[#57489c]/10 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
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
          <div className="col-span-2 flex items-center gap-2">
            <button onClick={goToPrevMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronLeft size={20} />
            </button>
            <span className="text-lg font-semibold text-gray-800 min-w-[180px] text-center">
              {months[month - 1]} {year}
            </span>
            <button onClick={goToNextMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronRight size={20} />
            </button>
            <button
              onClick={goToToday}
              className="ml-2 px-3 py-1.5 text-sm bg-white/70 text-[#57489c] hover:bg-white/90 rounded-lg transition-colors"
            >
              Hoje
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendário */}
        <div className="lg:col-span-3">
          <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-[#57489c]/10 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#57489c]" />
              </div>
            ) : (
              <>
                {/* Header dias da semana */}
                <div className="grid grid-cols-7 border-b border-gray-200">
                  {weekDays.map((day) => (
                    <div key={day} className="text-center py-2 text-xs font-medium text-gray-500 bg-gray-50">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Dias */}
                <div className="grid grid-cols-7">
                  {calendarDays.map((day, index) => {
                    if (day === null) {
                      return <div key={`empty-${index}`} className="h-24 border-b border-r border-gray-100 bg-gray-50/50" />;
                    }

                    const dayEvents = getEventsForDay(day);
                    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const isToday = dateStr === todayStr;
                    const isSelected = dateStr === selectedDateStr;

                    return (
                      <div
                        key={day}
                        onClick={() => setSelectedDay(String(day))}
                        className={`h-24 border-b border-r border-gray-100 p-1 cursor-pointer transition-colors ${
                          isSelected ? 'bg-white/70' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
                            isToday ? 'bg-[#57489c] text-white' : 'text-gray-600'
                          }`}>
                            {day}
                          </span>
                          {dayEvents.length > 3 && (
                            <span className="text-[10px] text-gray-400">+{dayEvents.length - 3}</span>
                          )}
                        </div>
                        <div className="space-y-0.5 overflow-hidden">
                          {dayEvents.slice(0, 3).map((event) => (
                            <div
                              key={event.id}
                              onClick={(e) => { e.stopPropagation(); handleEventClick(event); }}
                              className={`${getEventColor(event)} text-white text-[10px] leading-tight px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80`}
                              title={`${event.companyName} — ${formatCurrency(event.value)}`}
                            >
                              {event.companyName.split(' ')[0]}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Legenda */}
                <div className="flex items-center gap-4 px-4 py-3 border-t border-gray-200 bg-gray-50">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-blue-500" />
                    <span className="text-xs text-gray-600">Emitida</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-orange-500" />
                    <span className="text-xs text-gray-600">Vencendo</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-green-500" />
                    <span className="text-xs text-gray-600">Paga</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-red-500" />
                    <span className="text-xs text-gray-600">Não informada</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-yellow-500" />
                    <span className="text-xs text-gray-600">Pendente aprovação</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Detalhes do dia selecionado */}
          {selectedDay && selectedDayEvents.length > 0 && (
            <div className="mt-4 bg-white/90 backdrop-blur-sm rounded-xl border border-[#57489c]/10 p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                Eventos em {selectedDay}/{month}/{year}
              </h4>
              <div className="space-y-2">
                {selectedDayEvents.map((event) => (
                  <div
                    key={event.id}
                    onClick={() => handleEventClick(event)}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full ${getEventColor(event)}`} />
                      <div>
                        <p className="text-sm font-medium text-gray-800">{event.companyName}</p>
                        <p className="text-xs text-gray-500">
                          {event.type === 'FATURA_EMITIDA' && `NF ${event.invoiceNumber} — Emitida`}
                          {event.type === 'FATURA_VENCENDO' && `NF ${event.invoiceNumber} — Vencimento`}
                          {event.type === 'FATURA_NAO_INFORMADA' && `Contrato ${event.contractNumber} — Sem fatura`}
                          {event.type === 'FATURA_PENDENTE_APROVACAO' && `NF ${event.invoiceNumber} — Pendente (${event.daysUntilDue}d)`}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-gray-800">{formatCurrency(event.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Painel lateral */}
        <div className="space-y-4">
          {/* Alertas */}
          {summary && (summary.contratosSemFatura > 0 || summary.faturasVencendoSemAprovacao > 0 || summary.faturasVencidas > 0) && (
            <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-[#57489c]/10 p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <AlertTriangle size={16} className="text-orange-500" />
                Alertas
              </h4>
              <div className="space-y-2">
                {summary.contratosSemFatura > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <CircleDot size={12} className="text-red-500" />
                    <span className="text-gray-700">
                      <span className="font-medium">{summary.contratosSemFatura}</span> contrato(s) sem fatura
                    </span>
                  </div>
                )}
                {summary.faturasVencendoSemAprovacao > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <CircleDot size={12} className="text-yellow-500" />
                    <span className="text-gray-700">
                      <span className="font-medium">{summary.faturasVencendoSemAprovacao}</span> vencendo sem aprovação
                    </span>
                  </div>
                )}
                {summary.faturasVencidas > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <CircleDot size={12} className="text-red-600" />
                    <span className="text-gray-700">
                      <span className="font-medium">{summary.faturasVencidas}</span> fatura(s) vencida(s)
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Resumo do mês */}
          {summary && (
            <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-[#57489c]/10 p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Resumo do Mês</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Faturas emitidas</span>
                  <span className="text-sm font-medium text-gray-800">{summary.totalEmitidas}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Faturas pagas</span>
                  <span className="text-sm font-medium text-green-700">{summary.totalPagas}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Pendentes de aprovação</span>
                  <span className="text-sm font-medium text-yellow-700">{summary.totalPendentes}</span>
                </div>
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Valor previsto</span>
                    <span className="text-sm font-medium text-gray-800">{formatCurrency(summary.valorPrevisto)}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Valor realizado</span>
                  <span className="text-sm font-bold text-green-700">{formatCurrency(summary.valorRealizado)}</span>
                </div>
                {summary.valorPrevisto > 0 && (
                  <div className="pt-2">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (summary.valorRealizado / summary.valorPrevisto) * 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1 text-right">
                      {((summary.valorRealizado / summary.valorPrevisto) * 100).toFixed(0)}% realizado
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
