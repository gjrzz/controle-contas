export type Role = 'ADMIN' | 'OPERADOR' | 'APROVADOR' | 'FINANCEIRO';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  active: boolean;
  createdAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
}
