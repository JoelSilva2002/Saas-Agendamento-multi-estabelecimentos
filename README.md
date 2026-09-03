# AgendaSaaS — Sistema de Agendamento Multi-Tenant

Plataforma SaaS de agendamento para estabelecimentos (barbearias, salões, clínicas, etc.), com
suporte a **múltiplos tenants** e **múltiplos estabelecimentos por tenant**. Cada estabelecimento
gerencia sua própria agenda, equipe, serviços e clientes, com controle de acesso baseado em papéis
(RBAC) e isolamento total de dados entre tenants.

🔗 **Demo:** [saas-agendamento-multi-estabelecime.vercel.app](https://saas-agendamento-multi-estabelecime.vercel.app)

## Visão geral

O projeto é dividido em duas aplicações no mesmo monorepo:

- **`/` (raiz)** — API backend em [NestJS](https://nestjs.com/), organizada em módulos com
  arquitetura em camadas (`domain` / `application` / `infrastructure` / `presentation`).
- **`/frontend`** — painel administrativo e área do cliente em [Next.js](https://nextjs.org/) 16
  (App Router, React 19).

## Principais funcionalidades

- **Multi-tenant real**: um tenant pode operar várias unidades/estabelecimentos, com dados,
  agenda e equipe isolados entre eles.
- **RBAC (controle de acesso por papéis)**: papéis e permissões podem ser concedidos por tenant
  inteiro ou por estabelecimento específico, com isolamento verificado por testes e2e dedicados
  (`rbac-tenant-isolation`).
- **Agenda e agendamentos**: criação, check-in, cancelamento/remarcação, bloqueios de agenda
  (`agenda-blocks`), horários de funcionamento e exceções de disponibilidade por profissional.
- **Equipe e serviços**: cadastro de profissionais (`employees`), jornada de trabalho, vínculo
  profissional↔serviço, categorias e catálogo de serviços.
- **Clientes**: cadastro e histórico de clientes (`clients`), auto-cadastro de cliente
  (`client-registration`) e perfil do cliente.
- **Pagamentos**: integração com gateway de pagamento (modo sandbox por padrão) e webhook de
  confirmação.
- **Cupons e lista de espera**: cupons de desconto com resgate (`coupons`) e fila de espera
  (`waitlist`) quando não há horário disponível.
- **Avaliações**: coleta de reviews de clientes por estabelecimento.
- **Notificações**: e-mails transacionais via [Resend](https://resend.com) (modo *log-only*
  quando não configurado), com links para a área do cliente.
- **Dashboard e relatórios**: indicadores operacionais e relatórios por estabelecimento.
- **API de integração** (`/integrations/v1`): API máquina-a-máquina autenticada por API key,
  pensada para automações externas (ex.: bot de WhatsApp) consultarem disponibilidade e criarem
  agendamentos, com *rate limit* e suporte a idempotência (`Idempotency-Key`). Veja
  [`docs/api-integracao.md`](docs/api-integracao.md).
- **Upload de mídia**: logo e galeria de fotos do estabelecimento, atrás de uma porta
  (`FileStoragePort`) com adaptador de disco local — veja
  [`docs/armazenamento-de-midia.md`](docs/armazenamento-de-midia.md).
- **Área pública**: endpoints públicos para exibir estabelecimento, catálogo e disponibilidade
  sem autenticação.

## Stack técnica

**Backend**
- [NestJS](https://nestjs.com/) 10 + TypeScript
- [Prisma ORM](https://www.prisma.io/) 5 + PostgreSQL
- Autenticação JWT (`@nestjs/jwt`, `passport-jwt`) com hash de senha via `argon2`
- Validação com `class-validator` / `class-transformer` e `joi` (variáveis de ambiente)
- `@nestjs/throttler` (rate limiting), `@nestjs/schedule` (jobs), `@nestjs/event-emitter`
- `sharp` (processamento de imagem) e `pdfkit` (geração de PDF, ex. relatórios)
- Testes com `jest` (unitários e e2e via `supertest`)

**Frontend**
- [Next.js](https://nextjs.org/) 16 (App Router) + React 19 + TypeScript
- Tailwind CSS 4 + [shadcn/ui](https://ui.shadcn.com/) (Radix UI) + `lucide-react`
- `react-hook-form` + `zod` para formulários e validação
- `@fullcalendar/react` para a visualização de agenda
- `next-themes`, `sonner` (toasts), `temporal-polyfill`

**Infra**
- Docker + Docker Compose (Postgres 16 + API)
- Deploy do frontend na Vercel

## Arquitetura

O backend segue uma organização modular inspirada em DDD, onde cada módulo em `src/modules/`
possui suas próprias camadas:

```
src/modules/<modulo>/
├── domain/           # entidades, regras de negócio, portas (interfaces)
├── application/      # casos de uso (use-cases)
├── infrastructure/   # implementações concretas (Prisma, adapters externos)
└── presentation/     # controllers, DTOs, guards
```

Módulos existentes: `auth`, `tenants`, `establishments`, `users`, `rbac`, `clients`, `employees`,
`services`, `appointments`, `agenda-blocks`, `notifications`, `payments`, `dashboard`, `waitlist`,
`coupons`, `reviews`, `reports`, `public`, `api-keys`, `integrations`.

Código compartilhado entre módulos (Prisma, storage de arquivos, processamento de imagem,
utilitários de fuso horário/health check) fica em `src/shared-kernel/`.

## Como rodar localmente

### Pré-requisitos

- Node.js 22+
- PostgreSQL (ou Docker, para subir via `docker-compose`)

### 1. Backend

```bash
# instalar dependências
npm install

# copiar variáveis de ambiente
cp .env.example .env
# edite o .env com seus valores (segredos JWT, credenciais do banco, etc.)

# subir o Postgres via Docker (opcional, se não tiver um local)
docker compose up -d postgres

# gerar client do Prisma e aplicar as migrações
npm run prisma:generate
npm run prisma:migrate

# (opcional) popular o banco com dados de exemplo
npm run prisma:seed

# subir a API em modo desenvolvimento (http://localhost:3000)
npm run start:dev
```

Para rodar tudo (API + Postgres) via Docker Compose:

```bash
docker compose --profile full up --build
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

A aplicação abre em `http://localhost:3001` (ou na porta configurada) e consome a API do
backend.

## Scripts úteis (backend)

| Comando                 | Descrição                                   |
|--------------------------|----------------------------------------------|
| `npm run start:dev`      | Sobe a API em modo watch                     |
| `npm run build`          | Compila para `dist/`                         |
| `npm run lint`           | ESLint com autofix                           |
| `npm run format`         | Formata `src` e `test` com Prettier          |
| `npm run test`           | Testes unitários (Jest)                      |
| `npm run test:e2e`       | Testes end-to-end (Jest + Supertest)         |
| `npm run test:cov`       | Cobertura de testes                          |
| `npm run prisma:migrate` | Cria/aplica migração em desenvolvimento      |
| `npm run prisma:deploy`  | Aplica migrações pendentes (produção)        |
| `npm run prisma:seed`    | Popula o banco com dados de exemplo          |

## Testes

O projeto tem uma suíte e2e cobrindo os principais fluxos de negócio (autenticação,
estabelecimentos e mídia, agendamentos e check-in/exportação, funcionários, serviços, cupons,
lista de espera, avaliações, pagamentos, notificações, relatórios, dashboard, cadastro de
cliente e isolamento de tenant/RBAC):

```bash
npm run test:e2e
```

## Variáveis de ambiente

Veja [`.env.example`](.env.example) para a lista completa. Os principais grupos são:

- **Banco de dados**: `DATABASE_URL` / `DIRECT_URL` (esta última usada só pela CLI do Prisma,
  útil quando `DATABASE_URL` passa por um connection pooler).
- **Autenticação**: `JWT_ACCESS_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `REFRESH_TOKEN_EXPIRES_IN_DAYS`.
- **Seed do admin da plataforma**: `SEED_PLATFORM_ADMIN_EMAIL` / `SEED_PLATFORM_ADMIN_PASSWORD`.
- **Notificações/pagamentos** (opcionais — sem eles a API roda em modo *log/sandbox*):
  `RESEND_API_KEY`, `PAYMENT_GATEWAY_API_URL`, `PAYMENT_GATEWAY_WEBHOOK_SECRET`.
- **Mídia**: `MEDIA_STORAGE_ROOT`, `MEDIA_PUBLIC_BASE_URL`, `MEDIA_MAX_UPLOAD_BYTES`,
  `MEDIA_MAX_GALLERY_PHOTOS`.

## Documentação adicional

- [`docs/api-integracao.md`](docs/api-integracao.md) — API de integração `/integrations/v1`
  (autenticação por API key, rate limit, idempotência, endpoints).
- [`docs/armazenamento-de-midia.md`](docs/armazenamento-de-midia.md) — contrato de
  `FileStoragePort` para trocar o storage local por um provedor em nuvem.
- [`docs/formato-de-data-hora.md`](docs/formato-de-data-hora.md) — padronização de data/hora em
  `pt-BR` e limitações de inputs nativos do navegador.
- [`docs/plano-agendamento-cliente.md`](docs/plano-agendamento-cliente.md) — plano do fluxo de
  agendamento pelo cliente final.

## Licença

Projeto privado (`UNLICENSED`) — uso pessoal/portfólio.

## Autor

Desenvolvido por [Joel Silva](https://github.com/JoelSilva2002).
