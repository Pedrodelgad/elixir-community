import { createContext, useContext, useEffect, useState } from 'react'

const AuthContext = createContext(null)

// Helper para chamadas à API (o cookie de sessão vai junto automaticamente)
async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...options,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Erro inesperado')
  return data
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  // user vem do servidor: { id, name, handle, email, role, plan, planId, expiresAt }

  // Restaura a sessão ao abrir/recarregar a página.
  // Se há ?_auth=CODE na URL (vindo do callback Discord em dev), troca pelo cookie primeiro.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const authCode = params.get('_auth')

    const restore = authCode
      ? api('/api/auth/redeem', { method: 'POST', body: JSON.stringify({ code: authCode }) })
          .then(d => {
            // Remove o code da URL sem recarregar a página
            const clean = new URL(window.location.href)
            clean.searchParams.delete('_auth')
            window.history.replaceState({}, '', clean.toString())
            return d
          })
      : api('/api/auth/me')

    restore
      .then(d => setUser(d.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const register = async ({ name, handle, email, password }) => {
    const d = await api('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, handle, email, password }),
    })
    setUser(d.user)
    return d.user
  }

  const login = async (email, password) => {
    const d = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    // Conta com 2FA: não loga ainda; devolve o token temporário para o 2º passo
    if (d.twoFactorRequired) return { twoFactorRequired: true, pendingToken: d.pendingToken }
    setUser(d.user)
    return d.user
  }

  // 2º passo do login: valida o código do app autenticador (ou o código recebido por email)
  const loginVerify2fa = async (pendingToken, code) => {
    const d = await api('/api/auth/login/2fa', {
      method: 'POST',
      body: JSON.stringify({ pendingToken, code }),
    })
    setUser(d.user)
    return d.user
  }

  // Recuperação no login: envia um código por email (quando se perde o app autenticador)
  const login2faSendEmail = (pendingToken) =>
    api('/api/auth/login/2fa/email', { method: 'POST', body: JSON.stringify({ pendingToken }) })

  // Gerenciar 2FA (na conta)
  const setup2fa = () => api('/api/account/2fa/setup', { method: 'POST' }) // { qr, secret }
  const enable2fa = async (code) => {
    const d = await api('/api/account/2fa/enable', { method: 'POST', body: JSON.stringify({ code }) })
    setUser(d.user); return d.user
  }
  const disable2fa = async (code) => {
    const d = await api('/api/account/2fa/disable', { method: 'POST', body: JSON.stringify({ code }) })
    setUser(d.user); return d.user
  }
  // Recuperação na conta: envia um código por email para desativar o 2FA estando logado
  const disable2faSendEmail = () => api('/api/account/2fa/email', { method: 'POST' })

  const logout = async () => {
    await api('/api/auth/logout', { method: 'POST' }).catch(() => {})
    setUser(null)
  }

  // Inicia o checkout na Stripe. method: 'card' (assinatura) | 'pix' (avulso).
  // Retorna a URL da Stripe para redirecionar.
  const checkout = async (plan, method, referral) => {
    const d = await api('/api/checkout', {
      method: 'POST',
      body: JSON.stringify({ plan, method, referral }),
    })
    return d.url
  }

  // Pagamento em SOL: pede a transação montada (split 90/10) ao backend
  const cryptoIntent = async (plan, payer) => {
    return api('/api/crypto/intent', { method: 'POST', body: JSON.stringify({ plan, payer }) })
  }

  // Confirma o pagamento SOL assinado (verifica on-chain) e atualiza o usuário
  const cryptoConfirm = async (signature, reference) => {
    const d = await api('/api/crypto/confirm', { method: 'POST', body: JSON.stringify({ signature, reference }) })
    if (d.user) setUser(d.user)
    return d.user
  }

  // Re-busca o usuário do servidor (usado para detectar o Alpha após o pagamento)
  const refresh = async () => {
    const d = await api('/api/auth/me').catch(() => null)
    if (d) setUser(d.user)
    return d?.user || null
  }

  // Torna o usuário logado um afiliado (cria no Rewardful via backend)
  const joinAffiliate = async () => {
    const d = await api('/api/affiliate/join', { method: 'POST' })
    if (d.user) setUser(d.user)
    return d.affiliate
  }

  const updateName = async (name) => {
    const d = await api('/api/account', {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    })
    setUser(d.user)
    return d.user
  }

  return (
    <AuthContext.Provider value={{ user, loading, register, login, loginVerify2fa, login2faSendEmail, setup2fa, enable2fa, disable2fa, disable2faSendEmail, logout, checkout, cryptoIntent, cryptoConfirm, refresh, joinAffiliate, updateName }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
