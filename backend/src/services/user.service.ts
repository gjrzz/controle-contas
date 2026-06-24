import bcrypt from 'bcrypt';
import { prisma } from '../config/prisma';
import { Role } from '@prisma/client';

interface CreateUserInput {
  email: string;
  name: string;
  password: string;
  role: Role;
}

interface UpdateUserInput {
  name?: string;
  email?: string;
  role?: Role;
  active?: boolean;
}

export class UserService {
  async create(input: CreateUserInput) {
    const hashedPassword = await bcrypt.hash(input.password, 12);

    return prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        password: hashedPassword,
        role: input.role,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });
  }

  async findAll() {
    return prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });
  }

  async update(id: string, input: UpdateUserInput) {
    return prisma.user.update({
      where: { id },
      data: input,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });
  }

  async resetPassword(id: string, newPassword: string) {
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    return prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });
  }
}
