import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import LoginModal from '../components/LoginModal'

function fmtMoney(cents, currency = 'BRL') {
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format((cents || 0) / 100)
  } catch {
    return `R$ ${((cents || 0) / 100).toFixed(2)}`
  }
}

/* ─── GRÁFICO DE GANHOS (SVG puro, área roxa) ─── */
function EarningsChart({ data, currency }) {
  const W = 640, H = 230, PAD_L = 48, PAD_B = 28, PAD_T = 14
  if (!data?.length) {
    return (
      <p className="text-center text-[12px] py-16" style={{ color: 'rgba(190,180,235,0.4)', fontFamily: "'Inter', sans-serif" }}>
        Sem comissões registradas ainda. Compartilhe seu link para começar a ganhar.
      </p>
    )
  }
  const max = Math.max(1, ...data.map(d => d.amount))
  const innerH = H - PAD_B - PAD_T
  const innerW = W - PAD_L - 12
  const n = data.length
  const xAt = i => PAD_L + (n === 1 ? innerW / 2 : (innerW * i) / (n - 1))
  const yAt = v => PAD_T + innerH - (v / max) * innerH
  const pts = data.map((d, i) => [xAt(i), yAt(d.amount)])
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')
  const area = `${line} L ${pts[n - 1][0].toFixed(1)} ${H - PAD_B} L ${pts[0][0].toFixed(1)} ${H - PAD_B} Z`
  const grid = [0.25, 0.5, 0.75, 1]
  const labelStep = Math.ceil(n / 7)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
      <defs>
        <linearGradient id="earnFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="rgba(139,92,246,0.38)" />
          <stop offset="1" stopColor="rgba(139,92,246,0)" />
        </linearGradient>
      </defs>
      {grid.map(g => (
        <g key={g}>
          <line x1={PAD_L} x2={W} y1={PAD_T + innerH - innerH * g} y2={PAD_T + innerH - innerH * g}
            stroke="rgba(180,160,255,0.08)" strokeDasharray="3 5" />
          <text x={PAD_L - 8} y={PAD_T + innerH - innerH * g + 4} textAnchor="end"
            fontSize="9.5" fill="rgba(190,180,235,0.45)" fontFamily="Inter, sans-serif">
            {fmtMoney(max * g, currency)}
          </text>
        </g>
      ))}
      <line x1={PAD_L} x2={W} y1={H - PAD_B} y2={H - PAD_B} stroke="rgba(180,160,255,0.14)" />
      <path d={area} fill="url(#earnFill)" />
      <path d={line} fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="#c4b5fd" stroke="#7c3aed" strokeWidth="1.5" />
      ))}
      {data.map((d, i) => (i % labelStep === 0 || i === n - 1) && (
        <text key={i} x={xAt(i)} y={H - PAD_B + 16} textAnchor="middle"
          fontSize="9.5" fill="rgba(190,180,235,0.55)" fontFamily="Inter, sans-serif">
          {d.date.slice(8, 10)}/{d.date.slice(5, 7)}
        </text>
      ))}
    </svg>
  )
}

const cardStyle = {
  background: 'linear-gradient(155deg, rgba(20,16,48,0.9) 0%, rgba(14,10,36,0.92) 100%)',
  border: '1px solid rgba(140,110,255,0.18)',
  boxShadow: '0 8px 32px rgba(20,10,60,0.4), inset 0 1px 0 rgba(160,140,255,0.08)',
}

export default function AffiliatePage() {
  const { user, loading, joinAffiliate } = useAuth()
  const [loginOpen, setLoginOpen] = useState(false)
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState(null)
  const [copied, setCopied] = useState(false)
  const [stats, setStats] = useState(null)
  const [statsError, setStatsError] = useState(null)

  useEffect(() => {
    if (!user?.isAffiliate) return
    fetch('/api/affiliate/stats', { credentials: 'include' })
      .then(r => r.json().then(d => { if (!r.ok) throw new Error(d.error || 'Erro'); return d }))
      .then(setStats)
      .catch(e => setStatsError(e.message))
  }, [user?.isAffiliate])

  const handleJoin = async () => {
    setJoining(true); setJoinError(null)
    try { await joinAffiliate() }
    catch (e) { setJoinError(e.message || 'Erro ao criar afiliado') }
    finally { setJoining(false) }
  }

  const copyLink = () => {
    if (!user?.affiliateLink) return
    navigator.clipboard?.writeText(user.affiliateLink)
    setCopied(true); setTimeout(() => setCopied(false), 1800)
  }

  const currency = stats?.currency || 'BRL'

  return (
    <div className="relative overflow-hidden" style={{ minHeight: '100vh', background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(50,30,90,0.5) 0%, #050310 60%)' }}>
      {/* Feixe de luz diagonal (tons roxos) — igual às outras páginas */}
      <div style={{ position: 'absolute', top: '-20%', left: '38%', width: '420px', height: '160%', background: 'linear-gradient(100deg, transparent 0%, rgba(110,70,200,0.12) 35%, rgba(139,92,246,0.10) 50%, rgba(110,70,200,0.06) 65%, transparent 100%)', transform: 'rotate(-28deg)', transformOrigin: 'top center', filter: 'blur(60px)', pointerEvents: 'none' }}/>
      <div style={{ position: 'absolute', top: '-20%', left: '50%', width: '80px', height: '160%', background: 'linear-gradient(180deg, rgba(150,100,250,0.22) 0%, rgba(124,58,237,0.14) 40%, rgba(100,50,200,0.08) 70%, transparent 100%)', transform: 'rotate(-28deg)', transformOrigin: 'top center', filter: 'blur(16px)', pointerEvents: 'none' }}/>
      <div style={{ position: 'absolute', top: '-20%', left: '53.2%', width: '22px', height: '160%', background: 'linear-gradient(180deg, rgba(200,180,255,0.48) 0%, rgba(167,139,250,0.30) 30%, rgba(140,100,230,0.14) 60%, transparent 90%)', transform: 'rotate(-28deg)', transformOrigin: 'top center', filter: 'blur(5px)', pointerEvents: 'none' }}/>
      <div style={{ position: 'absolute', top: '-20%', left: '54.2%', width: '3px', height: '160%', background: 'linear-gradient(180deg, rgba(230,220,255,0.75) 0%, rgba(200,180,255,0.50) 25%, rgba(167,139,250,0.25) 55%, transparent 85%)', transform: 'rotate(-28deg)', transformOrigin: 'top center', filter: 'blur(1px)', pointerEvents: 'none' }}/>

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-10"
        style={{
          height: '64px',
          background: 'linear-gradient(180deg, rgba(10,6,24,0.82) 0%, rgba(8,5,20,0.7) 100%)',
          backdropFilter: 'blur(24px) saturate(180%)',
          borderBottom: '1px solid rgba(140,110,255,0.10)',
        }}>
        <Link to="/" className="flex items-center">
          <img src="/imgs/elixir_logo2.png" alt="Elixir" className="h-8 hover:brightness-125 transition-all" />
        </Link>
        <div className="flex items-center gap-4">
          <Link to="/" className="text-[12px] font-medium tracking-[2px] uppercase" style={{ color: 'rgba(203,213,225,0.55)', fontFamily: "'Inter', sans-serif" }}>
            Voltar
          </Link>
          {user && (
            <span className="text-sm font-medium" style={{ color: 'rgba(200,190,235,0.6)', fontFamily: "'Inter', sans-serif" }}>{user.name}</span>
          )}
        </div>
      </nav>

      <div className="relative z-10 pt-28 pb-24 px-6 md:px-12 max-w-[1100px] mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6" style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)' }}>
            <span className="text-[11px] font-semibold tracking-[2px] uppercase" style={{ color: 'rgba(196,181,253,0.85)', fontFamily: "'Inter', sans-serif" }}>
              Programa de Afiliados
            </span>
          </div>
          <h1 className="font-bold leading-[1.08] tracking-tight mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(34px, 5vw, 54px)', color: '#EEEAFF' }}>
            Indique e <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(100deg, #e9d5ff 0%, #a78bfa 45%, #7c3aed 100%)' }}>ganhe comissão</span>
          </h1>
          <p style={{ color: 'rgba(200,190,235,0.5)', fontFamily: "'Inter', sans-serif", fontSize: 15, maxWidth: 460, margin: '0 auto' }}>
            Compartilhe seu link, traga novos membros para o Elixir e receba uma comissão por cada assinatura paga.
          </p>
        </div>

        {/* ── Estado: não logado ── */}
        {!loading && !user && (
          <div className="rounded-2xl p-10 text-center" style={cardStyle}>
            <p className="text-[15px] mb-5" style={{ color: 'rgba(220,210,245,0.8)', fontFamily: "'Inter', sans-serif" }}>
              Entre na sua conta para ativar seu link de afiliado.
            </p>
            <button onClick={() => setLoginOpen(true)}
              className="px-7 py-3 rounded-xl text-[13px] font-semibold text-white transition-all hover:-translate-y-px"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #a78bfa)', boxShadow: '0 6px 24px rgba(124,58,237,0.4)', border: 'none', cursor: 'pointer' }}>
              Entrar
            </button>
          </div>
        )}

        {/* ── Estado: logado, ainda não afiliado ── */}
        {user && !user.isAffiliate && (
          <div className="rounded-2xl p-10 text-center" style={cardStyle}>
            <h2 className="text-[20px] font-bold mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#EEEAFF' }}>
              Torne-se afiliado
            </h2>
            <p className="text-[13px] mb-6" style={{ color: 'rgba(200,190,235,0.55)', fontFamily: "'Inter', sans-serif", maxWidth: 420, margin: '0 auto' }}>
              Ative seu link exclusivo em um clique. Toda venda feita pelo seu link gera comissão automaticamente.
            </p>
            {joinError && (
              <p className="text-[12px] mb-4" style={{ color: 'rgba(255,150,150,0.9)', fontFamily: "'Inter', sans-serif" }}>{joinError}</p>
            )}
            <button onClick={handleJoin} disabled={joining}
              className="px-8 py-3.5 rounded-xl text-[14px] font-semibold text-white transition-all hover:-translate-y-px disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #a78bfa)', boxShadow: '0 6px 24px rgba(124,58,237,0.4)', border: 'none', cursor: joining ? 'wait' : 'pointer' }}>
              {joining ? 'Ativando...' : 'Quero ser afiliado'}
            </button>
          </div>
        )}

        {/* ── Estado: afiliado (dashboard) ── */}
        {user?.isAffiliate && (
          <div className="flex flex-col gap-5">
            {/* Link de referral */}
            <div className="rounded-2xl p-6" style={cardStyle}>
              <p className="text-[10px] font-bold tracking-[2px] uppercase mb-3" style={{ color: 'rgba(196,181,253,0.7)', fontFamily: "'Inter', sans-serif" }}>
                Seu link de afiliado
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 px-4 py-3 rounded-xl text-[13px] truncate" style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', color: 'rgba(220,210,245,0.85)', fontFamily: "'Inter', sans-serif" }}>
                  {user.affiliateLink || `?via=${user.affiliateToken}`}
                </div>
                <button onClick={copyLink}
                  className="px-6 py-3 rounded-xl text-[13px] font-semibold text-white whitespace-nowrap transition-all hover:-translate-y-px"
                  style={{ background: copied ? 'rgba(60,200,140,0.85)' : 'linear-gradient(135deg, #7c3aed, #a78bfa)', boxShadow: '0 4px 18px rgba(124,58,237,0.35)', border: 'none', cursor: 'pointer' }}>
                  {copied ? '✓ Copiado' : 'Copiar link'}
                </button>
              </div>
            </div>

            {statsError && (
              <div className="rounded-2xl px-6 py-4" style={{ background: 'rgba(220,50,50,0.08)', border: '1px solid rgba(220,80,80,0.3)' }}>
                <p className="text-[13px]" style={{ color: 'rgba(255,160,160,0.9)', fontFamily: "'Inter', sans-serif" }}>{statsError}</p>
              </div>
            )}

            {/* Totais por estado */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: 'Pendente', key: 'pending', hint: 'aguardando liberação', color: '#c5cad4' },
                { label: 'A receber', key: 'due', hint: 'pronto para pagamento', color: '#d6dbe4' },
                { label: 'Pago', key: 'paid', hint: 'já recebido', color: '#eef1f6' },
              ].map(c => (
                <div key={c.key} className="rounded-2xl p-5" style={cardStyle}>
                  <p className="text-[10px] font-bold tracking-[2px] uppercase mb-2" style={{ color: 'rgba(196,181,253,0.6)', fontFamily: "'Inter', sans-serif" }}>{c.label}</p>
                  <p className="text-[26px] font-bold leading-none" style={{ fontFamily: "'Space Grotesk', sans-serif", color: c.color }}>
                    {fmtMoney(stats?.totals?.[c.key] || 0, currency)}
                  </p>
                  <p className="text-[11px] mt-1.5" style={{ color: 'rgba(190,180,235,0.4)', fontFamily: "'Inter', sans-serif" }}>{c.hint}</p>
                </div>
              ))}
            </div>

            {/* Funil: visitas / leads / conversões / taxa */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Visitas', value: stats?.visitors ?? 0 },
                { label: 'Leads', value: stats?.leads ?? 0 },
                { label: 'Conversões', value: stats?.conversions ?? 0 },
                { label: 'Taxa de conversão', value: stats ? `${(stats.conversionRate * 100).toFixed(1)}%` : '0%' },
              ].map(c => (
                <div key={c.label} className="rounded-2xl p-5" style={cardStyle}>
                  <p className="text-[10px] font-bold tracking-[2px] uppercase mb-2" style={{ color: 'rgba(196,181,253,0.6)', fontFamily: "'Inter', sans-serif" }}>{c.label}</p>
                  <p className="text-[24px] font-bold leading-none" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#EEEAFF' }}>{c.value}</p>
                </div>
              ))}
            </div>

            {/* Gráfico de ganhos */}
            <div className="rounded-2xl p-6" style={cardStyle}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-[14px] font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#EEEAFF' }}>Ganhos ao longo do tempo</p>
                <span className="text-[11px]" style={{ color: 'rgba(190,180,235,0.45)', fontFamily: "'Inter', sans-serif" }}>
                  {stats?.totalCommissions ?? 0} comissões
                </span>
              </div>
              <EarningsChart data={stats?.timeline} currency={currency} />
            </div>
          </div>
        )}
      </div>

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} redirect="/afiliado" />
    </div>
  )
}
