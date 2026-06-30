// Cliente da API REST do Rewardful (gestão de afiliados/comissões).
// Auth: HTTP Basic com a API Secret como username e senha vazia.
// A Secret fica SÓ aqui no backend (env), nunca no frontend.
const SECRET = process.env.REWARDFUL_API_SECRET
const BASE = 'https://api.getrewardful.com/v1'

export const rewardfulConfigured = !!SECRET

if (!SECRET) {
  console.warn('⚠ REWARDFUL_API_SECRET não configurada — programa de afiliados desativado')
}

const authHeader = () => 'Basic ' + Buffer.from(`${SECRET}:`).toString('base64')

async function rw(path, { method = 'GET', form } = {}) {
  if (!SECRET) throw new Error('REWARDFUL_API_SECRET não configurada')
  const opts = {
    method,
    headers: { Authorization: authHeader() },
    signal: AbortSignal.timeout(10000),
  }
  if (form) {
    opts.headers['Content-Type'] = 'application/x-www-form-urlencoded'
    opts.body = new URLSearchParams(form).toString()
  }
  const res = await fetch(BASE + path, opts)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    // Rewardful coloca o motivo específico em "details" (ex: "Token X has already been taken")
    const detail = Array.isArray(data?.details) ? data.details.join(', ')
      : Array.isArray(data?.errors) ? data.errors.join(', ') : ''
    const msg = [data?.error || data?.message, detail].filter(Boolean).join(' — ') || `Rewardful ${res.status}`
    throw new Error(msg)
  }
  return data
}

// Campanha padrão (ou a fixada em REWARDFUL_CAMPAIGN_ID)
export async function getDefaultCampaignId() {
  if (process.env.REWARDFUL_CAMPAIGN_ID) return process.env.REWARDFUL_CAMPAIGN_ID
  const data = await rw('/campaigns')
  const list = Array.isArray(data) ? data : (data.data || [])
  const chosen = list.find(c => c.default) || list[0]
  if (!chosen) throw new Error('Nenhuma campanha encontrada no Rewardful')
  return chosen.id
}

// Cria um afiliado. Retorna o objeto do afiliado (inclui links com url).
export async function createAffiliate({ firstName, lastName, email, token, campaignId, stripeCustomerId }) {
  const form = {
    first_name: firstName,
    last_name: lastName,
    email,
    token,
    campaign_id: campaignId,
  }
  if (stripeCustomerId) form.stripe_customer_id = stripeCustomerId
  return rw('/affiliates', { method: 'POST', form })
}

// Afiliado único com stats (visitors/leads/conversions) + campanha + links
export async function getAffiliate(id) {
  return rw(`/affiliates/${id}?expand[]=campaign&expand[]=links`)
}

// Comissões do afiliado (valores em centavos), com a venda expandida
export async function getCommissions(affiliateId) {
  const data = await rw(`/commissions?affiliate_id=${encodeURIComponent(affiliateId)}&expand[]=sale`)
  return Array.isArray(data) ? data : (data.data || [])
}
