import type { Company } from './company';
import type { ServiceType } from './company';

export type ContractStatus = 'ATIVO' | 'ENCERRADO' | 'SUSPENSO';

export interface Contract {
  id: string;
  companyId: string;
  serviceTypeId: string;
  contractNumber: string;
  monthlyValue: string;
  startDate: string;
  endDate: string;
  invoiceDueDay: number;
  description: string | null;
  files: string[] | null;
  status: ContractStatus;
  createdAt: string;
  updatedAt: string;
  company: Company;
  serviceType: ServiceType;
}
