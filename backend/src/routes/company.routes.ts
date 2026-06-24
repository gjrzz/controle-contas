import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { CompanyService } from '../services/company.service';
import { AuditService } from '../services/audit.service';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validateCNPJ, cleanCNPJ } from '../utils/cnpj';
import { CompanyStatus } from '@prisma/client';

const router = Router();
const companyService = new CompanyService();
const auditService = new AuditService();

const createCompanySchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  cnpj: z.string().min(14, 'CNPJ inválido'),
  serviceTypeId: z.string().uuid('Tipo de serviço inválido'),
  email: z.string().email('Email inválido'),
  phone: z.string().min(10, 'Telefone inválido'),
  cep: z.string().min(8, 'CEP inválido'),
  street: z.string().min(2, 'Logradouro obrigatório'),
  number: z.string().min(1, 'Número obrigatório'),
  complement: z.string().optional(),
  neighborhood: z.string().min(2, 'Bairro obrigatório'),
  city: z.string().min(2, 'Cidade obrigatória'),
  state: z.string().length(2, 'Estado deve ter 2 caracteres'),
});

const updateCompanySchema = z.object({
  name: z.string().min(2).optional(),
  serviceTypeId: z.string().uuid().optional(),
  email: z.string().email().optional(),
  phone: z.string().min(10).optional(),
  cep: z.string().min(8).optional(),
  street: z.string().min(2).optional(),
  number: z.string().min(1).optional(),
  complement: z.string().optional(),
  neighborhood: z.string().min(2).optional(),
  city: z.string().min(2).optional(),
  state: z.string().length(2).optional(),
  status: z.nativeEnum(CompanyStatus).optional(),
});

router.use(authenticate);

// Listagem — todos os perfis autenticados
router.get('/', async (req: Request, res: Response) => {
  const filters = {
    name: req.query.name as string | undefined,
    cnpj: req.query.cnpj as string | undefined,
    serviceTypeId: req.query.serviceTypeId as string | undefined,
    status: req.query.status as CompanyStatus | undefined,
  };
  const companies = await companyService.findAll(filters);
  res.json(companies);
});

// Detalhes
router.get('/:id', async (req: Request, res: Response) => {
  const company = await companyService.findById(req.params.id as string);
  if (!company) {
    res.status(404).json({ error: 'Empresa não encontrada' });
    return;
  }
  res.json(company);
});

// Cadastro — ADMIN e OPERADOR
router.post('/', authorize('ADMIN', 'OPERADOR'), async (req: Request, res: Response) => {
  try {
    const data = createCompanySchema.parse(req.body);

    // Valida CNPJ
    if (!validateCNPJ(data.cnpj)) {
      res.status(400).json({ error: 'CNPJ inválido (dígitos verificadores não conferem)' });
      return;
    }

    const cnpjClean = cleanCNPJ(data.cnpj);

    // Verifica duplicidade
    const existing = await companyService.findByCnpj(cnpjClean);
    if (existing) {
      res.status(409).json({ error: 'CNPJ já cadastrado no sistema' });
      return;
    }

    const company = await companyService.create({
      ...data,
      cnpj: cnpjClean,
      cep: data.cep.replace(/\D/g, ''),
      phone: data.phone.replace(/\D/g, ''),
    });

    await auditService.log({
      userId: req.user!.userId,
      action: 'CREATE',
      entity: 'Company',
      entityId: company.id,
      details: { name: company.name, cnpj: company.cnpj },
    });

    res.status(201).json(company);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Dados inválidos', details: error.errors });
      return;
    }
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Edição — ADMIN e OPERADOR
router.put('/:id', authorize('ADMIN', 'OPERADOR'), async (req: Request, res: Response) => {
  try {
    const data = updateCompanySchema.parse(req.body);
    const id = req.params.id as string;
    const company = await companyService.update(id, data);

    await auditService.log({
      userId: req.user!.userId,
      action: 'UPDATE',
      entity: 'Company',
      entityId: company.id,
      details: data,
    });

    res.json(company);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Dados inválidos', details: error.errors });
      return;
    }
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Toggle status — ADMIN e OPERADOR
router.patch('/:id/toggle-status', authorize('ADMIN', 'OPERADOR'), async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const company = await companyService.toggleStatus(id);

    await auditService.log({
      userId: req.user!.userId,
      action: 'TOGGLE_STATUS',
      entity: 'Company',
      entityId: company.id,
      details: { newStatus: company.status },
    });

    res.json(company);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erro interno' });
  }
});

export default router;
