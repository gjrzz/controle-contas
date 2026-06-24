import { Router, Request, Response } from 'express';
import { z } from 'zod';
import path from 'path';
import { ContractService } from '../services/contract.service';
import { AuditService } from '../services/audit.service';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { upload, uploadsPath } from '../config/upload';
import { ContractStatus } from '@prisma/client';

const router = Router();
const contractService = new ContractService();
const auditService = new AuditService();

const createContractSchema = z.object({
  companyId: z.string().uuid('Empresa inválida'),
  serviceTypeId: z.string().uuid('Tipo de serviço inválido'),
  contractNumber: z.string().min(1, 'Número do contrato obrigatório'),
  monthlyValue: z.coerce.number().positive('Valor deve ser positivo'),
  startDate: z.string().min(1, 'Data de início obrigatória'),
  endDate: z.string().min(1, 'Data de vencimento obrigatória'),
  invoiceDueDay: z.coerce.number().int().min(1).max(31, 'Dia deve ser entre 1 e 31'),
  serviceCity: z.string().min(2, 'Cidade obrigatória'),
  serviceState: z.string().length(2, 'Estado deve ter 2 caracteres'),
  description: z.string().optional(),
});

const updateContractSchema = z.object({
  serviceTypeId: z.string().uuid().optional(),
  contractNumber: z.string().min(1).optional(),
  monthlyValue: z.coerce.number().positive().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  invoiceDueDay: z.coerce.number().int().min(1).max(31).optional(),
  serviceCity: z.string().min(2).optional(),
  serviceState: z.string().length(2).optional(),
  description: z.string().optional(),
  status: z.nativeEnum(ContractStatus).optional(),
});

router.use(authenticate);

// Listagem — todos os perfis autenticados
router.get('/', async (req: Request, res: Response) => {
  const filters = {
    companyId: req.query.companyId as string | undefined,
    serviceTypeId: req.query.serviceTypeId as string | undefined,
    status: req.query.status as ContractStatus | undefined,
    expiringInDays: req.query.expiringInDays ? Number(req.query.expiringInDays) : undefined,
  };
  const contracts = await contractService.findAll(filters);
  res.json(contracts);
});

// Contratos próximos do vencimento
router.get('/expiring', async (req: Request, res: Response) => {
  const days = req.query.days ? Number(req.query.days) : 30;
  const contracts = await contractService.getExpiringContracts(days);
  res.json(contracts);
});

// Detalhes
router.get('/:id', async (req: Request, res: Response) => {
  const contract = await contractService.findById(req.params.id as string);
  if (!contract) {
    res.status(404).json({ error: 'Contrato não encontrado' });
    return;
  }
  res.json(contract);
});

// Download do arquivo
router.get('/:id/file', async (req: Request, res: Response) => {
  const contract = await contractService.findById(req.params.id as string);
  if (!contract || !contract.filePath) {
    res.status(404).json({ error: 'Arquivo não encontrado' });
    return;
  }

  const filePath = path.resolve(uploadsPath, contract.filePath);
  res.download(filePath, `contrato-${contract.contractNumber}.pdf`);
});

// Cadastro — ADMIN e OPERADOR
router.post('/', authorize('ADMIN', 'OPERADOR'), upload.single('file'), async (req: Request, res: Response) => {
  try {
    const data = createContractSchema.parse(req.body);
    const filePath = req.file ? req.file.filename : undefined;

    const contract = await contractService.create({
      ...data,
      filePath,
    });

    await auditService.log({
      userId: req.user!.userId,
      action: 'CREATE',
      entity: 'Contract',
      entityId: contract.id,
      details: { contractNumber: contract.contractNumber, companyId: contract.companyId },
    });

    res.status(201).json(contract);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Dados inválidos', details: error.errors });
      return;
    }
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'Número de contrato já cadastrado' });
      return;
    }
    res.status(500).json({ error: error.message || 'Erro interno' });
  }
});

// Edição — ADMIN e OPERADOR
router.put('/:id', authorize('ADMIN', 'OPERADOR'), upload.single('file'), async (req: Request, res: Response) => {
  try {
    const data = updateContractSchema.parse(req.body);
    const id = req.params.id as string;
    const filePath = req.file ? req.file.filename : undefined;

    const updateData = filePath ? { ...data, filePath } : data;
    const contract = await contractService.update(id, updateData);

    await auditService.log({
      userId: req.user!.userId,
      action: 'UPDATE',
      entity: 'Contract',
      entityId: contract.id,
      details: data,
    });

    res.json(contract);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Dados inválidos', details: error.errors });
      return;
    }
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'Número de contrato já cadastrado' });
      return;
    }
    res.status(500).json({ error: error.message || 'Erro interno' });
  }
});

// Histórico de alterações
router.get('/:id/history', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const history = await auditService.getByEntity('Contract', id);
  res.json(history);
});

export default router;
