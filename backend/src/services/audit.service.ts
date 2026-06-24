import { prisma } from '../config/prisma';

interface AuditInput {
  userId: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: Record<string, unknown>;
}

export class AuditService {
  async log(input: AuditInput) {
    return prisma.auditLog.create({
      data: {
        userId: input.userId,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        details: input.details as any ?? undefined,
      },
    });
  }

  async getByEntity(entity: string, entityId: string) {
    return prisma.auditLog.findMany({
      where: { entity, entityId },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
