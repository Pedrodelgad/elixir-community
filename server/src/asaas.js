// Asaas — envio de PIX (payout de afiliado). Sandbox vs produção detectado pelo prefixo da API key
// (chaves de homologação contêm "hmlg"). Auth pelo header `access_token`. Doc: https://docs.asaas.com
const API_KEY = process.env.ASAAS_API_KEY || ''
const IS_SANDBOX = /hmlg/i.test(API_KEY) || process.env.ASAAS_ENV === 'sandbox'
const BASE = process.env.ASAAS_BASE_URL || (IS_SANDBOX ? 'https://api-sandbox.asaas.com/v3' : 'https://api.asaas.com/v3')

export const asaasConfigured = !!API_KEY
export const asaasEnv = IS_SANDBOX ? 'sandbox' : 'production'
if (!asaasConfigured) console.warn('⚠ ASAAS_API_KEY não configurada — saque PIX automático desativado (fica em processamento)')
else console.log(`[Asaas] cliente pronto (${asaasEnv})`)

async function asaasFetch(path, { method = 'GET', body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', access_token: API_KEY },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = data?.errors?.[0]?.description || `Asaas HTTP ${res.status}`
    const err = new Error(msg)
    err.status = res.status
    err.asaas = data
    throw err
  }
  return data
}

// Saldo disponível na conta Asaas, em reais (número). É daqui que o PIX do afiliado sai.
export async function asaasBalance() {
  const d = await asaasFetch('/finance/balance')
  return typeof d.balance === 'number' ? d.balance : 0
}

// Dispara um PIX. value em REAIS (número, 2 casas). externalReference = nosso payout.id (rastreio/idempotência).
export async function sendPixTransfer({ value, pixKey, externalReference, description }) {
  return asaasFetch('/transfers', {
    method: 'POST',
    body: {
      value: Number(Number(value).toFixed(2)),
      pixAddressKey: pixKey,
      operationType: 'PIX',
      externalReference: String(externalReference),
      description: description || 'Comissao de afiliado Elixir',
    },
  })
}

// Consulta uma transferência pelo id (anti-spoof do webhook: confere o status real antes de marcar pago).
export async function getTransfer(id) {
  return asaasFetch(`/transfers/${encodeURIComponent(id)}`)
}
