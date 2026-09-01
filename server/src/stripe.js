// Cliente Stripe — usado para criar sessões de checkout e validar webhooks.
// Sem STRIPE_SECRET_KEY no .env, o checkout fica desativado (o resto da API roda normal).
import Stripe from 'stripe'

const key = process.env.STRIPE_SECRET_KEY

export const stripe = key ? new Stripe(key) : null
export const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''

if (!key) {
  console.warn('⚠ STRIPE_SECRET_KEY não configurada — /api/checkout desativado')
}

// Intervalo de renovação recorrente (cartão) por plano
export const RECURRING_INTERVAL = {
  'alpha-1m': { interval: 'month', interval_count: 1 },
  'alpha-3m': { interval: 'month', interval_count: 3 },
  // alpha-1y = vitalício: pagamento único, sem recorrência (não entra aqui)
}
