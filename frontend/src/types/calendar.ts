export type CalendarEventType = 'FATURA_EMITIDA' | 'FATURA_VENCENDO' | 'FATURA_NAO_INFORMADA' | 'FATURA_PENDENTE_APROVACAO';

export interface CalendarEvent {
  id: string;
  type: CalendarEventType;
  date: string;
  companyId: string;
  companyName: string;
  contractId?: string;
  contractNumber?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  value: number;
  status?: string;
  daysUntilDue?: number;
}

export interface CalendarSummary {
  totalEmitidas: number;
  totalPagas: number;
  totalPendentes: number;
  valorPrevisto: number;
  valorRealizado: number;
  faturasVencendoSemAprovacao: number;
  faturasVencidas: number;
  contratosSemFatura: number;
}

export interface CalendarResponse {
  events: CalendarEvent[];
  summary: CalendarSummary;
  month: number;
  year: number;
}
