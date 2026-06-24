import { Router, Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { UserService } from '../services/user.service';
import { AuditService } from '../services/audit.service';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { Role } from '@prisma/client';
import { prisma } from '../config/prisma';

const router = Router();
const userService = new UserService();
const auditService = new AuditService();

const createUserSchema = z.object({
  email: z.string().email('Email inválido'),
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
  role: z.nativeEnum(Role),
});

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  role: z.nativeEnum(Role).optional(),
  active: z.boolean().optional(),
});

// Todas as rotas exigem autenticação + role ADMIN
router.use(authenticate, authorize('ADMIN'));

// Listagem
router.get('/', async (_req: Request, res: Response) => {
  const users = await userService.findAll();
  res.json(users);
});

// Criação
router.post('/', async (req: Request, res: Response) => {
  try {
    const data = createUserSchema.parse(req.body);
    const user = await userService.create(data);

    await auditService.log({
      userId: req.user!.userId,
      action: 'CREATE',
      entity: 'User',
      entityId: user.id,
      details: { email: user.email, role: user.role },
    });

    res.status(201).json(user);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Dados inválidos', details: error.errors });
      return;
    }
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'Email já cadastrado' });
      return;
    }
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Edição
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const data = updateUserSchema.parse(req.body);
    const id = req.params.id as string;

    // Não pode inativar a si mesmo
    if (data.active === false && id === req.user!.userId) {
      res.status(400).json({ error: 'Você não pode inativar seu próprio usuário' });
      return;
    }

    // Não pode remover o último ADMIN
    if (data.role && data.role !== 'ADMIN') {
      const currentUser = await userService.findById(id);
      if (currentUser?.role === 'ADMIN') {
        const adminCount = await prisma.user.count({ where: { role: 'ADMIN', active: true } });
        if (adminCount <= 1) {
          res.status(400).json({ error: 'Não é possível remover o último administrador do sistema' });
          return;
        }
      }
    }

    // Não pode inativar o último ADMIN
    if (data.active === false) {
      const currentUser = await userService.findById(id);
      if (currentUser?.role === 'ADMIN') {
        const adminCount = await prisma.user.count({ where: { role: 'ADMIN', active: true } });
        if (adminCount <= 1) {
          res.status(400).json({ error: 'Não é possível inativar o último administrador do sistema' });
          return;
        }
      }
    }

    const user = await userService.update(id, data);

    await auditService.log({
      userId: req.user!.userId,
      action: 'UPDATE',
      entity: 'User',
      entityId: user.id,
      details: data,
    });

    res.json(user);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Dados inválidos', details: error.errors });
      return;
    }
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'Email já cadastrado' });
      return;
    }
    res.status(500).json({ error: error.message || 'Erro interno' });
  }
});

// Toggle status (ativar/inativar)
router.patch('/:id/toggle-status', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    // Não pode inativar a si mesmo
    if (id === req.user!.userId) {
      res.status(400).json({ error: 'Você não pode inativar seu próprio usuário' });
      return;
    }

    const currentUser = await userService.findById(id);
    if (!currentUser) {
      res.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }

    // Se for ativar, ok. Se for inativar, verificar se é último admin
    if (currentUser.active && currentUser.role === 'ADMIN') {
      const adminCount = await prisma.user.count({ where: { role: 'ADMIN', active: true } });
      if (adminCount <= 1) {
        res.status(400).json({ error: 'Não é possível inativar o último administrador do sistema' });
        return;
      }
    }

    const newStatus = !currentUser.active;
    const user = await userService.update(id, { active: newStatus });

    await auditService.log({
      userId: req.user!.userId,
      action: newStatus ? 'ACTIVATE' : 'INACTIVATE',
      entity: 'User',
      entityId: id,
      details: { active: newStatus },
    });

    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erro interno' });
  }
});

// Resetar senha (gera senha temporária)
router.post('/:id/reset-password', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    // Gera senha temporária de 10 caracteres
    const tempPassword = crypto.randomBytes(5).toString('hex'); // 10 chars hex
    await userService.resetPassword(id, tempPassword);

    await auditService.log({
      userId: req.user!.userId,
      action: 'RESET_PASSWORD',
      entity: 'User',
      entityId: id,
    });

    res.json({ message: 'Senha resetada com sucesso', tempPassword });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erro interno' });
  }
});

export default router;
