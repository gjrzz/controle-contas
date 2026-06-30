import { Router, Request, Response } from 'express';
import { z } from 'zod';
import path from 'path';
import archiver from 'archiver';
import fs from 'fs';
import { InvoiceService } from '../services/invoice.service';
import { AuditService } from '../services/audit.service';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { upload, uploadsPath } from '../config/upload';
import { validatePdfFiles } from '../middlewares/fileValidator';
import { InvoiceStatus } from '@prisma/client';

const router = Router();
const invoiceService = new InvoiceService();
const auditService = new AuditService();

const invoiceItemSchema = z.object({
  description: z.string().min(1, 'Descrição do item obrigatória'),
  unitValue: z.coerce.number().positive('Valor unitário deve ser positivo'),
  quantity: z.coerce.number().positive('Quantidade deve ser positiva'),
  serviceCity: z.string().optional(),
  serviceState: z.string().max(2).optional(),
  serviceTypeId: z.string().uuid().optional(),
});

const createInvoiceSchema = z.object({
  companyId: z.string().uuid(),
  contractId: z.string().uuid(),
  serviceTypeId: z.string().uuid(),
  invoiceNumber: z.string().min(1, 'Número da fatura obrigatório'),
  issueDate: z.string().min(1, 'Data de emissão obrigatória'),
  dueDate: z.string().min(1, 'Data de vencimento obrigatória'),
  competenceMonth: z.coerce.number().int().min(1).max(12),
  competenceYear: z.coerce.number().int().min(2020).max(2100),
  serviceCity: z.string().min(2, 'Cidade obrigatória'),
  serviceState: z.string().length(2, 'Estado deve ter 2 caracteres'),
  description: z.string().optional(),
  totalValue: z.coerce.number().positive('Valor deve ser positivo'),
  justification: z.string().optional(),
  items: z.string().transform((val) => {
    const parsed = JSON.parse(val);
    return z.array(invoiceItemSchema).min(1, 'Pelo menos um item é obrigatório').parse(parsed);
  }),
});

const updateInvoiceSchema = z.object({
  serviceTypeId: z.string().uuid().optional(),
  invoiceNumber: z.string().min(1).optional(),
  issueDate: z.string().optional(),
  dueDate: z.string().optional(),
  competenceMonth: z.coerce.number().int().min(1).max(12).optional(),
  competenceYear: z.coerce.number().int().min(2020).max(2100).optional(),
  serviceCity: z.string().min(2).optional(),
  serviceState: z.string().length(2).optional(),
  description: z.string().optional(),
  totalValue: z.coerce.number().positive().optional(),
  justification: z.string().optional(),
  items: z.string().transform((val) => {
    const parsed = JSON.parse(val);
    return z.array(invoiceItemSchema).min(1).parse(parsed);
  }).optional(),
});

const transitionSchema = z.object({
  status: z.nativeEnum(InvoiceStatus),
  rejectionReason: z.string().optional(),
  paymentDate: z.string().optional(),
});

// Mapa de transições válidas por role
const validTransitions: Record<string, Record<string, InvoiceStatus[]>> = {
  ADMIN: {
    PENDENTE: ['EM_ANALISE', 'REJEITADA'],
    EM_ANALISE: ['APROVADA', 'REJEITADA'],
    APROVADA: ['LIBERADA_FINANCEIRO'],
    LIBERADA_FINANCEIRO: ['PAGA'],
  },
  APROVADOR: {
    PENDENTE: ['EM_ANALISE'],
    EM_ANALISE: ['APROVADA', 'REJEITADA'],
  },
  FINANCEIRO: {
    APROVADA: ['LIBERADA_FINANCEIRO'],
    LIBERADA_FINANCEIRO: ['PAGA'],
  },
};

router.use(authenticate);

// Listagem com paginação e filtros
router.get('/', async (req: Request, res: Response) => {
  const filters = {
    companyId: req.query.companyId as string | undefined,
    serviceTypeId: req.query.serviceTypeId as string | undefined,
    status: req.query.status as InvoiceStatus | undefined,
    competenceMonth: req.query.competenceMonth ? Number(req.query.competenceMonth) : undefined,
    competenceYear: req.query.competenceYear ? Number(req.query.competenceYear) : undefined,
    dueDateFrom: req.query.dueDateFrom as string | undefined,
    dueDateTo: req.query.dueDateTo as string | undefined,
    overdue: req.query.overdue === 'true',
    page: req.query.page ? Number(req.query.page) : 1,
    limit: req.query.limit ? Number(req.query.limit) : 20,
  };

  const result = await invoiceService.findAll(filters);
  res.json(result);
});

// Validar valor (endpoint auxiliar para o frontend)
router.post('/validate', async (req: Request, res: Response) => {
  try {
    const { contractId, totalValue, excludeInvoiceId } = req.body;
    const validation = await invoiceService.validateInvoiceValue(contractId, Number(totalValue), excludeInvoiceId);
    res.json(validation);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Verificar duplicidade
router.post('/check-duplicate', async (req: Request, res: Response) => {
  try {
    const { companyId, competenceMonth, competenceYear, excludeId } = req.body;
    const existing = await invoiceService.checkDuplicate(companyId, Number(competenceMonth), Number(competenceYear), excludeId);
    res.json({ duplicate: !!existing, existing });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Detalhes
router.get('/:id', async (req: Request, res: Response) => {
  const invoice = await invoiceService.findById(req.params.id as string);
  if (!invoice) {
    res.status(404).json({ error: 'Fatura não encontrada' });
    return;
  }
  res.json(invoice);
});

// Download do arquivo
router.get('/:id/files', async (req: Request, res: Response) => {
  const invoice = await invoiceService.findById(req.params.id as string);
  if (!invoice) {
    res.status(404).json({ error: 'Fatura não encontrada' });
    return;
  }
  res.json(invoice.files || []);
});

// Download de arquivo específico
router.get('/:id/files/:filename', async (req: Request, res: Response) => {
  const invoice = await invoiceService.findById(req.params.id as string);
  const files = (invoice?.files as string[]) || [];
  const filename = req.params.filename as string;
  
  if (!invoice || !files.includes(filename)) {
    res.status(404).json({ error: 'Arquivo não encontrado' });
    return;
  }

  const filePath = path.resolve(uploadsPath, filename);
  res.download(filePath, filename);
});

// Download de todos os arquivos em ZIP
router.get('/:id/download-zip', async (req: Request, res: Response) => {
  const invoice = await invoiceService.findById(req.params.id as string);
  const files = (invoice?.files as string[]) || [];

  if (!invoice || files.length === 0) {
    res.status(404).json({ error: 'Nenhum arquivo encontrado' });
    return;
  }

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename=fatura-${invoice.invoiceNumber}.zip`);

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.pipe(res);

  for (const filename of files) {
    const filePath = path.resolve(uploadsPath, filename);
    if (fs.existsSync(filePath)) {
      archive.file(filePath, { name: filename });
    }
  }

  archive.finalize();
});

// Cadastro — ADMIN e OPERADOR
router.post('/', authorize('ADMIN', 'OPERADOR'), upload.array('files', 10), validatePdfFiles, async (req: Request, res: Response) => {
  try {
    const data = createInvoiceSchema.parse(req.body);
    const files = (req.files as Express.Multer.File[] | undefined)?.map(f => f.filename) || [];

    // Validação de soma dos itens
    const itemsTotal = data.items.reduce((sum, item) => sum + Number((item.unitValue * item.quantity).toFixed(2)), 0);
    const totalDiff = Math.abs(itemsTotal - data.totalValue);
    if (totalDiff > 0.01) {
      res.status(400).json({
        error: `Soma dos itens (R$ ${itemsTotal.toFixed(2)}) não confere com o valor total (R$ ${data.totalValue.toFixed(2)}).`,
      });
      return;
    }

    // Validação de valor vs contrato
    const validation = await invoiceService.validateInvoiceValue(data.contractId, data.totalValue);
    if (!validation.valid && !data.justification) {
      res.status(400).json({
        error: 'Valor diverge significativamente do contrato. Justificativa obrigatória.',
        blocks: validation.blocks,
        alerts: validation.alerts,
        contractValue: validation.contractValue,
        lastPaidValue: validation.lastPaidValue,
      });
      return;
    }

    // Verificação de duplicidade (apenas alerta, não bloqueia)
    const duplicate = await invoiceService.checkDuplicate(data.companyId, data.competenceMonth, data.competenceYear);

    const invoice = await invoiceService.create({
      ...data,
      files,
    });

    await auditService.log({
      userId: req.user!.userId,
      action: 'CREATE',
      entity: 'Invoice',
      entityId: invoice.id,
      details: {
        invoiceNumber: invoice.invoiceNumber,
        companyId: invoice.companyId,
        totalValue: Number(invoice.totalValue),
        status: invoice.status,
      },
    });

    res.status(201).json({
      invoice,
      warnings: {
        alerts: validation.alerts,
        duplicate: duplicate ? `Já existe fatura para esta empresa na competência ${data.competenceMonth}/${data.competenceYear}.` : null,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Dados inválidos', details: error.errors });
      return;
    }
    res.status(500).json({ error: error.message || 'Erro interno' });
  }
});

// Edição — somente se PENDENTE, ADMIN e OPERADOR
router.put('/:id', authorize('ADMIN', 'OPERADOR'), upload.array('files', 10), validatePdfFiles, async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const existing = await invoiceService.findById(id);

    if (!existing) {
      res.status(404).json({ error: 'Fatura não encontrada' });
      return;
    }
    if (existing.status !== 'PENDENTE') {
      res.status(400).json({ error: 'Somente faturas com status PENDENTE podem ser editadas' });
      return;
    }

    const data = updateInvoiceSchema.parse(req.body);
    const newFiles = (req.files as Express.Multer.File[] | undefined)?.map(f => f.filename) || [];

    // Get existing files and append new ones
    const existingFiles = (existing?.files as string[]) || [];
    const allFiles = [...existingFiles, ...newFiles];

    // Validação de soma dos itens (se itens foram enviados)
    if (data.items && data.totalValue) {
      const itemsTotal = data.items.reduce((sum, item) => sum + Number((item.unitValue * item.quantity).toFixed(2)), 0);
      const totalDiff = Math.abs(itemsTotal - data.totalValue);
      if (totalDiff > 0.01) {
        res.status(400).json({
          error: `Soma dos itens (R$ ${itemsTotal.toFixed(2)}) não confere com o valor total (R$ ${data.totalValue.toFixed(2)}).`,
        });
        return;
      }
    }

    const updateData = { ...data, files: allFiles };
    const invoice = await invoiceService.update(id, updateData);

    await auditService.log({
      userId: req.user!.userId,
      action: 'UPDATE',
      entity: 'Invoice',
      entityId: invoice.id,
      details: data as any,
    });

    res.json(invoice);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Dados inválidos', details: error.errors });
      return;
    }
    res.status(500).json({ error: error.message || 'Erro interno' });
  }
});

// Transição de status
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { status, rejectionReason, paymentDate } = transitionSchema.parse(req.body);

    const invoice = await invoiceService.findById(id);
    if (!invoice) {
      res.status(404).json({ error: 'Fatura não encontrada' });
      return;
    }

    const role = req.user!.role;
    const currentStatus = invoice.status;

    // Verifica se a transição é válida para o role
    const roleTransitions = validTransitions[role];
    if (!roleTransitions) {
      res.status(403).json({ error: 'Seu perfil não pode alterar status de faturas' });
      return;
    }

    const allowedNextStatuses = roleTransitions[currentStatus];
    if (!allowedNextStatuses || !allowedNextStatuses.includes(status)) {
      res.status(400).json({
        error: `Transição de ${currentStatus} para ${status} não é permitida para o perfil ${role}`,
      });
      return;
    }

    // Validações específicas
    if (status === 'REJEITADA' && !rejectionReason) {
      res.status(400).json({ error: 'Motivo da rejeição é obrigatório' });
      return;
    }
    if (status === 'PAGA' && !paymentDate) {
      res.status(400).json({ error: 'Data de pagamento é obrigatória' });
      return;
    }

    const updated = await invoiceService.transitionStatus({
      invoiceId: id,
      newStatus: status,
      rejectionReason,
      paymentDate,
    });

    await auditService.log({
      userId: req.user!.userId,
      action: 'STATUS_CHANGE',
      entity: 'Invoice',
      entityId: id,
      details: {
        from: currentStatus,
        to: status,
        rejectionReason,
        paymentDate,
      },
    });

    res.json(updated);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Dados inválidos', details: error.errors });
      return;
    }
    res.status(500).json({ error: error.message || 'Erro interno' });
  }
});

// Histórico de alterações
router.get('/:id/history', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const history = await auditService.getByEntity('Invoice', id);
  res.json(history);
});

export default router;
