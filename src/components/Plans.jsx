import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

const plans = [
  {
    id: 'free',
    name: 'Elixir',
    badge: null,
    price: 'Grátis',
    sol: null,
    description: 'Ideal para quem quer conhecer a comunidade antes de entrar no Alpha.',
    discordLabel: 'Discord Elixir',
    features: [
      'Acesso ao canal geral',
      'Calls limitadas por semana',
      'Contexto de mercado reduzido',
      'Acesso ao Discord Elixir',
    ],
    limited: [2],
    cta: 'Começar grátis',
    highlight: false,
    tag: null,
    icon: (
      <svg width="18" height="20" viewBox="0 0 24 24" fill="none">
        <polygon points="13,2 3,14 12,14 11,22 21,10 12,10" stroke="rgba(143,164,196,0.7)" strokeWidth="1.5" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    id: 'alpha-1m',
    name: 'Alpha',
    badge: '1 mês',
    price: '0.5',
    sol: 0.5,
    brl: 'R$ 189,90',
    period: '/mês',
    description: 'Acesso completo ao canal Alpha por um mês. Ideal pra testar.',
    discordLabel: 'Discord Alpha exclusivo',
    features: [
      'Todas as calls em tempo real',
      'Contexto completo de mercado',
      'Canal Alpha exclusivo',
      'Carteiras monitoradas',
      'Acesso ao Discord Alpha',
      'Suporte com analistas',
    ],
    limited: [],
    cta: 'Assinar',
    highlight: false,
    tag: null,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <polygon points="13,2 3,14 12,14 11,22 21,10 12,10" stroke="rgba(122,167,255,0.8)" strokeWidth="1.5" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    id: 'alpha-3m',
    name: 'Alpha',
    badge: '3 meses',
    price: '0.8',
    sol: 0.8,
    brl: 'R$ 397,90',
    monthly: 'R$ 132/mês',
    period: '/3 meses',
    description: 'Três meses de Alpha com desconto. Mais tempo, mais contexto acumulado.',
    discordLabel: 'Discord Alpha exclusivo',
    features: [
      'Tudo do plano mensal',
      'Economia vs plano mensal',
      'Acesso prioritário a novidades',
      'Canal Alpha exclusivo',
      'Acesso ao Discord Alpha',
      'Suporte com analistas',
    ],
    limited: [],
    cta: 'Assinar',
    highlight: true,
    tag: null,
    icon: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
        <path d="M12 2l2.09 6.43h6.76l-5.47 3.97 2.09 6.43L12 14.86l-5.47 3.97 2.09-6.43L3.15 8.43h6.76L12 2z" stroke="rgba(180,210,255,0.85)" strokeWidth="0.9" strokeLinejoin="round" fill="none"/>
      </svg>
    ),
  },
  {
    id: 'alpha-1y',
    name: 'Alpha',
    badge: '1 ano',
    price: '1.2',
    sol: 1.2,
    brl: 'R$ 597,90',
    monthly: 'R$ 49,90/mês',
    period: '/ano',
    description: 'O melhor custo-benefício. Um ano inteiro de acesso Alpha completo.',
    discordLabel: 'Discord Alpha exclusivo + VIP',
    features: [
      'Tudo do plano trimestral',
      'Maior economia possível',
      'Acesso VIP a canais futuros',
      'Badge exclusivo no Discord',
      'Acesso ao Discord Alpha VIP',
      'Linha direta com o time',
    ],
    limited: [],
    cta: 'Assinar',
    highlight: true,
    tag: null,
    icon: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
        <path d="M12 2l2.09 6.43h6.76l-5.47 3.97 2.09 6.43L12 14.86l-5.47 3.97 2.09-6.43L3.15 8.43h6.76L12 2z" stroke="rgba(180,210,255,0.85)" strokeWidth="0.9" strokeLinejoin="round" fill="none"/>
      </svg>
    ),
  },
]

function DiscordIcon() {
  return (
    <svg width="13" height="10" viewBox="0 0 71 55" style={{ flexShrink: 0 }}>
      <path d="M60.1 4.9A58.5 58.5 0 0 0 45.5.9a40 40 0 0 0-1.8 3.7 54 54 0 0 0-16.4 0A38 38 0 0 0 25.5.9 58.3 58.3 0 0 0 10.9 5C1.6 18.9-.9 32.4.3 45.7a58.9 58.9 0 0 0 18 9.1 43 43 0 0 0 3.7-6.1 38.3 38.3 0 0 1-6-2.9l1.5-1.1a42 42 0 0 0 36 0l1.5 1.1a38.2 38.2 0 0 1-6 2.9 43 43 0 0 0 3.7 6.1 58.7 58.7 0 0 0 18-9.1c1.5-15.4-2.6-28.8-10.5-40.8zM23.8 37.5c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2 6.5 3.2 6.4 7.2c0 4-2.8 7.2-6.4 7.2zm23.4 0c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2 6.5 3.2 6.4 7.2c0 4-2.8 7.2-6.4 7.2z" fill="rgba(122,150,255,0.6)"/>
    </svg>
  )
}

const PENDING_PLAN_KEY = 'elixir_pending_plan'
const DISCORD_INVITE = 'https://discord.gg/hnRXNfEwp' // servidor da comunidade (plano gratuito)

// Detecta carteiras Solana instaladas. Todas (Phantom, Solflare, Backpack, Glow…)
// expõem a mesma API connect()/signAndSendTransaction(), então o fluxo é o mesmo.
function detectSolanaWallets() {
  if (typeof window === 'undefined') return []
  const found = []
  const seen = new Set()
  const add = (name, provider) => { if (provider && !seen.has(provider)) { seen.add(provider); found.push({ name, provider }) } }
  if (window.phantom?.solana) add('Phantom', window.phantom.solana)
  if (window.solflare?.isSolflare) add('Solflare', window.solflare)
  if (window.backpack) add('Backpack', window.backpack)
  if (window.glowSolana || window.glow) add('Glow', window.glowSolana || window.glow)
  if (window.solana) add(window.solana.isSolflare ? 'Solflare' : window.solana.isPhantom ? 'Phantom' : 'Carteira Solana', window.solana)
  return found
}

export default function Plans({ onLoginRequest }) {
  const { user, checkout, cryptoIntent, cryptoConfirm, refresh } = useAuth()
  const [payFor, setPayFor] = useState(null)        // planId aguardando escolha cartão/PIX
  const [loading, setLoading] = useState(false)      // método em processamento ('card'|'pix')
  const [subscribeError, setSubscribeError] = useState(null)
  const [status, setStatus] = useState(null)         // 'processing' | 'success' | 'cancel'
  const [referral, setReferral] = useState(null)     // ID do afiliado (Rewardful), se a visita veio de um link
  const [walletPicker, setWalletPicker] = useState(null) // { planId, wallets } quando há +1 carteira

  const payingPlan = plans.find(p => p.id === payFor) || null

  // Captura o referral do Rewardful quando o script async terminar de carregar
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.rewardful !== 'function') return
    window.rewardful('ready', () => {
      if (window.Rewardful?.referral) setReferral(window.Rewardful.referral)
    })
  }, [])

  // Clique no plano.
  // - Gratuito: vai direto pro Discord (entra na comunidade, sem assinatura nem pagamento).
  // - Alpha: abre o modal de pagamento. Só exige estar logado; o Discord vem DEPOIS do pagamento.
  const choosePayment = (e, plan) => {
    e.preventDefault()
    if (plan.id === 'free') {
      window.open(DISCORD_INVITE, '_blank', 'noopener')
      return
    }
    // Já tem ESTE plano ativo → não reabre o checkout (evita pagamento duplicado e
    // o estado contraditório "Alpha ativo" + "pagamento cancelado" ao desistir no Stripe).
    if (user?.planId === plan.id) return
    setSubscribeError(null)
    if (!user) {
      sessionStorage.setItem(PENDING_PLAN_KEY, plan.id)
      onLoginRequest?.()
      return
    }
    setPayFor(plan.id)
  }

  // Após logar (modal ou Discord), reabre o modal de pagamento do plano pendente
  useEffect(() => {
    if (!user) return
    const pending = sessionStorage.getItem(PENDING_PLAN_KEY)
    if (pending) {
      sessionStorage.removeItem(PENDING_PLAN_KEY)
      setPayFor(pending)
    }
  }, [user])

  // Dispara o checkout e redireciona para a Stripe
  const startCheckout = async (planId, method) => {
    setSubscribeError(null)
    setLoading(method)
    try {
      const url = await checkout(planId, method, referral)
      window.location.href = url
    } catch (err) {
      setSubscribeError(err.message || 'Erro ao iniciar o pagamento')
      setLoading(false)
    }
  }

  // Pagamento em SOL: detecta a(s) carteira(s). 0 → avisa; 1 → paga; +1 → mostra seletor.
  const startCrypto = (planId) => {
    setSubscribeError(null)
    const wallets = detectSolanaWallets()
    if (wallets.length === 0) {
      setSubscribeError('Nenhuma carteira Solana encontrada. Instale Phantom, Solflare, Backpack ou outra e tente de novo.')
      return
    }
    if (wallets.length === 1) return payWithWallet(planId, wallets[0])
    setWalletPicker({ planId, wallets })
  }

  // Executa o pagamento com a carteira escolhida (API igual em todas: connect + signAndSendTransaction)
  const payWithWallet = async (planId, wallet) => {
    setWalletPicker(null)
    setLoading('crypto')
    try {
      // Buffer só aqui (escopo do crypto) — nunca no app todo, pra não afetar o Three.js do home
      const { Buffer } = await import('buffer')
      globalThis.Buffer = globalThis.Buffer || Buffer
      const { Transaction } = await import('@solana/web3.js') // carrega a lib só quando precisa
      const resp = await wallet.provider.connect()
      const publicKey = resp?.publicKey || wallet.provider.publicKey
      if (!publicKey) throw new Error('Não foi possível conectar a carteira')
      const { transaction, reference } = await cryptoIntent(planId, publicKey.toString())
      const tx = Transaction.from(Uint8Array.from(atob(transaction), c => c.charCodeAt(0)))
      const sent = await wallet.provider.signAndSendTransaction(tx)
      const signature = sent?.signature || sent
      setPayFor(null)
      setStatus('processing')
      await cryptoConfirm(signature, reference)
      await refresh()
      setStatus('success')
    } catch (err) {
      setStatus(null)
      setSubscribeError(err.message || 'Erro no pagamento em SOL')
    } finally {
      setLoading(false)
    }
  }

  // Retorno da Stripe: ?checkout=success|cancel
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const c = params.get('checkout')
    if (!c) return
    const clean = new URL(window.location.href)
    clean.searchParams.delete('checkout')
    window.history.replaceState({}, '', clean.toString())

    if (c === 'cancel') { setStatus('cancel'); return }
    if (c !== 'success') return

    setStatus('processing')
    // O webhook libera o Alpha em segundos (cartão); PIX/async pode demorar mais.
    // Re-busca a cada 2s por até ~80s; se não confirmar, mostra mensagem útil (não trava).
    let tries = 0
    const poll = setInterval(async () => {
      tries++
      const u = await refresh()
      if (u?.plan === 'alpha') { setStatus('success'); clearInterval(poll); return }
      if (tries >= 40) { clearInterval(poll); setStatus('slow') }
    }, 2000)
    return () => clearInterval(poll)
  }, [])

  const ctaLabel = (plan) => {
    if (plan.id === 'free') return user ? '✓ Incluso no seu acesso' : plan.cta
    if (user?.planId === plan.id) return '✓ Plano ativo'
    return plan.cta
  }

  return (
    <section
      id="planos"
      className="relative min-h-screen overflow-hidden"
      style={{ background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(30,30,80,0.55) 0%, #020617 60%)' }}
    >
      {/* Feixe de luz diagonal — divide a tela, tons do site */}
      {/* Halo externo difuso */}
      <div style={{
        position: 'absolute', top: '-20%', left: '38%',
        width: '420px', height: '160%',
        background: 'linear-gradient(100deg, transparent 0%, rgba(30,65,160,0.10) 35%, rgba(50,90,200,0.08) 50%, rgba(30,65,160,0.05) 65%, transparent 100%)',
        transform: 'rotate(-28deg)',
        transformOrigin: 'top center',
        filter: 'blur(60px)',
        pointerEvents: 'none',
      }}/>
      {/* Feixe médio — azul profundo do site */}
      <div style={{
        position: 'absolute', top: '-20%', left: '50%',
        width: '80px', height: '160%',
        background: 'linear-gradient(180deg, rgba(70,130,240,0.22) 0%, rgba(58,123,213,0.14) 40%, rgba(40,95,190,0.08) 70%, transparent 100%)',
        transform: 'rotate(-28deg)',
        transformOrigin: 'top center',
        filter: 'blur(16px)',
        pointerEvents: 'none',
      }}/>
      {/* Feixe estreito — azul-gelo (#7AA7FF) */}
      <div style={{
        position: 'absolute', top: '-20%', left: '53.2%',
        width: '22px', height: '160%',
        background: 'linear-gradient(180deg, rgba(160,200,255,0.48) 0%, rgba(122,167,255,0.30) 30%, rgba(80,140,230,0.14) 60%, transparent 90%)',
        transform: 'rotate(-28deg)',
        transformOrigin: 'top center',
        filter: 'blur(5px)',
        pointerEvents: 'none',
      }}/>
      {/* Fio central nítido */}
      <div style={{
        position: 'absolute', top: '-20%', left: '54.2%',
        width: '3px', height: '160%',
        background: 'linear-gradient(180deg, rgba(210,230,255,0.75) 0%, rgba(170,210,255,0.50) 25%, rgba(122,167,255,0.25) 55%, transparent 85%)',
        transform: 'rotate(-28deg)',
        transformOrigin: 'top center',
        filter: 'blur(1px)',
        pointerEvents: 'none',
      }}/>

      <div className="relative z-10 px-6 md:px-12 py-24 max-w-[1200px] mx-auto">

        {/* Banner: erro ao assinar */}
        {subscribeError && (
          <div className="mb-8 flex items-center gap-4 px-6 py-4 rounded-2xl"
            style={{
              background: 'rgba(220,50,50,0.10)',
              border: '1px solid rgba(220,80,80,0.35)',
            }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10" stroke="rgba(255,100,100,0.8)" strokeWidth="1.5"/>
              <path d="M12 8v4M12 16h.01" stroke="rgba(255,120,120,0.9)" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <p className="text-[13px]" style={{ color: 'rgba(255,160,160,0.9)', fontFamily: "'Inter', sans-serif" }}>
              {subscribeError}
            </p>
          </div>
        )}

        {/* Aviso PERMANENTE: é Alpha mas ainda não vinculou o Discord (não some ao atualizar) */}
        {user?.plan === 'alpha' && !user?.discordLinked && status !== 'success' && (
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center gap-4 px-6 py-5 rounded-2xl"
            style={{ background: 'rgba(88,101,242,0.10)', border: '1px solid rgba(88,101,242,0.35)', boxShadow: '0 0 28px rgba(88,101,242,0.10)' }}>
            <div className="flex-1">
              <p className="text-[14px] font-bold" style={{ color: 'rgba(185,195,255,0.95)', fontFamily: "'Space Grotesk', sans-serif" }}>
                ⚡ Seu Alpha está ativo! Falta liberar no Discord.
              </p>
              <p className="text-[12px] mt-0.5" style={{ color: 'rgba(165,175,235,0.65)', fontFamily: "'Inter', sans-serif" }}>
                Conecte sua conta do Discord para receber o cargo Alpha e a DM com o acesso aos canais.
              </p>
            </div>
            <a href={'/api/auth/discord?redirect=' + encodeURIComponent('/planos')}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white whitespace-nowrap transition-all hover:-translate-y-px"
              style={{ background: 'linear-gradient(135deg, #5865F2, #4752c4)', boxShadow: '0 4px 18px rgba(88,101,242,0.4)' }}>
              <DiscordIcon /> Conectar Discord
            </a>
          </div>
        )}

        {/* Banner: pagamento confirmado */}
        {status === 'success' && (
          <div className="mb-8 flex items-center gap-4 px-6 py-5 rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(40,180,120,0.12) 0%, rgba(30,140,90,0.08) 100%)',
              border: '1px solid rgba(60,200,140,0.35)',
              boxShadow: '0 0 32px rgba(40,180,120,0.10)',
            }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(40,180,120,0.18)', border: '1px solid rgba(60,200,140,0.35)' }}>
              <svg width="18" height="14" viewBox="0 0 71 55" fill="rgba(100,230,170,0.9)">
                <path d="M60.1 4.9A58.5 58.5 0 0 0 45.5.9a40 40 0 0 0-1.8 3.7 54 54 0 0 0-16.4 0A38 38 0 0 0 25.5.9 58.3 58.3 0 0 0 10.9 5C1.6 18.9-.9 32.4.3 45.7a58.9 58.9 0 0 0 18 9.1 43 43 0 0 0 3.7-6.1 38.3 38.3 0 0 1-6-2.9l1.5-1.1a42 42 0 0 0 36 0l1.5 1.1a38.2 38.2 0 0 1-6 2.9 43 43 0 0 0 3.7 6.1 58.7 58.7 0 0 0 18-9.1c1.5-15.4-2.6-28.8-10.5-40.8zM23.8 37.5c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2 6.5 3.2 6.4 7.2c0 4-2.8 7.2-6.4 7.2zm23.4 0c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2 6.5 3.2 6.4 7.2c0 4-2.8 7.2-6.4 7.2z"/>
              </svg>
            </div>
            {user?.discordLinked ? (
              <div>
                <p className="text-[14px] font-bold" style={{ color: '#7defc0', fontFamily: "'Space Grotesk', sans-serif" }}>
                  ⚡ Pagamento confirmado! Alpha ativado no Discord.
                </p>
                <p className="text-[12px] mt-0.5" style={{ color: 'rgba(150,230,190,0.6)', fontFamily: "'Inter', sans-serif" }}>
                  Você recebeu uma DM com os detalhes. Acesse os canais exclusivos.
                </p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1">
                  <p className="text-[14px] font-bold" style={{ color: '#7defc0', fontFamily: "'Space Grotesk', sans-serif" }}>
                    ⚡ Pagamento confirmado!
                  </p>
                  <p className="text-[12px] mt-0.5" style={{ color: 'rgba(150,230,190,0.6)', fontFamily: "'Inter', sans-serif" }}>
                    Último passo: conecte seu Discord para liberar o cargo Alpha.
                  </p>
                </div>
                <a
                  href={'/api/auth/discord?redirect=' + encodeURIComponent('/planos')}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white whitespace-nowrap transition-all hover:-translate-y-px"
                  style={{ background: 'linear-gradient(135deg, #5865F2, #4752c4)', boxShadow: '0 4px 18px rgba(88,101,242,0.4)' }}
                >
                  <DiscordIcon /> Conectar Discord
                </a>
              </div>
            )}
          </div>
        )}

        {/* Banner: processando pagamento (webhook ainda liberando / PIX confirmando) */}
        {status === 'processing' && (
          <div className="mb-8 flex items-center gap-4 px-6 py-5 rounded-2xl"
            style={{ background: 'rgba(58,123,213,0.10)', border: '1px solid rgba(122,167,255,0.30)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(58,123,213,0.18)', border: '1px solid rgba(122,167,255,0.30)' }}>
              <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 3a9 9 0 1 0 9 9" stroke="rgba(150,190,255,0.9)" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <p className="text-[13px]" style={{ color: 'rgba(180,205,255,0.9)', fontFamily: "'Inter', sans-serif" }}>
              Pagamento em processamento. Assim que confirmar, seu Alpha é liberado e você recebe a DM no Discord.
            </p>
          </div>
        )}

        {/* Banner: demorou mais que o esperado (pagamento provavelmente já caiu) */}
        {status === 'slow' && (
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center gap-4 px-6 py-5 rounded-2xl"
            style={{ background: 'rgba(58,123,213,0.10)', border: '1px solid rgba(122,167,255,0.30)' }}>
            <p className="flex-1 text-[13px]" style={{ color: 'rgba(180,205,255,0.9)', fontFamily: "'Inter', sans-serif" }}>
              Seu pagamento foi recebido e está sendo confirmado. A liberação pode levar mais um instante — se o Alpha não aparecer, atualize a página.
            </p>
            <button onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white whitespace-nowrap transition-all hover:-translate-y-px"
              style={{ background: 'linear-gradient(135deg, #2a5fc7, #5a98f0)', boxShadow: '0 4px 18px rgba(30,80,200,0.35)', border: 'none', cursor: 'pointer' }}>
              Atualizar
            </button>
          </div>
        )}

        {/* Banner: pagamento cancelado — não mostra se já é Alpha (seria contraditório com o aviso "Alpha ativo" acima) */}
        {status === 'cancel' && user?.plan !== 'alpha' && (
          <div className="mb-8 flex items-center gap-4 px-6 py-4 rounded-2xl"
            style={{ background: 'rgba(180,160,60,0.08)', border: '1px solid rgba(210,190,90,0.28)' }}>
            <p className="text-[13px]" style={{ color: 'rgba(225,205,140,0.9)', fontFamily: "'Inter', sans-serif" }}>
              Pagamento cancelado. Você pode escolher um plano e tentar de novo quando quiser.
            </p>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6" style={{
            background: 'rgba(88,101,242,0.1)',
            border: '1px solid rgba(88,101,242,0.2)',
          }}>
            <DiscordIcon />
            <span className="text-[11px] font-semibold tracking-[2px] uppercase" style={{ color: 'rgba(150,160,255,0.8)', fontFamily: "'Inter', sans-serif" }}>
              Planos
            </span>
          </div>

          <h1
            className="font-bold leading-[1.08] tracking-tight mb-4"
            style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(36px, 5vw, 58px)', color: '#EEF2FF' }}
          >
            Escolha seu nível<br />
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(100deg, #d0e4ff 0%, #7AA7FF 45%, #4d8de8 100%)' }}>
              de acesso
            </span>
          </h1>
          <p style={{ color: 'rgba(190,210,235,0.45)', fontFamily: "'Inter', sans-serif", fontSize: 15, maxWidth: 440, margin: '0 auto' }}>
            Do acesso gratuito ao Alpha completo. Pagamento em SOL, acesso liberado via Discord.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="relative rounded-2xl flex flex-col"
              style={{
                padding: '28px 24px 24px',
                background: plan.id === 'alpha-1y'
                  ? 'linear-gradient(155deg, #101f50 0%, #0b1640 50%, #070e2e 100%)'
                  : plan.id === 'alpha-3m'
                    ? 'linear-gradient(155deg, #0e1e4a 0%, #091435 55%, #060d28 100%)'
                    : plan.id === 'free'
                      ? 'linear-gradient(155deg, #0c1428 0%, #080f1e 100%)'
                      : 'linear-gradient(155deg, #0d1830 0%, #090f22 100%)',
                border: plan.id === 'alpha-1y'
                  ? '1px solid rgba(160,185,255,0.32)'
                  : plan.highlight
                    ? '1px solid rgba(100,150,255,0.25)'
                    : '1px solid rgba(255,255,255,0.07)',
                boxShadow: plan.id === 'alpha-1y'
                  ? '0 0 0 1px rgba(80,130,255,0.12), 0 32px 80px rgba(10,30,110,0.55), inset 0 1px 0 rgba(160,200,255,0.12)'
                  : plan.highlight
                    ? '0 0 0 1px rgba(58,123,213,0.10), 0 28px 70px rgba(10,30,100,0.45), inset 0 1px 0 rgba(122,167,255,0.08)'
                    : '0 4px 24px rgba(2,6,20,0.35), inset 0 1px 0 rgba(255,255,255,0.03)',
                transform: plan.highlight ? 'translateY(-6px)' : 'none',
              }}
            >
              {/* Glow topo no highlight */}
              {plan.highlight && (
                <div style={{
                  position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                  height: '1px', width: '65%',
                  background: 'linear-gradient(90deg, transparent, rgba(122,167,255,0.5), rgba(200,220,255,0.7), rgba(122,167,255,0.5), transparent)',
                }}/>
              )}

              {/* Ícone + tag */}
              <div className="flex items-center justify-between mb-5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{
                  background: plan.highlight ? 'rgba(40,80,200,0.28)' : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${plan.highlight ? 'rgba(100,150,255,0.28)' : 'rgba(255,255,255,0.10)'}`,
                  boxShadow: plan.highlight ? '0 0 12px rgba(60,120,240,0.20)' : 'none',
                }}>
                  {plan.icon}
                </div>
                {plan.tag && (
                  <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full" style={{
                    background: plan.highlight ? 'rgba(58,123,213,0.20)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${plan.highlight ? 'rgba(122,167,255,0.28)' : 'rgba(255,255,255,0.09)'}`,
                    color: plan.highlight ? '#7AA7FF' : 'rgba(190,210,235,0.55)',
                    fontFamily: "'Inter', sans-serif",
                  }}>
                    {plan.tag}
                  </span>
                )}
              </div>

              {/* Nome + badge */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[15px] font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#EEF2FF' }}>
                  {plan.name}
                </span>
                {plan.badge && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{
                    background: plan.highlight ? 'rgba(58,123,213,0.18)' : 'rgba(255,255,255,0.06)',
                    border: `1px solid ${plan.highlight ? 'rgba(122,167,255,0.28)' : 'rgba(255,255,255,0.1)'}`,
                    color: plan.highlight ? '#7AA7FF' : 'rgba(190,210,235,0.55)',
                    fontFamily: "'Inter', sans-serif",
                  }}>
                    {plan.badge}
                  </span>
                )}
              </div>

              {/* Descrição */}
              <p className="text-[12px] leading-relaxed mb-5" style={{ color: 'rgba(190,210,235,0.4)', fontFamily: "'Inter', sans-serif", minHeight: 48 }}>
                {plan.description}
              </p>

              {/* Preço — SOL (canônico) + R$ fixo do cartão/PIX */}
              <div className="mb-6">
                {plan.sol ? (
                  <>
                    <div className="flex items-end gap-1.5">
                      <span className="font-bold tracking-tight leading-none" style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(34px,4vw,42px)', color: plan.highlight ? '#A8C8FF' : '#EEF2FF' }}>
                        {plan.price}
                      </span>
                      <span className="mb-1.5 text-[13px] font-semibold" style={{ color: 'rgba(190,210,235,0.5)', fontFamily: "'Inter', sans-serif" }}>SOL</span>
                      <span className="mb-1.5 text-[11px]" style={{ color: 'rgba(190,210,235,0.35)', fontFamily: "'Inter', sans-serif" }}>{plan.period}</span>
                    </div>
                    <p className="text-[11px] mt-1.5" style={{ color: 'rgba(190,210,235,0.4)', fontFamily: "'Inter', sans-serif" }}>
                      ou {plan.brl} no cartão{plan.monthly ? ` · ${plan.monthly}` : ''}
                    </p>
                  </>
                ) : (
                  <span className="font-bold tracking-tight leading-none" style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(34px,4vw,42px)', color: '#EEF2FF' }}>
                    Grátis
                  </span>
                )}
              </div>

              {/* Features */}
              <div className="mb-5 flex-1">
                <p className="text-[10px] font-bold tracking-[2px] uppercase mb-3" style={{ color: 'rgba(190,210,235,0.3)', fontFamily: "'Inter', sans-serif" }}>
                  Recursos:
                </p>
                <ul className="flex flex-col gap-2.5">
                  {plan.features.map((f, j) => {
                    const isLimited = plan.limited.includes(j)
                    return (
                      <li key={j} className="flex items-center gap-2.5 text-[12px]" style={{ color: isLimited ? 'rgba(143,164,196,0.35)' : 'rgba(190,210,235,0.65)', fontFamily: "'Inter', sans-serif" }}>
                        <span className="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center" style={{
                          background: isLimited ? 'transparent' : plan.highlight ? 'rgba(58,123,213,0.25)' : 'rgba(255,255,255,0.06)',
                          border: `1px solid ${isLimited ? 'rgba(255,255,255,0.07)' : plan.highlight ? 'rgba(100,160,255,0.3)' : 'rgba(255,255,255,0.1)'}`,
                        }}>
                          {isLimited
                            ? <svg width="7" height="7" viewBox="0 0 8 8" fill="none"><path d="M2 2l4 4M6 2L2 6" stroke="rgba(143,164,196,0.4)" strokeWidth="1.2" strokeLinecap="round"/></svg>
                            : <svg width="7" height="5" viewBox="0 0 8 6" fill="none"><path d="M1 3l2 2 4-4" stroke={plan.highlight ? '#7AA7FF' : '#8FA4C4'} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          }
                        </span>
                        {f}
                      </li>
                    )
                  })}
                </ul>
              </div>

              {/* Discord badge */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl mb-4" style={{
                background: plan.highlight ? 'rgba(88,101,242,0.14)' : 'rgba(88,101,242,0.07)',
                border: `1px solid ${plan.highlight ? 'rgba(88,101,242,0.28)' : 'rgba(88,101,242,0.14)'}`,
              }}>
                <DiscordIcon />
                <span className="text-[11px]" style={{ color: plan.highlight ? 'rgba(160,175,255,0.85)' : 'rgba(140,155,255,0.55)', fontFamily: "'Inter', sans-serif" }}>
                  {plan.discordLabel}
                </span>
              </div>

              {/* CTA */}
              <a
                href="#"
                onClick={e => choosePayment(e, plan)}
                className="flex items-center justify-center py-3 rounded-xl text-[13px] font-semibold transition-all hover:-translate-y-px"
                style={user?.planId === plan.id ? {
                  background: 'rgba(40,180,120,0.12)',
                  border: '1px solid rgba(60,200,140,0.35)',
                  color: '#5fd9a4',
                  fontFamily: "'Inter', sans-serif",
                } : plan.highlight ? {
                  background: 'linear-gradient(135deg, #2a5fc7 0%, #3d7ae8 50%, #5a98f0 100%)',
                  boxShadow: '0 0 0 1px rgba(100,160,255,0.2), 0 6px 24px rgba(30,80,200,0.4)',
                  color: '#fff',
                  fontFamily: "'Inter', sans-serif",
                } : plan.id === 'free' ? {
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.10)',
                  color: 'rgba(190,210,235,0.6)',
                  fontFamily: "'Inter', sans-serif",
                } : {
                  background: 'rgba(58,100,220,0.18)',
                  border: '1px solid rgba(100,150,255,0.20)',
                  color: 'rgba(160,195,255,0.8)',
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {ctaLabel(plan)}
              </a>
            </div>
          ))}
        </div>

        {/* ── MENTORIA — layer premium ── */}
        <div
          className="relative rounded-2xl mt-6 overflow-hidden"
          style={{
            background: 'linear-gradient(120deg, #131b45 0%, #0c1233 45%, #080d24 100%)',
            border: '1px solid rgba(140,160,255,0.22)',
            boxShadow: '0 0 0 1px rgba(90,110,240,0.08), 0 24px 64px rgba(20,30,110,0.35), inset 0 1px 0 rgba(160,180,255,0.10)',
          }}
        >
          {/* Fio de luz no topo */}
          <div style={{
            position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
            height: '1px', width: '70%',
            background: 'linear-gradient(90deg, transparent, rgba(150,170,255,0.5), rgba(220,230,255,0.7), rgba(150,170,255,0.5), transparent)',
          }}/>
          {/* Glow violeta lateral */}
          <div style={{
            position: 'absolute', top: '-40%', right: '-5%',
            width: '420px', height: '180%',
            background: 'radial-gradient(ellipse at center, rgba(110,90,255,0.14) 0%, transparent 65%)',
            filter: 'blur(30px)', pointerEvents: 'none',
          }}/>

          <div className="relative flex flex-col md:flex-row md:items-center gap-6 p-7 md:p-8">
            {/* Ícone + título */}
            <div className="flex items-center gap-4 md:min-w-[220px]">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{
                background: 'rgba(110,90,255,0.16)',
                border: '1px solid rgba(150,140,255,0.30)',
                boxShadow: '0 0 16px rgba(110,90,255,0.18)',
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M12 3L2 8l10 5 10-5-10-5z" stroke="rgba(190,180,255,0.9)" strokeWidth="1.5" strokeLinejoin="round"/>
                  <path d="M6 10.5V15c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5" stroke="rgba(190,180,255,0.9)" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M22 8v5" stroke="rgba(190,180,255,0.9)" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[17px] font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#EEF2FF' }}>
                    Mentoria
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{
                    background: 'rgba(110,90,255,0.16)',
                    border: '1px solid rgba(150,140,255,0.28)',
                    color: '#b3a8ff',
                    fontFamily: "'Inter', sans-serif",
                  }}>
                    1:1
                  </span>
                </div>
                <p className="text-[12px] mt-1" style={{ color: 'rgba(190,200,235,0.45)', fontFamily: "'Inter', sans-serif" }}>
                  Acompanhamento direto com o time
                </p>
              </div>
            </div>

            {/* Features */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {['Plano de evolução individual', 'Sessões ao vivo 1:1', 'Acesso direto ao mentor'].map(f => (
                <div key={f} className="flex items-center gap-2 text-[12px]" style={{ color: 'rgba(200,210,240,0.65)', fontFamily: "'Inter', sans-serif" }}>
                  <span className="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center" style={{
                    background: 'rgba(110,90,255,0.18)',
                    border: '1px solid rgba(150,140,255,0.30)',
                  }}>
                    <svg width="7" height="5" viewBox="0 0 8 6" fill="none"><path d="M1 3l2 2 4-4" stroke="#b3a8ff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </span>
                  {f}
                </div>
              ))}
            </div>

            {/* CTA — Chamar */}
            <div className="flex flex-col items-stretch md:items-end gap-1.5 md:min-w-[190px]">
              <a
                href="#"
                className="flex items-center justify-center gap-2 px-7 py-3 rounded-xl text-[13px] font-semibold text-white transition-all hover:-translate-y-px"
                style={{
                  background: 'linear-gradient(135deg, #5b4dc7 0%, #7a66e8 50%, #9a8af0 100%)',
                  boxShadow: '0 0 0 1px rgba(170,150,255,0.25), 0 6px 24px rgba(90,70,220,0.40)',
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.3 8.6 8.6 0 0 1-3.9-.9L3 20l1.2-5.4a8.2 8.2 0 0 1-1-3.9A8.4 8.4 0 0 1 11.7 2.5a8.4 8.4 0 0 1 9.3 9z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Chamar
              </a>
              <span className="text-[10px] text-center md:text-right" style={{ color: 'rgba(180,190,225,0.35)', fontFamily: "'Inter', sans-serif" }}>
                Você recebe o link do formulário
              </span>
            </div>
          </div>
        </div>

        {/* Nota pagamento */}
        <p className="text-center mt-10 text-[12px]" style={{ color: 'rgba(143,164,196,0.3)', fontFamily: "'Inter', sans-serif" }}>
          Preços em SOL · Pague em crypto, cartão ou PIX · Acesso liberado automaticamente via Discord
        </p>
      </div>

      {/* Modal: escolha do método de pagamento */}
      {payingPlan && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center px-4"
          style={{ background: 'rgba(2,6,20,0.72)', backdropFilter: 'blur(6px)' }}
          onClick={() => !loading && setPayFor(null)}
        >
          <div
            className="relative w-full max-w-[420px] rounded-2xl p-7"
            style={{
              background: 'linear-gradient(155deg, #0e1a3c 0%, #0a1230 60%, #070d24 100%)',
              border: '1px solid rgba(122,167,255,0.22)',
              boxShadow: '0 32px 80px rgba(8,20,80,0.6), inset 0 1px 0 rgba(160,200,255,0.10)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => !loading && setPayFor(null)}
              className="absolute top-4 right-4 w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <svg width="11" height="11" viewBox="0 0 10 10" fill="none"><path d="M1 1l8 8M9 1L1 9" stroke="rgba(190,210,235,0.6)" strokeWidth="1.4" strokeLinecap="round"/></svg>
            </button>

            <p className="text-[11px] font-bold tracking-[2px] uppercase mb-1" style={{ color: 'rgba(122,167,255,0.7)', fontFamily: "'Inter', sans-serif" }}>
              {payingPlan.name} · {payingPlan.badge}
            </p>
            <h3 className="text-[22px] font-bold mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#EEF2FF' }}>
              {payingPlan.price} <span className="text-[14px] font-semibold" style={{ color: 'rgba(190,210,235,0.5)' }}>SOL</span>
              <span className="text-[12px] font-normal" style={{ color: 'rgba(190,210,235,0.4)' }}> {payingPlan.period}</span>
            </h3>
            <p className="text-[12px] mb-5" style={{ color: 'rgba(190,210,235,0.45)', fontFamily: "'Inter', sans-serif" }}>
              ou {payingPlan.brl} no cartão{payingPlan.monthly ? ` · ${payingPlan.monthly}` : ''}
            </p>
            <p className="text-[12px] mb-5" style={{ color: 'rgba(190,210,235,0.45)', fontFamily: "'Inter', sans-serif" }}>
              Escolha como quer pagar:
            </p>

            {/* Crypto — pagamento em SOL via Phantom */}
            <button
              onClick={() => startCrypto(payingPlan.id)}
              disabled={!!loading}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl mb-3 transition-all hover:-translate-y-px disabled:opacity-60"
              style={{ background: 'rgba(153,69,255,0.12)', border: '1px solid rgba(153,69,255,0.32)', cursor: loading ? 'default' : 'pointer' }}
            >
              <svg width="20" height="20" viewBox="0 0 32 32" fill="none" style={{ flexShrink: 0 }}>
                <path d="M8 21.5h12.5l3-3H11L8 21.5zm0-5.5h12.5l3-3H11L8 16zm3-8.5H23.5l-3 3H8l3-3z" fill="url(#solg)"/>
                <defs><linearGradient id="solg" x1="0" y1="0" x2="32" y2="32"><stop stopColor="#9945FF"/><stop offset="1" stopColor="#14F195"/></linearGradient></defs>
              </svg>
              <div className="text-left flex-1">
                <p className="text-[13px] font-semibold" style={{ color: '#c4a8ff', fontFamily: "'Inter', sans-serif" }}>
                  {loading === 'crypto' ? 'Abrindo a carteira...' : 'Crypto — pagar em SOL'}
                </p>
                <p className="text-[11px]" style={{ color: 'rgba(190,170,235,0.55)', fontFamily: "'Inter', sans-serif" }}>
                  Phantom, Solflare, Backpack e outras
                </p>
              </div>
            </button>

            {/* Cartão — assinatura recorrente */}
            <button
              onClick={() => startCheckout(payingPlan.id, 'card')}
              disabled={!!loading}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl mb-3 transition-all hover:-translate-y-px disabled:opacity-60"
              style={{
                background: 'linear-gradient(135deg, #2a5fc7 0%, #3d7ae8 50%, #5a98f0 100%)',
                boxShadow: '0 6px 24px rgba(30,80,200,0.4)', border: 'none', cursor: loading ? 'default' : 'pointer',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                <rect x="2" y="5" width="20" height="14" rx="2" stroke="#fff" strokeWidth="1.6"/>
                <path d="M2 9h20" stroke="#fff" strokeWidth="1.6"/>
              </svg>
              <div className="text-left">
                <p className="text-[13px] font-semibold text-white" style={{ fontFamily: "'Inter', sans-serif" }}>
                  {loading === 'card' ? 'Redirecionando...' : 'Cartão — assinatura'}
                </p>
                <p className="text-[11px]" style={{ color: 'rgba(220,232,255,0.7)', fontFamily: "'Inter', sans-serif" }}>
                  Renova automaticamente a cada ciclo
                </p>
              </div>
            </button>

            {/* PIX — em desenvolvimento (ainda não ativado no Stripe) — desabilitado */}
            <button
              type="button"
              disabled
              title="Em desenvolvimento — ainda não disponível"
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl opacity-50"
              style={{
                background: 'rgba(120,130,145,0.08)', border: '1px solid rgba(120,130,145,0.22)',
                cursor: 'not-allowed',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                <path d="M12 3l4 4-4 4-4-4 4-4zM5 10l-2 2 2 2M19 10l2 2-2 2M12 13l4 4-4 4-4-4 4-4z" stroke="rgba(150,170,190,0.7)" strokeWidth="1.5" strokeLinejoin="round"/>
              </svg>
              <div className="text-left flex-1">
                <p className="text-[13px] font-semibold" style={{ color: 'rgba(200,215,235,0.7)', fontFamily: "'Inter', sans-serif" }}>
                  PIX
                </p>
                <p className="text-[11px]" style={{ color: 'rgba(190,210,235,0.45)', fontFamily: "'Inter', sans-serif" }}>
                  Em desenvolvimento — em breve
                </p>
              </div>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)', color: 'rgba(190,210,235,0.55)', fontFamily: "'Inter', sans-serif" }}>
                em breve
              </span>
            </button>

            <p className="text-[10px] text-center mt-5" style={{ color: 'rgba(143,164,196,0.4)', fontFamily: "'Inter', sans-serif" }}>
              Pagamento processado pela Stripe · Cargo liberado via Discord
            </p>
          </div>
        </div>
      )}

      {/* Seletor de carteira (quando há mais de uma instalada) */}
      {walletPicker && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center px-4"
          style={{ background: 'rgba(2,6,20,0.72)', backdropFilter: 'blur(6px)' }}
          onClick={() => !loading && setWalletPicker(null)}
        >
          <div
            className="relative w-full max-w-[380px] rounded-2xl p-7"
            style={{
              background: 'linear-gradient(155deg, #15103a 0%, #0c0926 60%, #07061c 100%)',
              border: '1px solid rgba(153,69,255,0.28)',
              boxShadow: '0 32px 80px rgba(20,10,60,0.6)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <p className="text-[11px] font-bold tracking-[2px] uppercase mb-1" style={{ color: 'rgba(196,168,255,0.7)', fontFamily: "'Inter', sans-serif" }}>
              Escolha a carteira
            </p>
            <p className="text-[12px] mb-5" style={{ color: 'rgba(200,190,235,0.5)', fontFamily: "'Inter', sans-serif" }}>
              Detectamos mais de uma carteira Solana:
            </p>
            {walletPicker.wallets.map((w) => (
              <button
                key={w.name}
                onClick={() => payWithWallet(walletPicker.planId, w)}
                disabled={!!loading}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl mb-2.5 transition-all hover:-translate-y-px disabled:opacity-60"
                style={{ background: 'rgba(153,69,255,0.12)', border: '1px solid rgba(153,69,255,0.30)', cursor: loading ? 'default' : 'pointer' }}
              >
                <svg width="18" height="18" viewBox="0 0 32 32" fill="none" style={{ flexShrink: 0 }}>
                  <path d="M8 21.5h12.5l3-3H11L8 21.5zm0-5.5h12.5l3-3H11L8 16zm3-8.5H23.5l-3 3H8l3-3z" fill="url(#solg2)"/>
                  <defs><linearGradient id="solg2" x1="0" y1="0" x2="32" y2="32"><stop stopColor="#9945FF"/><stop offset="1" stopColor="#14F195"/></linearGradient></defs>
                </svg>
                <span className="text-[13px] font-semibold" style={{ color: '#d8c8ff', fontFamily: "'Inter', sans-serif" }}>{w.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
