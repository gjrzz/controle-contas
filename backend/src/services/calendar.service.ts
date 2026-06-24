import { prisma } from '../config/prisma';

export interface CalendarEvent {
  id: string;
  type: 'FATURA_EMITIDA' | 'FATURA_VENCENDO' | 'FATURA_NAO_INFORMADA' | 'FATURA_PENDENTE_APROVACAO';
  date: string; // YYYY-MM-DD
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

interface CalendarFilters {
  month: number;
  year: number;
  companyId?: string;
  serviceTypeId?: string;
}

export class CalendarService {
  async getMonthEvents(filters: CalendarFilters): Promise<CalendarEvent[]> {
    const { month, year, companyId, serviceTypeId } = filters;
    const events: CalendarEvent[] = [];

    // Datas do mês
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // Último dia do mês

    const invoiceWhere: any = {
      OR: [
        {
          issueDate: { gte: startDate, lte: endDate },
        },
        {
          dueDate: { gte: startDate, lte: endDate },
        },
      ],
    };

    if (companyId) invoiceWhere.companyId = companyId;
    if (serviceTypeId) invoiceWhere.serviceTypeId = serviceTypeId;

    // Busca todas as faturas do mês (emissão ou vencimento neste mês)
    const invoices = await prisma.invoice.findMany({
      where: invoiceWhere,
      include: { company: true, contract: true },
    });

    const now = new Date();

    for (const invoice of invoices) {
      const issueDate = new Date(invoice.issueDate);
      const dueDate = new Date(invoice.dueDate);

      // Evento: FATURA EMITIDA (se emissão neste mês)
      if (issueDate >= startDate && issueDate <= endDate) {
        events.push({
          id: `emitida-${invoice.id}`,
          type: 'FATURA_EMITIDA',
          date: issueDate.toISOString().split('T')[0],
          companyId: invoice.companyId,
          companyName: invoice.company.name,
          contractId: invoice.contractId,
          contractNumber: invoice.contract.contractNumber,
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          value: Number(invoice.totalValue),
          status: invoice.status,
        });
      }

      // Evento: FATURA VENCENDO (se vencimento neste mês)
      if (dueDate >= startDate && dueDate <= endDate) {
        events.push({
          id: `vencimento-${invoice.id}`,
          type: 'FATURA_VENCENDO',
          date: dueDate.toISOString().split('T')[0],
          companyId: invoice.companyId,
          companyName: invoice.company.name,
          contractId: invoice.contractId,
          contractNumber: invoice.contract.contractNumber,
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          value: Number(invoice.totalValue),
          status: invoice.status,
        });
      }

      // Evento: FATURA PENDENTE DE APROVAÇÃO
      if (
        (invoice.status === 'PENDENTE' || invoice.status === 'EM_ANALISE') &&
        dueDate >= startDate &&
        dueDate <= endDate
      ) {
        const daysSinceCreation = Math.ceil((now.getTime() - new Date(invoice.createdAt).getTime()) / (1000 * 60 * 60 * 24));
        const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (daysSinceCreation > 3 && daysUntilDue < 10) {
          events.push({
            id: `pendente-${invoice.id}`,
            type: 'FATURA_PENDENTE_APROVACAO',
            date: dueDate.toISOString().split('T')[0],
            companyId: invoice.companyId,
            companyName: invoice.company.name,
            contractId: invoice.contractId,
            contractNumber: invoice.contract.contractNumber,
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            value: Number(invoice.totalValue),
            status: invoice.status,
            daysUntilDue,
          });
        }
      }
    }

    // Busca contratos ativos para verificar faturas não informadas
    const contractWhere: any = {
      status: 'ATIVO',
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    };
    if (companyId) contractWhere.companyId = companyId;
    if (serviceTypeId) contractWhere.serviceTypeId = serviceTypeId;

    const activeContracts = await prisma.contract.findMany({
      where: contractWhere,
      include: { company: true },
    });

    for (const contract of activeContracts) {
      // Verifica se existe fatura para este contrato nesta competência
      const existingInvoice = await prisma.invoice.findFirst({
        where: {
          contractId: contract.id,
          competenceMonth: month,
          competenceYear: year,
        },
      });

      if (!existingInvoice) {
        // Calcula o dia de vencimento no mês
        const lastDayOfMonth = endDate.getDate();
        const dueDay = Math.min(contract.invoiceDueDay, lastDayOfMonth);
        const eventDate = new Date(year, month - 1, dueDay);

        events.push({
          id: `nao-informada-${contract.id}`,
          type: 'FATURA_NAO_INFORMADA',
          date: eventDate.toISOString().split('T')[0],
          companyId: contract.companyId,
          companyName: contract.company.name,
          contractId: contract.id,
          contractNumber: contract.contractNumber,
          value: Number(contract.monthlyValue),
        });
      }
    }

    return events.sort((a, b) => a.date.localeCompare(b.date));
  }

  async getMonthSummary(filters: CalendarFilters) {
    const { month, year, companyId, serviceTypeId } = filters;
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    const now = new Date();

    const invoiceWhere: any = {
      competenceMonth: month,
      competenceYear: year,
    };
    if (companyId) invoiceWhere.companyId = companyId;
    if (serviceTypeId) invoiceWhere.serviceTypeId = serviceTypeId;

    const invoices = await prisma.invoice.findMany({
      where: invoiceWhere,
      select: { totalValue: true, status: true, dueDate: true },
    });

    // Contratos ativos no mês
    const contractWhere: any = {
      status: 'ATIVO',
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    };
    if (companyId) contractWhere.companyId = companyId;
    if (serviceTypeId) contractWhere.serviceTypeId = serviceTypeId;

    const contracts = await prisma.contract.findMany({
      where: contractWhere,
      select: { monthlyValue: true },
    });

    const totalEmitidas = invoices.length;
    const totalPagas = invoices.filter((i) => i.status === 'PAGA').length;
    const totalPendentes = invoices.filter((i) => i.status === 'PENDENTE' || i.status === 'EM_ANALISE').length;
    const valorPrevisto = contracts.reduce((sum, c) => sum + Number(c.monthlyValue), 0);
    const valorRealizado = invoices
      .filter((i) => i.status === 'PAGA')
      .reduce((sum, i) => sum + Number(i.totalValue), 0);

    // Alertas
    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const faturasVencendoSemAprovacao = invoices.filter((i) => {
      const due = new Date(i.dueDate);
      return (
        (i.status === 'PENDENTE' || i.status === 'EM_ANALISE') &&
        due <= sevenDaysFromNow &&
        due >= now
      );
    }).length;

    const faturasVencidas = invoices.filter((i) => {
      const due = new Date(i.dueDate);
      return i.status !== 'PAGA' && i.status !== 'REJEITADA' && due < now;
    }).length;

    const contratosSemFatura = contracts.length - invoices.length;

    return {
      totalEmitidas,
      totalPagas,
      totalPendentes,
      valorPrevisto,
      valorRealizado,
      faturasVencendoSemAprovacao,
      faturasVencidas,
      contratosSemFatura: Math.max(0, contratosSemFatura),
    };
  }
}
