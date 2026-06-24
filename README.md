# Controle de Contas

Sistema web de controle de contas/faturas para uso interno corporativo.

## Stack

| Camada         | Tecnologia                          |
|----------------|-------------------------------------|
| Frontend       | React 19 + TypeScript + Vite + Tailwind CSS 4 |
| Backend        | Node.js + Express + TypeScript      |
| Banco de Dados | PostgreSQL + Prisma ORM             |
| Autenticação   | JWT (access + refresh tokens)       |
| Validação      | Zod                                 |

## Estrutura

```
controle-contas/
├── backend/
│   ├── prisma/           # Schema e migrations
│   ├── src/
│   │   ├── config/       # Variáveis de ambiente, Prisma client
│   │   ├── middlewares/  # Auth, autorização
│   │   ├── routes/       # Rotas da API
│   │   ├── services/     # Lógica de negócio
│   │   ├── seeds/        # Seed de dados iniciais
│   │   ├── app.ts        # Configuração Express
│   │   └── server.ts     # Entrypoint
│   └── .env.example
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/   # Layout, ProtectedRoute
│   │   ├── contexts/     # AuthContext
│   │   ├── pages/        # Login, Dashboard, etc.
│   │   ├── services/     # API client (axios)
│   │   ├── types/        # Tipos TypeScript
│   │   ├── App.tsx       # Rotas da aplicação
│   │   └── main.tsx      # Entrypoint
│   └── vite.config.ts
└── package.json          # Workspace root
```

## Pré-requisitos

- Node.js 20+
- PostgreSQL 15+

## Setup

1. Clone o repositório e instale as dependências:
```bash
npm install
```

2. Configure o banco de dados — crie um banco PostgreSQL chamado `controle_contas` e ajuste a connection string em `backend/.env`:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/controle_contas"
```

3. Execute as migrations:
```bash
npm run db:migrate
```

4. Execute o seed (cria usuários de teste):
```bash
npm run db:seed
```

5. Inicie o backend:
```bash
npm run dev:backend
```

6. Em outro terminal, inicie o frontend:
```bash
npm run dev:frontend
```

Acesse http://localhost:5173

## Usuários de Teste

| Email                    | Senha  | Perfil      |
|--------------------------|--------|-------------|
| admin@empresa.com        | 123456 | Admin       |
| operador@empresa.com     | 123456 | Operador    |
| aprovador@empresa.com    | 123456 | Aprovador   |
| financeiro@empresa.com   | 123456 | Financeiro  |

## Perfis de Acesso

- **Admin**: acesso total, gerencia usuários
- **Operador**: cadastra empresas, contratos e faturas
- **Aprovador**: revisa e aprova faturas
- **Financeiro**: visualiza faturas aprovadas e libera pagamento

## API Endpoints

### Auth
- `POST /api/auth/login` — Login
- `POST /api/auth/refresh` — Refresh token
- `GET /api/auth/me` — Perfil do usuário autenticado

### Users (Admin only)
- `GET /api/users` — Lista usuários
- `POST /api/users` — Cria usuário
- `PUT /api/users/:id` — Atualiza usuário
- `POST /api/users/:id/reset-password` — Reseta senha
