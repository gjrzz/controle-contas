import { prisma } from '../config/prisma';
import { Prisma } from '@prisma/client';

interface DashboardFilters {
  startDate: string;
  endDate: string;
  companyId?: string;
  serviceTypeId?: string;
}

export class DashboardService {
  private buildInvoiceWhere(filters: DashboardFilters, paidOnly = false): Prisma.InvoiceWhereInput {
    const where: Prisma.InvoiceWhereInput = {};
    if (paidOnly) {
      where.status = 'PAGA';
      where.paymentDate = {
        gte: new Date(filters.startDate),
        lte: new Date(filters.endDate),
      };
    }
    if (filters.companyId) where.companyId = filters.companyId;
    if (filters.serviceTypeId) where.serviceTypeId = filters.serviceTypeId;
    return where;
  }

  async getSummary(filters: DashboardFilters) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfYear = new Date(now.getFullYear(), 11, 31);
    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);

    const baseWhere: Prisma.InvoiceWhereInput = {};
    if (filters.companyId) baseWhere.companyId = filters.companyId;
    if (filters.serviceTypeId) baseWhere.serviceTypeId = filters.serviceTypeId;

    // Total gasto no mês
    const paidThisMonth = await prisma.invoice.findMany({
      where: { ...baseWhere, status: 'PAGA', paymentDate: { gte: startOfMonth, lte: endOfMonth } },
      select: { totalValue: true },
    });
    const totalMonth = paidThisMonth.reduce((s, i) => s + Number(i.totalValue), 0);

    // Total gasto no ano
    const paidThisYear = await prisma.invoice.findMany({
      where: { ...baseWhere, status: 'PAGA', paymentDate: { gte: startOfYear, lte: endOfYear } },
      select: { totalValue: true },
    });
    const totalYear = paidThisYear.reduce((s, i) => s + Number(i.totalValue), 0);

    // Faturas pendentes de aprovação
    const pendingInvoices = await prisma.invoice.findMany({
      where: { ...baseWhere, status: { in: ['PENDENTE', 'EM_ANALISE'] } },
      select: { totalValue: true },
    });
    const pendingCount = pendingInvoices.length;
    const pendingValue = pendingInvoices.reduce((s, i) => s + Number(i.totalValue), 0);

    // Faturas vencidas não pagas
    const overdueInvoices = await prisma.invoice.findMany({
      where: {
        ...baseWhere,
        status: { notIn: ['PAGA', 'REJEITADA'] },
        dueDate: { lt: now },
      },
      select: { totalValue: true },
    });
    const overdueCount = overdueInvoices.length;
    const overdueValue = overdueInvoices.reduce((s, i) => s + Number(i.totalValue), 0);

    // Contratos ativos
    const contractBaseWhere: Prisma.ContractWhereInput = { status: 'ATIVO' };
    if (filters.companyId) contractBaseWhere.companyId = filters.companyId;
    if (filters.serviceTypeId) contractBaseWhere.serviceTypeId = filters.serviceTypeId;

    const activeContracts = await prisma.contract.count({ where: contractBaseWhere });

    // Contratos vencendo em 30 dias
    const expiringContracts = await prisma.contract.count({
      where: { ...contractBaseWhere, endDate: { gte: now, lte: in30Days } },
    });

    return {
      totalMonth,
      totalYear,
      pendingCount,
      pendingValue,
      overdueCount,
      overdueValue,
      activeContracts,
      expiringContracts,
    };
  }

  async getMonthlyEvolution(filters: DashboardFilters) {
    const year = new Date(filters.startDate).getFullYear();
    const months: { month: number; label: string; previsto: number; realizado: number }[] = [];

    const baseInvoiceWhere: Prisma.InvoiceWhereInput = { status: 'PAGA' };
    if (filters.companyId) baseInvoiceWhere.companyId = filters.companyId;
    if (filters.serviceTypeId) baseInvoiceWhere.serviceTypeId = filters.serviceTypeId;

    const baseContractWhere: Prisma.ContractWhereInput = { status: 'ATIVO' };
    if (filters.companyId) baseContractWhere.companyId = filters.companyId;
    if (filters.serviceTypeId) baseContractWhere.serviceTypeId = filters.serviceTypeId;

    const monthLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    for (let m = 0; m < 12; m++) {
      const startOfMonth = new Date(year, m, 1);
      const endOfMonth = new Date(year, m + 1, 0);

      // Realizado (faturas pagas com pagamento neste mês)
      const paid = await prisma.invoice.findMany({
        where: { ...baseInvoiceWhere, paymentDate: { gte: startOfMonth, lte: endOfMonth } },
        select: { totalValue: true },
      });
      const realizado = paid.reduce((s, i) => s + Number(i.totalValue), 0);

      // Previsto (soma dos contratos ativos neste mês)
      const contracts = await prisma.contract.findMany({
        where: { ...baseContractWhere, startDate: { lte: endOfMonth }, endDate: { gte: startOfMonth } },
        select: { monthlyValue: true },
      });
      const previsto = contracts.reduce((s, c) => s + Number(c.monthlyValue), 0);

      months.push({ month: m + 1, label: monthLabels[m], previsto, realizado });
    }

    return months;
  }

  async getByServiceType(filters: DashboardFilters) {
    const invoices = await prisma.invoice.findMany({
      where: this.buildInvoiceWhere(filters, true),
      include: { serviceType: { select: { name: true } } },
    });

    const map = new Map<string, number>();
    for (const inv of invoices) {
      const name = inv.serviceType.name;
      map.set(name, (map.get(name) || 0) + Number(inv.totalValue));
    }

    const total = Array.from(map.values()).reduce((s, v) => s + v, 0);
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value, percentage: total > 0 ? (value / total) * 100 : 0 }))
      .sort((a, b) => b.value - a.value);
  }

  async getByCompany(filters: DashboardFilters) {
    const invoices = await prisma.invoice.findMany({
      where: this.buildInvoiceWhere(filters, true),
      include: { company: { select: { name: true } } },
    });

    const map = new Map<string, number>();
    for (const inv of invoices) {
      const name = inv.company.name;
      map.set(name, (map.get(name) || 0) + Number(inv.totalValue));
    }

    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }

  async getStackedEvolution(filters: DashboardFilters) {
    const now = new Date();
    const monthLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    // Últimos 6 meses
    const monthsData: Record<string, number | string>[] = [];
    const serviceTypesSet = new Set<string>();

    const baseWhere: Prisma.InvoiceWhereInput = { status: 'PAGA' };
    if (filters.companyId) baseWhere.companyId = filters.companyId;
    if (filters.serviceTypeId) baseWhere.serviceTypeId = filters.serviceTypeId;

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const invoices = await prisma.invoice.findMany({
        where: { ...baseWhere, paymentDate: { gte: date, lte: endOfMonth } },
        include: { serviceType: { select: { name: true } } },
      });

      const monthEntry: Record<string, number | string> = {
        month: `${monthLabels[date.getMonth()]}/${date.getFullYear().toString().slice(2)}`,
      };

      for (const inv of invoices) {
        const stName = inv.serviceType.name;
        serviceTypesSet.add(stName);
        monthEntry[stName] = ((monthEntry[stName] as number) || 0) + Number(inv.totalValue);
      }

      monthsData.push(monthEntry);
    }

    return { data: monthsData, serviceTypes: Array.from(serviceTypesSet) };
  }

  async getTopInvoices(filters: DashboardFilters) {
    return prisma.invoice.findMany({
      where: this.buildInvoiceWhere(filters, true),
      include: {
        company: { select: { name: true } },
        serviceType: { select: { name: true } },
      },
      orderBy: { totalValue: 'desc' },
      take: 10,
    });
  }
}
