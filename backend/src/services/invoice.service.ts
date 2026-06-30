import { prisma } from '../config/prisma';
import { InvoiceStatus, Prisma } from '@prisma/client';

interface InvoiceItemInput {
  description: string;
  unitValue: number;
  quantity: number;
  serviceCity?: string;
  serviceState?: string;
  serviceTypeId?: string;
}

interface CreateInvoiceInput {
  companyId: string;
  contractId: string;
  serviceTypeId: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  competenceMonth: number;
  competenceYear: number;
  serviceCity: string;
  serviceState: string;
  description?: string;
  totalValue: number;
  files?: string[];
  justification?: string;
  items: InvoiceItemInput[];
}

interface UpdateInvoiceInput {
  serviceTypeId?: string;
  invoiceNumber?: string;
  issueDate?: string;
  dueDate?: string;
  competenceMonth?: number;
  competenceYear?: number;
  serviceCity?: string;
  serviceState?: string;
  description?: string;
  totalValue?: number;
  files?: string[];
  justification?: string;
  items?: InvoiceItemInput[];
}

interface InvoiceFilters {
  companyId?: string;
  serviceTypeId?: string;
  status?: InvoiceStatus;
  competenceMonth?: number;
  competenceYear?: number;
  dueDateFrom?: string;
  dueDateTo?: string;
  overdue?: boolean;
  page?: number;
  limit?: number;
}

interface StatusTransitionInput {
  invoiceId: string;
  newStatus: InvoiceStatus;
  rejectionReason?: string;
  paymentDate?: string;
}

export class InvoiceService {
  async create(input: CreateInvoiceInput) {
    const itemsData = input.items.map((item) => ({
      description: item.description,
      unitValue: item.unitValue,
      quantity: item.quantity,
      totalValue: Number((item.unitValue * item.quantity).toFixed(2)),
      serviceCity: item.serviceCity || null,
      serviceState: item.serviceState || null,
      serviceTypeId: item.serviceTypeId || null,
    }));

    return prisma.invoice.create({
      data: {
        companyId: input.companyId,
        contractId: input.contractId,
        serviceTypeId: input.serviceTypeId,
        invoiceNumber: input.invoiceNumber,
        issueDate: new Date(input.issueDate),
        dueDate: new Date(input.dueDate),
        competenceMonth: input.competenceMonth,
        competenceYear: input.competenceYear,
        serviceCity: input.serviceCity,
        serviceState: input.serviceState,
        description: input.description,
        totalValue: input.totalValue,
        files: input.files || [],
        justification: input.justification,
        items: {
          create: itemsData,
        },
      },
      include: {
        company: true,
        contract: true,
        serviceType: true,
        items: true,
      },
    });
  }

  async findAll(filters: InvoiceFilters = {}) {
    const where: Prisma.InvoiceWhereInput = {};
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    if (filters.companyId) where.companyId = filters.companyId;
    if (filters.serviceTypeId) where.serviceTypeId = filters.serviceTypeId;
    if (filters.status) where.status = filters.status;
    if (filters.competenceMonth) where.competenceMonth = filters.competenceMonth;
    if (filters.competenceYear) where.competenceYear = filters.competenceYear;
    if (filters.dueDateFrom || filters.dueDateTo) {
      where.dueDate = {};
      if (filters.dueDateFrom) where.dueDate.gte = new Date(filters.dueDateFrom);
      if (filters.dueDateTo) where.dueDate.lte = new Date(filters.dueDateTo);
    }
    if (filters.overdue) {
      where.status = { notIn: ['PAGA', 'REJEITADA'] };
      where.dueDate = { lt: new Date() };
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          company: true,
          contract: true,
          serviceType: true,
          items: true,
        },
        orderBy: { dueDate: 'asc' },
        skip,
        take: limit,
      }),
      prisma.invoice.count({ where }),
    ]);

    return {
      data: invoices,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string) {
    return prisma.invoice.findUnique({
      where: { id },
      include: {
        company: true,
        contract: true,
        serviceType: true,
        items: true,
      },
    });
  }

  async update(id: string, input: UpdateInvoiceInput) {
    const data: any = { ...input };
    delete data.items;

    if (input.issueDate) data.issueDate = new Date(input.issueDate);
    if (input.dueDate) data.dueDate = new Date(input.dueDate);

    // Se itens foram enviados, recria todos
    if (input.items) {
      await prisma.invoiceItem.deleteMany({ where: { invoiceId: id } });
      await prisma.invoiceItem.createMany({
        data: input.items.map((item) => ({
          invoiceId: id,
          description: item.description,
          unitValue: item.unitValue,
          quantity: item.quantity,
          totalValue: Number((item.unitValue * item.quantity).toFixed(2)),
          serviceCity: item.serviceCity || null,
          serviceState: item.serviceState || null,
          serviceTypeId: item.serviceTypeId || null,
        })),
      });
    }

    return prisma.invoice.update({
      where: { id },
      data,
      include: {
        company: true,
        contract: true,
        serviceType: true,
        items: true,
      },
    });
  }

  async transitionStatus(input: StatusTransitionInput) {
    const data: any = { status: input.newStatus };

    if (input.rejectionReason) {
      data.rejectionReason = input.rejectionReason;
    }
    if (input.paymentDate) {
      data.paymentDate = new Date(input.paymentDate);
    }

    return prisma.invoice.update({
      where: { id: input.invoiceId },
      data,
      include: {
        company: true,
        contract: true,
        serviceType: true,
        items: true,
      },
    });
  }

  /**
   * Busca a última fatura PAGA do mesmo contrato para validação de histórico
   */
  async getLastPaidInvoice(contractId: string, excludeInvoiceId?: string) {
    const where: Prisma.InvoiceWhereInput = {
      contractId,
      status: 'PAGA',
    };
    if (excludeInvoiceId) {
      where.id = { not: excludeInvoiceId };
    }

    return prisma.invoice.findFirst({
      where,
      orderBy: { paymentDate: 'desc' },
      select: { id: true, totalValue: true, competenceMonth: true, competenceYear: true },
    });
  }

  /**
   * Verifica duplicidade: mesma empresa + mesma competência
   */
  async checkDuplicate(companyId: string, competenceMonth: number, competenceYear: number, excludeId?: string) {
    const where: Prisma.InvoiceWhereInput = {
      companyId,
      competenceMonth,
      competenceYear,
    };
    if (excludeId) {
      where.id = { not: excludeId };
    }

    return prisma.invoice.findFirst({ where });
  }

  /**
   * Validações de valor vs contrato e histórico
   */
  async validateInvoiceValue(contractId: string, totalValue: number, excludeInvoiceId?: string) {
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      select: { monthlyValue: true },
    });

    if (!contract) {
      return { valid: true, alerts: [], blocks: [] };
    }

    const contractValue = Number(contract.monthlyValue);
    const alerts: string[] = [];
    const blocks: string[] = [];

    // Validação vs contrato
    const contractDivergence = Math.abs(totalValue - contractValue) / contractValue;
    if (contractDivergence > 0.3) {
      blocks.push(
        `Valor diverge mais de 30% do contrato (R$ ${contractValue.toFixed(2)}). Justificativa obrigatória.`
      );
    } else if (contractDivergence > 0.1) {
      alerts.push(
        `Valor diverge mais de 10% do contrato (R$ ${contractValue.toFixed(2)}).`
      );
    }

    // Validação vs histórico
    const lastPaid = await this.getLastPaidInvoice(contractId, excludeInvoiceId);
    let lastPaidValue: number | null = null;

    if (lastPaid) {
      lastPaidValue = Number(lastPaid.totalValue);
      const historyDivergence = Math.abs(totalValue - lastPaidValue) / lastPaidValue;
      if (historyDivergence > 0.1) {
        alerts.push(
          `Valor diverge mais de 10% da última fatura paga (R$ ${lastPaidValue.toFixed(2)} — ${lastPaid.competenceMonth}/${lastPaid.competenceYear}).`
        );
      }
    }

    return {
      valid: blocks.length === 0,
      alerts,
      blocks,
      contractValue,
      lastPaidValue,
    };
  }
}
