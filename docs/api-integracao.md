# API de Integração (`/integrations/v1`)

API máquina-a-máquina para o estabelecimento plugar sua própria automação (ex.: um bot de
WhatsApp) na agenda — consultar disponibilidade, agendamentos e catálogo, criar agendamentos e
cancelar/remarcar. Autenticada por chave de API, não por login de usuário.

## Autenticação

Gere uma chave em **Configurações → Integrações** no painel administrativo (requer papel
`owner` ou `manager`). O segredo completo (`sk_live_...`) é exibido **uma única vez**, no
momento da criação — guarde-o com segurança, ele não pode ser recuperado depois.

Envie a chave em todas as requisições no header `Authorization`:

```
Authorization: Bearer sk_live_<SEGREDO_EXIBIDO_NA_CRIACAO_DA_CHAVE>
```

A chave é escopada a **um único estabelecimento** — não é preciso (nem possível) informar
`tenantId`/`establishmentId` na URL ou no corpo das requisições; o estabelecimento é resolvido a
partir da própria chave.

Uma chave concede sempre os três mesmos escopos: consultar (`appointment:read`), criar
(`appointment:create`) e cancelar/remarcar (`appointment:update`) agendamentos. Revogar uma
chave (mesma tela) invalida seu acesso imediatamente.

## Rate limit

**120 requisições por minuto por chave.** Respostas trazem os headers padrão
`X-RateLimit-Limit`, `X-RateLimit-Remaining` e `X-RateLimit-Reset`; ao estourar o limite a API
responde `429 Too Many Requests`.

## Idempotência

`POST /appointments` aceita um header opcional `Idempotency-Key` (qualquer string única que o
chamador gere, ex.: um UUID). Reenviar a mesma requisição com a mesma chave — por exemplo após
um timeout — devolve `200 OK` com o agendamento já existente em vez de criar um duplicado. Sem o
header, cada requisição cria um novo agendamento normalmente.

## Endpoints

### `GET /services`

Lista os serviços ativos do estabelecimento.

```bash
curl -s https://SEU_DOMINIO/integrations/v1/services \
  -H "Authorization: Bearer sk_live_..."
```

```json
[{ "id": "1dae4adf-...", "name": "Corte de cabelo", "priceCents": 6590, "durationMinutes": 30 }]
```

### `GET /employees`

Lista os profissionais do estabelecimento, com nome já resolvido.

```bash
curl -s https://SEU_DOMINIO/integrations/v1/employees \
  -H "Authorization: Bearer sk_live_..."
```

```json
[{ "id": "e1ba6162-...", "name": "Ana Souza", "jobTitle": "Cabeleireira Sênior" }]
```

### `GET /availability`

Horários livres para um serviço + profissional em uma data.

| Parâmetro | Obrigatório | Formato |
|---|---|---|
| `serviceId` | sim | UUID |
| `employeeId` | sim | UUID |
| `date` | sim | `YYYY-MM-DD` |
| `slotIntervalMinutes` | não | inteiro (padrão do serviço) |

```bash
curl -s "https://SEU_DOMINIO/integrations/v1/availability?serviceId=1dae4adf-...&employeeId=e1ba6162-...&date=2026-08-13" \
  -H "Authorization: Bearer sk_live_..."
```

```json
[{ "startAt": "2026-08-13T12:00:00.000Z", "endAt": "2026-08-13T12:30:00.000Z" }]
```

### `GET /appointments`

Lista agendamentos do estabelecimento, com nomes de cliente/profissional/serviço já resolvidos.

| Parâmetro | Obrigatório |
|---|---|
| `status` | não (`pending`, `confirmed`, `in_progress`, `completed`, `cancelled`, `no_show`) |
| `fromDate` | não |
| `toDate` | não |

```bash
curl -s "https://SEU_DOMINIO/integrations/v1/appointments?fromDate=2026-08-13&toDate=2026-08-14" \
  -H "Authorization: Bearer sk_live_..."
```

### `POST /appointments`

Cria um agendamento. Informe **`clientId`** (se você já sabe o UUID do cliente) **ou** um bloco
**`client`** com pelo menos o nome — o cliente é resolvido por e-mail/telefone ou criado como
cadastro de balcão (sem exigir e-mail nem senha), exatamente como o atendente faz manualmente no
painel.

```bash
curl -s -X POST https://SEU_DOMINIO/integrations/v1/appointments \
  -H "Authorization: Bearer sk_live_..." \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: <chave-unica-por-tentativa>" \
  -d '{
    "client": { "firstName": "Carlos", "phone": "11988887777" },
    "serviceId": "1dae4adf-...",
    "employeeId": "e1ba6162-...",
    "startAt": "2026-08-13T12:00:00.000Z"
  }'
```

Resposta `201 Created` (ou `200 OK` se a `Idempotency-Key` já tinha sido usada):

```json
{
  "id": "3eca3503-...",
  "clientId": "74e4172d-...",
  "clientName": "Carlos",
  "employeeId": "e1ba6162-...",
  "employeeName": "Ana Souza",
  "serviceId": "1dae4adf-...",
  "serviceName": "Corte de cabelo",
  "startAt": "2026-08-13T12:00:00.000Z",
  "endAt": "2026-08-13T12:30:00.000Z",
  "status": "pending",
  "priceCents": 6590,
  "cancellationReason": null,
  "cancelledAt": null
}
```

Agendamentos criados por aqui **nunca** ignoram a checagem de sobreposição de horário (ao
contrário do "Encaixe" manual do painel) — se o horário não estiver mais livre, a API responde
`409 Conflict`.

### `PATCH /appointments/:id/cancel`

```bash
curl -s -X PATCH https://SEU_DOMINIO/integrations/v1/appointments/3eca3503-.../cancel \
  -H "Authorization: Bearer sk_live_..." \
  -H "Content-Type: application/json" \
  -d '{ "reason": "Cliente desmarcou via bot" }'
```

### `PATCH /appointments/:id/reschedule`

```bash
curl -s -X PATCH https://SEU_DOMINIO/integrations/v1/appointments/3eca3503-.../reschedule \
  -H "Authorization: Bearer sk_live_..." \
  -H "Content-Type: application/json" \
  -d '{ "startAt": "2026-08-13T13:00:00.000Z" }'
```

`employeeId` é opcional no corpo — omita para manter o mesmo profissional.

## Códigos de erro

| Status | Quando |
|---|---|
| `400 Bad Request` | Corpo inválido, ou `POST /appointments` sem `clientId` nem `client` |
| `401 Unauthorized` | Header `Authorization` ausente, chave inválida, revogada ou expirada |
| `404 Not Found` | Agendamento inexistente (ou de outro estabelecimento) |
| `409 Conflict` | Horário não está mais disponível |
| `429 Too Many Requests` | Rate limit da chave excedido (120 req/min) |
