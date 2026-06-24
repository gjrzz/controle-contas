import type { Company } from './company';
import type { ServiceType } from './company';

export type ContractStatus = 'ATIVO' | 'ENCERRADO' | 'SUSPENSO';

export interface Contract {
  id: string;
  companyId: string;
  serviceTypeId: string;
  contractNumber: string;
  monthlyValue: string; // Decimal vem como string
  startDate: string;
  endDate: string;
  invoiceDueDay: number;
  serviceCity: string;
  serviceState: string;
  description: string | null;
  filePath: string | null;
  status: ContractStatus;
  createdAt: string;
  updatedAt: string;
  company: Company;
  serviceType: ServiceType;
}
