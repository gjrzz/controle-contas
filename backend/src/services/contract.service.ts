import { prisma } from '../config/prisma';
import { ContractStatus } from '@prisma/client';

interface CreateContractInput {
  companyId: string;
  serviceTypeId: string;
  contractNumber: string;
  monthlyValue: number;
  startDate: string;
  endDate: string;
  invoiceDueDay: number;
  description?: string;
  files?: string[];
}

interface UpdateContractInput {
  serviceTypeId?: string;
  contractNumber?: string;
  monthlyValue?: number;
  startDate?: string;
  endDate?: string;
  invoiceDueDay?: number;
  description?: string;
  files?: string[];
  status?: ContractStatus;
}

interface ContractFilters {
  companyId?: string;
  serviceTypeId?: string;
  status?: ContractStatus;
  expiringInDays?: number;
}

export class ContractService {
  async create(input: CreateContractInput) {
    return prisma.contract.create({
      data: {
        companyId: input.companyId,
        serviceTypeId: input.serviceTypeId,
        contractNumber: input.contractNumber,
        monthlyValue: input.monthlyValue,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        invoiceDueDay: input.invoiceDueDay,
        description: input.description,
        files: input.files || [],
      },
      include: { company: true, serviceType: true },
    });
  }

  async findAll(filters: ContractFilters = {}) {
    const where: any = {};

    if (filters.companyId) {
      where.companyId = filters.companyId;
    }
    if (filters.serviceTypeId) {
      where.serviceTypeId = filters.serviceTypeId;
    }
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.expiringInDays) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + filters.expiringInDays);
      where.endDate = { lte: futureDate };
      where.status = 'ATIVO';
    }

    return prisma.contract.findMany({
      where,
      include: { company: true, serviceType: true },
      orderBy: { endDate: 'asc' },
    });
  }

  async findById(id: string) {
    return prisma.contract.findUnique({
      where: { id },
      include: { company: true, serviceType: true },
    });
  }

  async update(id: string, input: UpdateContractInput) {
    const data: any = { ...input };
    if (input.startDate) data.startDate = new Date(input.startDate);
    if (input.endDate) data.endDate = new Date(input.endDate);

    return prisma.contract.update({
      where: { id },
      data,
      include: { company: true, serviceType: true },
    });
  }

  async getExpiringContracts(days: number = 30) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return prisma.contract.findMany({
      where: {
        status: 'ATIVO',
        endDate: {
          lte: futureDate,
          gte: new Date(),
        },
      },
      include: { company: true, serviceType: true },
      orderBy: { endDate: 'asc' },
    });
  }
}
