export interface ServiceType {
  id: string;
  name: string;
  createdAt: string;
}

export type CompanyStatus = 'ATIVA' | 'INATIVA';

export interface Company {
  id: string;
  name: string;
  cnpj: string;
  serviceTypeId: string;
  email: string;
  phone: string;
  status: CompanyStatus;
  cep: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  createdAt: string;
  updatedAt: string;
  serviceType: ServiceType;
}

export interface CreateCompanyInput {
  name: string;
  cnpj: string;
  serviceTypeId: string;
  email: string;
  phone: string;
  cep: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
}
