# Plano: ligar o assistente de agendamento público (cliente) ao backend real

## Contexto

O assistente em `/[establishmentSlug]/agendar` (`frontend/src/components/booking/booking-wizard.tsx`)
roda inteiramente sobre `createMockBookingApi()` (`frontend/src/lib/booking/mock-api.ts`). Todas as
8 etapas — serviço, profissional, data, horário, login/cadastro, cupom, pagamento, confirmação —
usam dados fake gerados no navegador. Nada persiste no banco real.

Investigação encontrou um descompasso de arquitetura genuíno entre a UX do assistente e as regras
de autorização do backend hoje — não é só trocar `mock-api.ts` por chamadas `fetch`.

## Problemas encontrados

1. **Sem endpoint público para resolver o slug.** A página recebe `establishmentSlug` na URL, mas
   não existe rota sem autenticação que traduza isso em `{tenantId, establishmentId}`.
   `EstablishmentsController` só tem `GET /tenants/:tenantId/establishments` e `GET .../:id`, ambos
   atrás de `@Auth('establishment:read')`.

2. **Catálogo exige login, mas o assistente navega antes de logar.** A ordem hoje é
   Serviço → Profissional → Data → Horário → **Identificação (login/cadastro)** → Cupom → Pagamento
   → Confirmação. As 4 primeiras etapas chamam `GET .../services`, `GET .../services/:id/employees`
   e `GET .../availability`, todas com `@Auth('service:read')` (exige `JwtAuthGuard` +
   `TenantScopeGuard` + `PermissionsGuard`). Um visitante anônimo não consegue chamar nenhuma delas.

3. **Cliente não tem permissão de pagamento.** `PaymentsController.create()` exige
   `@Auth('payment:manage')`. No seed (`prisma/seed.ts`), o papel `client` não tem nenhuma
   permissão de `payment:*`. A etapa de pagamento do assistente não funcionaria mesmo já logado.

4. **O que já funciona sem mudança nenhuma:**
   - `POST /auth/register` — público, já chama `RegisterClientUseCase` (cria User + role `client`
     + `ClientProfile`). Aceita `tenantId`/`establishmentId` no body.
   - `POST /auth/login` — público, já usado pelo login do admin.
   - `POST /tenants/:tenantId/establishments/:establishmentId/appointments` — aceita
     `appointment:create:own`, que o papel `client` já tem; usa `user.id` como `clientId`
     automaticamente (não confia em `dto.clientId` para não-staff).
   - `GET .../availability` (`GetAvailableSlotsUseCase` + `AvailabilityCalculatorService`) — o
     cálculo de disponibilidade real já existe e é usado pela Agenda do admin; só falta torná-lo
     alcançável por um visitante anônimo.

## Decisões de arquitetura a validar com o usuário antes de implementar

- **Catálogo público vs. exigir login primeiro.** Duas opções:
  - (A) Tornar `services`, `services/:id/employees` e `availability` endpoints `@Public()` para
    leitura anônima (dado semi-público, sem informação sensível de outros clientes) — mantém a UX
    atual do assistente (navega, depois loga). **Recomendado**, é o padrão do setor (Booksy, Fresha).
  - (B) Reordenar o assistente pra pedir login/cadastro **antes** da navegação — não exige mudança
    de autorização no backend, mas piora a conversão (visitante precisa criar conta antes de ver
    se há horário disponível).

- **Pagamento pelo próprio cliente: o que significa "pagar" aqui?** Não há gateway real (Pix/cartão)
  integrado em lugar nenhum do projeto — o `Payment` entity já documenta isso ("sandbox mode").
  Duas opções:
  - (A) Cliente escolhe `method: pix/card` e o pagamento nasce `pending`, sem confirmação real (fica
    pendente até staff marcar como pago manualmente na tela Pagamentos, ou até um webhook real ser
    plugado no futuro). `method: local` (pagar no estabelecimento) nasce `paid` direto, como já é
    hoje pro fluxo interno.
  - (B) Tirar a etapa de pagamento do assistente por enquanto e deixar o agendamento nascer com
    pagamento pendente, resolvido só pela equipe depois (mais simples, mas muda a UX prometida).
  - **Recomendado: (A)** — mantém a etapa existente no assistente, só exige nova permissão
    `payment:create:own` pro papel `client` e um ajuste no controller espelhando o padrão já usado
    em `appointment:create:own` (client nunca escolhe o `clientId`, é sempre ele mesmo — e o
    `appointmentId` informado precisa pertencer a ele).

## Plano de implementação (quando retomar)

### Backend

1. **Endpoint público de lookup por slug**
   - Novo `GET /public/establishments/:slug` (ou `GET /establishments/by-slug/:slug`), `@Public()`.
   - Novo `GetEstablishmentBySlugUseCase` (reaproveita `EstablishmentRepositoryPort`, só precisa de
     um `findBySlug` novo no port + implementação Prisma).
   - Resposta mínima: `{ tenantId, establishmentId, name, timezone }` — nada sensível.

2. **Tornar catálogo alcançável por visitante anônimo** (decisão A acima)
   - `@Public()` em `ServicesController.list()`, `EmployeesController` (rota de elegíveis por
     serviço) e `AppointmentsController.listAvailability()`.
   - Como esses handlers hoje dependem de `@CurrentTenant()`/guards pra resolver permissões, checar
     se algum deles lê `tenant.permissions` internamente (os 3 candidatos não parecem depender disso
     pelo que já foi lido, mas confirmar antes de tirar o guard).

3. **Nova permissão `payment:create:own`**
   - Adicionar ao `PERMISSIONS` e ao array do papel `client` em `prisma/seed.ts`; rerodar
     `npm run prisma:seed` (idempotente, sem migration).
   - `PaymentsController.create()`: trocar `@Auth('payment:manage')` por
     `@Auth('payment:manage', 'payment:create:own')`, e replicar o padrão de
     `AppointmentsController.book()` — se não-staff, buscar o `Appointment` pelo `dto.appointmentId`
     e validar `appointment.clientId === user.id` antes de criar o pagamento (senão
     `ForbiddenError`).

4. **Registro de cliente com validação de estabelecimento**
   - Confirmar que `RegisterClientUseCase` já valida `establishmentId` pertence ao `tenantId`
     resolvido pelo lookup por slug (já parece validar via `EstablishmentRepositoryPort.findById`).

### Frontend

5. **Nova API real** (`frontend/src/lib/booking/api.ts`, implementando o mesmo tipo `BookingApi` de
   `types.ts` — troca é praticamente drop-in, o comentário no topo de `types.ts` já avisa disso):
   - `listServices`/`listEligibleEmployees`/`listAvailableSlots` → `apiFetch` sem token obrigatório
     (endpoints públicos agora).
   - `login`/`register` → `POST /auth/login` / `POST /auth/register`, guardando o
     `{tenantId, establishmentId}` resolvidos no passo 6 no body do registro.
   - `previewCoupon` → mantém client-side (sem endpoint real, como já documentado no tipo) ou remove
     a etapa e deixa a validação só acontecer na criação do pagamento (mais fiel ao backend real).
   - `createAppointment` → `POST .../appointments`.
   - `createPayment` → `POST .../payments`.

6. **Resolver o slug no carregamento da página** — `AgendarPage` (Server Component) ou o próprio
   `BookingWizard` chama o novo endpoint público de lookup antes de montar a API real, guarda
   `tenantId`/`establishmentId` em estado/contexto do wizard.

7. **Sessão do cliente pós-login/cadastro** — hoje o wizard não guarda `accessToken`/`refreshToken`
   em lugar nenhum (o mock retorna um token fake e ignora). Decidir se o cliente:
   - (A) fica "logado" só durante o fluxo do wizard (token em memória, sem persistir sessão) — mais
     simples, evita reaproveitar `lib/auth/session-context.ts` (que é pro contexto tenant/estab. do
     staff, semântica diferente).
   - (B) usa o mesmo `token-storage.ts`/`clearSession()` do admin, permitindo o cliente voltar depois
     e ver "meus agendamentos" numa área própria (`appointment:read:own`/`cancel:own`/
     `reschedule:own` já existem no backend, sem UI nenhuma hoje).
   - **(B) é mais valioso** mas expande escopo (precisa de uma área "meus agendamentos" pro cliente,
     hoje inexistente) — vale confirmar com o usuário se entra nesta rodada ou fica pra depois.

8. **Ajustar `CouponStep`** para lidar com a ausência de endpoint de preview real, se a decisão do
   passo 5 for remover a pré-checagem client-side.

### Verificação

9. Fluxo completo no navegador: abrir `/[slug]/agendar` sem estar logado → navegar catálogo real →
   cadastrar cliente novo → escolher horário → pagar (`local`, pra fechar o ciclo sem depender de
   gateway) → confirmar que o agendamento aparece na Agenda do admin e o pagamento aparece em
   Pagamentos com o status certo.
10. `npx tsc --noEmit` (backend e frontend) + suíte de testes existente antes de considerar pronto.

## Fora de escopo (não incluído neste plano)

- Gateway de pagamento real (Pix/cartão) — segue sandbox, sem mudança.
- Área "meus agendamentos" pro cliente logado (ver item 7-B) — só entra se decidirem por (B).
- Notificação por e-mail/SMS de confirmação — módulo de notificações já existe pro fluxo interno,
  pode ser reaproveitado depois, não investigado aqui.
