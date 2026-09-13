# Pagamentos — arquitetura

Como o Elixir cobra pelos planos Alpha e paga as comissões dos afiliados. Três formas de
receber, um núcleo único de ativação.

## Provedores

| Forma | Provedor | Tipo | Recorrência | Onde cai o dinheiro |
|---|---|---|---|---|
| **Cartão** | Stripe | assinatura (`mode:subscription`) para planos mensais/trimestrais; pagamento único para o vitalício | sim (renova sozinho) | saldo Stripe |
| **PIX** | **Asaas** | pagamento único (cobrança PIX) | não | **saldo Asaas** |
| **Crypto (SOL)** | Solana on-chain | pagamento único | não | carteira da casa |

> **PIX não tem recorrência.** Todo plano pago em PIX vale pelo prazo do plano (`durationDays`)
> e não renova sozinho — o cliente paga de novo quando quiser renovar.

> **Sinergia importante:** o PIX cai no **mesmo saldo Asaas** de onde saem as comissões dos
> afiliados. Ou seja, as vendas em PIX **abastecem** automaticamente a conta que paga os saques.

## Núcleo compartilhado (agnóstico de provedor)

Todo pagamento confirmado passa por duas funções, independentemente do provedor
(`server/src/index.js`):

- **`activateAlpha({ userId, planId, expiresAt, priceBrl, ... })`** — faz upsert da assinatura,
  garante a pessoa no servidor Discord, aplica o cargo Alpha e manda a DM. Idempotente (upsert).
- **`recordPaymentAndCommission({ userId, planId, amountBrl, method, provider, providerRef, kind })`**
  — grava o `Payment` (idempotência pela unicidade de `providerRef`) e cria a comissão do afiliado
  (só na 1ª compra — `kind:'first'` — e só se o comprador tem `referredById`).

A **comissão sai de `buyer.referredById`** (fixado no cadastro via `?ref`), não do checkout — então
qualquer provedor herda o afiliado automaticamente.

## Fluxo PIX via Asaas (passo a passo)

```
Cliente escolhe PIX  ──►  POST /api/checkout/pix { plan, cpf }
                              │  cria/reusa cliente Asaas (asaasCustomerId no User)
                              │  cria cobrança PIX (externalReference = "<userId>:<planId>")
                              │  busca o QR (pixQrCode)
                              ▼
                          { paymentId, qrImage, qrPayload, brl }
                              │
Cliente paga o PIX  ─────────┤
                              ├─►  Webhook Asaas PAYMENT_RECEIVED/CONFIRMED  ─┐
                              │                                               ├─► handleAsaasPaymentPaid()
                              └─►  Front faz polling GET .../status (3s) ─────┘        │ anti-spoof (getPayment)
                                    (rede de segurança se o webhook falhar)            │ activateAlpha + recordPaymentAndCommission
                                                                                       ▼
                                                                              Alpha liberado + DM no Discord
```

**Componentes:**
- `server/src/asaas.js` — `createCustomer`, `createPixCharge`, `getPixQrCode`, `getPayment`.
- `server/src/index.js`:
  - `POST /api/checkout/pix` — cria a cobrança + devolve QR/copia-e-cola.
  - `handleAsaasPaymentPaid(paymentId)` — libera o Alpha (idempotente, anti-spoof).
  - `GET /api/checkout/pix/:id/status` — polling; **também libera** se já pago (rede de segurança).
  - `POST /api/webhooks/asaas` — trata `PAYMENT_*` (venda) e `TRANSFER_*` (saque).
- `src/components/Plans.jsx` — modal do PIX (campo CPF → QR + copia-e-cola + polling).
- `src/context/AuthContext.jsx` — `checkoutPix`, `pixStatus`.

**Idempotência:** `handleAsaasPaymentPaid` só age se ainda não existe um `Payment` com aquele
`providerRef` (o id da cobrança Asaas). Webhook e polling podem chegar juntos sem duplicar.

**CPF:** o Asaas exige `cpfCnpj` pra criar o cliente. Pedimos o CPF na 1ª compra e guardamos o
`asaasCustomerId` no `User` — nas próximas compras não pede de novo.

## Webhooks

| Endpoint | Provedor | Eventos |
|---|---|---|
| `POST /api/webhooks/stripe` | Stripe | `checkout.session.completed`, `invoice.paid` (renovação), `customer.subscription.deleted`, `charge.refunded` |
| `POST /api/webhooks/asaas` | Asaas | **`PAYMENT_RECEIVED` / `PAYMENT_CONFIRMED`** (venda PIX) · `TRANSFER_DONE/FAILED/CANCELLED` (saque afiliado) |

O webhook do Asaas valida o header `asaas-access-token` contra `ASAAS_WEBHOOK_TOKEN` (se
configurado) e **nunca confia no payload** — reconsulta o status real no Asaas antes de agir.

> ⚠️ **Habilitar no painel Asaas** os eventos de **Pagamento** (`PAYMENT_RECEIVED`,
> `PAYMENT_CONFIRMED`), além dos de Transferência que já existem. Sem isso, a liberação depende só
> do polling do front (que só roda com o modal aberto).

## Saque de afiliado (payout) + reconciliação

O afiliado saca o saldo (comissões `approved`) via PIX pelo Asaas (`sendPixTransfer`). O status
final vem pelo webhook `TRANSFER_DONE`. Como webhooks podem se perder, existe uma **reconciliação**
(`reconcileProcessingPayouts`) que roda no start e a cada 10 min, consultando o status real no
Asaas e finalizando os saques presos em `processing`. Também há `POST /api/admin/payouts/reconcile`.

## Variáveis de ambiente

```
STRIPE_SECRET_KEY=            # cartão
STRIPE_WEBHOOK_SECRET=        # valida o webhook do Stripe
ASAAS_API_KEY=               # PIX de entrada (venda) + PIX de saída (saque). "hmlg" = sandbox
ASAAS_WEBHOOK_TOKEN=         # opcional: valida o webhook do Asaas
DISCORD_INVITE_URL=          # link do convite mandado nas DMs do bot
CORS_ORIGIN=                 # base para success/cancel do Stripe
```

## Modelos de dados

- **`Payment`** — `providerRef` **único** (idempotência). `provider` ∈ `stripe|asaas|solana`,
  `method` ∈ `card|pix|sol`, `kind` ∈ `first|renewal`.
- **`Commission`** — `status` ∈ `approved|pending|paid|reversed|void`. `approved` = saldo disponível.
- **`Payout`** — `status` ∈ `requested|processing|paid|failed`.
- **`User.asaasCustomerId`** — id do cliente Asaas (reuso do CPF).

## Deploy (mudanças que envolvem schema)

```bash
# na VPS, com a API parada (SQLite trava durante a migração):
cd /var/www/elixir/server
pm2 stop elixir-api
npx prisma migrate deploy
npx prisma generate
pm2 start elixir-api
# frontend:
cd /var/www/elixir && npm run build
```

## Fases futuras

- **Recorrência em PIX** (mensal/trimestral): assinatura Asaas gera uma cobrança nova a cada ciclo.
- **Estorno**: tratar `PAYMENT_REFUNDED` → reverter a comissão (espelha `reverseCommissionForUser`).
- **Reconciliação de cobranças PIX** não pagas/pendentes (hoje a liberação depende de webhook + polling).
