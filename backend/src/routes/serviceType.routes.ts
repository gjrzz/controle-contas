import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { ServiceTypeService } from '../services/serviceType.service';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();
const serviceTypeService = new ServiceTypeService();

router.use(authenticate);

router.get('/', async (_req: Request, res: Response) => {
  const types = await serviceTypeService.findAll();
  res.json(types);
});

router.post('/', authorize('ADMIN', 'OPERADOR'), async (req: Request, res: Response) => {
  try {
    const { name } = z.object({ name: z.string().min(2) }).parse(req.body);

    const existing = await serviceTypeService.findByName(name);
    if (existing) {
      res.status(409).json({ error: 'Tipo de serviço já cadastrado' });
      return;
    }

    const type = await serviceTypeService.create(name);
    res.status(201).json(type);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Dados inválidos', details: error.errors });
      return;
    }
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
