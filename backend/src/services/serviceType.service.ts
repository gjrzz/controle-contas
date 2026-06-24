import { prisma } from '../config/prisma';

export class ServiceTypeService {
  async findAll() {
    return prisma.serviceType.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async create(name: string) {
    return prisma.serviceType.create({
      data: { name },
    });
  }

  async findByName(name: string) {
    return prisma.serviceType.findUnique({
      where: { name },
    });
  }
}
