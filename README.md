# Controle de Contas

Sistema web de controle de contas/faturas para uso interno corporativo. Gerencia contratos, empresas fornecedoras e faturas com fluxo de aprovação multi-perfil.

## Stack

| Camada         | Tecnologia                          |
|----------------|-------------------------------------|
| Frontend       | React 19 + TypeScript + Vite + Tailwind CSS 4 + Recharts |
| Backend        | Node.js + Express + TypeScript      |
| Banco de Dados | PostgreSQL + Prisma ORM             |
| Autenticação   | JWT (access + refresh tokens)       |
| Validação      | Zod                                 |

## Módulos

- **Dashboard** — visão gerencial com gráficos de custos acumulados por área, evolução mensal (previsto vs realizado), custos por tipo de serviço e por empresa. Cards clicáveis que redirecionam para os dados filtrados.
- **Empresas** — cadastro de fornecedores com CNPJ validado (dígitos verificadores), auto-preenchimento de endereço via ViaCEP, tipos de serviço cadastráveis.
- **Contratos** — gestão de contratos vinculados a empresas, com upload de PDF, alertas de vencimento em 30 dias, histórico de alterações.
- **Faturas** — core do sistema. Fluxo de aprovação (PENDENTE → EM_ANALISE → APROVADA → LIBERADA → PAGA), validação de valores contra contrato e histórico, itens detalhados com praça/localidade por item, verificação de duplicidade.
- **Calendário** — visão mensal com eventos de emissão, vencimento, faturas não informadas e pendentes de aprovação. Painel de alertas e resumo do mês.
- **Usuários** — gestão de usuários com 4 perfis de acesso, ativação/inativação, reset de senha com geração de temporária.

## Perfis de Acesso

| Perfil | Permissões |
|--------|-----------|
| Admin | Acesso total, gerencia usuários |
| Operador | Cadastra empresas, contratos e faturas |
| Aprovador | Revisa e aprova/rejeita faturas |
| Financeiro | Libera pagamento e confirma faturas pagas |

## Estrutura

```
controle-contas/
├── backend/
│   ├── prisma/             # Schema e migrations
│   ├── src/
│   │   ├── config/         # Env, Prisma client, upload (multer)
│   │   ├── middlewares/    # Auth + autorização por role
│   │   ├── routes/         # Auth, Users, Companies, Contracts, Invoices, Calendar, Dashboard
│   │   ├── services/       # Lógica de negócio por domínio
│   │   ├── seeds/          # Dados iniciais
│   │   ├── utils/          # Validação CNPJ
│   │   ├── app.ts
│   │   └── server.ts
│   ├── uploads/            # Arquivos PDF (contratos e NFs)
│   └── .env.example
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── background/     # Imagem de fundo da aplicação
│   │   ├── fonts/          # Graphie + Termina
│   │   ├── components/     # Layout, formulários, modais
│   │   ├── contexts/       # AuthContext
│   │   ├── pages/          # Dashboard, Empresas, Contratos, Faturas, Calendário, Usuários
│   │   ├── services/       # API client (axios), ViaCEP
│   │   ├── types/          # Tipos TypeScript
│   │   ├── utils/          # Máscaras, validação CNPJ
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── vite.config.ts
└── package.json            # Workspace root
```

## Pré-requisitos

- Node.js 20+
- PostgreSQL 15+

## Setup

1. Clone o repositório e instale as dependências:
```bash
npm install
```

2. Configure o banco de dados — crie um banco PostgreSQL e configure a connection string em `backend/.env` (use o `.env.example` como referência):
```bash
cp backend/.env.example backend/.env
# Edite backend/.env com suas credenciais
```

3. Execute as migrations:
```bash
npm run db:migrate
```

4. Execute o seed (cria usuários e tipos de serviço iniciais):
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

## API Endpoints

### Auth
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `GET /api/auth/me`

### Empresas
- `GET /api/companies` — listagem com filtros
- `POST /api/companies` — cadastro
- `PUT /api/companies/:id` — edição
- `PATCH /api/companies/:id/toggle-status` — ativar/inativar

### Contratos
- `GET /api/contracts` — listagem com filtros
- `GET /api/contracts/expiring` — contratos vencendo
- `POST /api/contracts` — cadastro (com upload PDF)
- `PUT /api/contracts/:id` — edição
- `GET /api/contracts/:id/file` — download do PDF
- `GET /api/contracts/:id/history` — histórico

### Faturas
- `GET /api/invoices` — listagem paginada com filtros
- `POST /api/invoices` — cadastro (com upload PDF)
- `PUT /api/invoices/:id` — edição (somente PENDENTE)
- `PATCH /api/invoices/:id/status` — transição de status
- `POST /api/invoices/validate` — validação de valor
- `POST /api/invoices/check-duplicate` — verificação de duplicidade
- `GET /api/invoices/:id/file` — download do PDF
- `GET /api/invoices/:id/history` — histórico

### Calendário
- `GET /api/calendar?month=6&year=2026` — eventos e resumo do mês

### Dashboard
- `GET /api/dashboard/summary` — cards de resumo
- `GET /api/dashboard/monthly-evolution` — gráfico de linha
- `GET /api/dashboard/by-service-type` — gráfico de pizza
- `GET /api/dashboard/by-company` — gráfico de barras
- `GET /api/dashboard/stacked-evolution` — barras empilhadas
- `GET /api/dashboard/top-invoices` — top faturas do período

### Usuários (Admin)
- `GET /api/users`
- `POST /api/users`
- `PUT /api/users/:id`
- `PATCH /api/users/:id/toggle-status`
- `POST /api/users/:id/reset-password`

### Tipos de Serviço
- `GET /api/service-types`
- `POST /api/service-types`

## Design

- **Fontes**: Graphie (corpo) + Termina (títulos)
- **Cores**: Primária `#57489c`, Dark `#242424`, Cards `rgba(255,255,255,0.90)`
- **Background**: Imagem fixa com blur nos elementos de conteúdo
- **Sidebar/Header**: Dark com transparência leve

## Licença

Uso interno — não distribuir.
