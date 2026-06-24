import type { Company } from './company';
import type { Contract } from './contract';
import type { ServiceType } from './company';

export type InvoiceStatus = 'PENDENTE' | 'EM_ANALISE' | 'APROVADA' | 'REJEITADA' | 'LIBERADA_FINANCEIRO' | 'PAGA';

export interface InvoiceItem {
  id?: string;
  description: string;
  unitValue: string | number;
  quantity: string | number;
  totalValue: string | number;
  serviceCity?: string;
  serviceState?: string;
}

export interface Invoice {
  id: string;
  companyId: string;
  contractId: string;
  serviceTypeId: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  competenceMonth: number;
  competenceYear: number;
  serviceCity: string;
  serviceState: string;
  description: string | null;
  totalValue: string;
  filePath: string | null;
  status: InvoiceStatus;
  justification: string | null;
  rejectionReason: string | null;
  paymentDate: string | null;
  createdAt: string;
  updatedAt: string;
  company: Company;
  contract: Contract;
  serviceType: ServiceType;
  items: InvoiceItem[];
}

export interface InvoicePaginatedResponse {
  data: Invoice[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ValidationResult {
  valid: boolean;
  alerts: string[];
  blocks: string[];
  contractValue?: number;
  lastPaidValue?: number | null;
}
