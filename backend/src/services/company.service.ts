import { prisma } from '../config/prisma';
import { CompanyStatus } from '@prisma/client';

interface CreateCompanyInput {
  name: string;
  cnpj: string;
  serviceTypeId: string;
  email: string;
  phone: string;
  cep: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
}

interface UpdateCompanyInput {
  name?: string;
  serviceTypeId?: string;
  email?: string;
  phone?: string;
  cep?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  status?: CompanyStatus;
}

interface CompanyFilters {
  name?: string;
  cnpj?: string;
  serviceTypeId?: string;
  status?: CompanyStatus;
}

export class CompanyService {
  async create(input: CreateCompanyInput) {
    return prisma.company.create({
      data: input,
      include: { serviceType: true },
    });
  }

  async findAll(filters: CompanyFilters = {}) {
    const where: any = {};

    if (filters.name) {
      where.name = { contains: filters.name, mode: 'insensitive' };
    }
    if (filters.cnpj) {
      where.cnpj = { contains: filters.cnpj.replace(/\D/g, '') };
    }
    if (filters.serviceTypeId) {
      where.serviceTypeId = filters.serviceTypeId;
    }
    if (filters.status) {
      where.status = filters.status;
    }

    return prisma.company.findMany({
      where,
      include: { serviceType: true },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    return prisma.company.findUnique({
      where: { id },
      include: { serviceType: true, contracts: true },
    });
  }

  async findByCnpj(cnpj: string) {
    return prisma.company.findUnique({
      where: { cnpj: cnpj.replace(/\D/g, '') },
    });
  }

  async update(id: string, input: UpdateCompanyInput) {
    return prisma.company.update({
      where: { id },
      data: input,
      include: { serviceType: true },
    });
  }

  async toggleStatus(id: string) {
    const company = await prisma.company.findUnique({ where: { id } });
    if (!company) throw new Error('Empresa não encontrada');

    const newStatus = company.status === 'ATIVA' ? CompanyStatus.INATIVA : CompanyStatus.ATIVA;
    return prisma.company.update({
      where: { id },
      data: { status: newStatus },
      include: { serviceType: true },
    });
  }
}
