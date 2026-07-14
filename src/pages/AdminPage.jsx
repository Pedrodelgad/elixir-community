import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AdminStudentArea from '../components/AdminStudentArea'

/* ─── Usuários agora vêm do banco via API (/api/admin/users) ─── */
/* ─── Comentários, vendas e vídeos ainda são mock — próximos passos ─── */

const fmtBrl = (c) => 'R$ ' + ((c || 0) / 100).toFixed(2).replace('.', ',')

// "2026-06-11T…" → "agora" / "5m" / "2h" / "3d"
function timeAgo(date) {
  const s = (Date.now() - new Date(date).getTime()) / 1000
  if (s < 60) return 'agora'
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}

/* ─── TEMA CINZA / PRATA ─── */

const PLAN_META = {
  'free':     { label: 'Gratuito',      color: '#8a919e', bg: 'rgba(138,145,158,0.08)', border: 'rgba(138,145,158,0.22)' },
  'alpha-1m': { label: 'Alpha 1 mês',   color: '#aeb6c4', bg: 'rgba(174,182,196,0.10)', border: 'rgba(174,182,196,0.26)' },
  'alpha-3m': { label: 'Alpha 3 meses', color: '#cdd3dd', bg: 'rgba(205,211,221,0.10)', border: 'rgba(205,211,221,0.30)' },
  'alpha-1y': { label: 'Alpha 1 ano',   color: '#eef1f6', bg: 'rgba(238,241,246,0.10)', border: 'rgba(238,241,246,0.32)' },
}

const card = {
  background: 'linear-gradient(145deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.015) 100%)',
  border: '1px solid rgba(220,225,235,0.10)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07), 0 8px 32px rgba(0,0,0,0.45)',
}

const label = { color: 'rgba(200,206,218,0.42)', fontFamily: "'Inter', sans-serif" }

const inputBase = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(220,225,235,0.10)',
  fontFamily: "'Inter', sans-serif",
}
const inputFocus = e => e.target.style.borderColor = 'rgba(238,241,246,0.40)'
const inputBlur  = e => e.target.style.borderColor = 'rgba(220,225,235,0.10)'

/* ─── GRÁFICO DE VENDAS (SVG puro, barras empilhadas) ─── */

function SalesChart({ data }) {
  const W = 640, H = 230, PAD_L = 36, PAD_B = 28, PAD_T = 14
  if (!data?.length) {
    return (
      <p className="text-center text-[12px] py-16" style={{ color: 'rgba(170,176,188,0.4)', fontFamily: "'Inter', sans-serif" }}>
        Sem vendas registradas ainda.
      </p>
    )
  }
  const max = Math.max(1, ...data.map(s => s.m1 + s.m3 + s.y1))
  const innerH = H - PAD_B - PAD_T
  const slot = (W - PAD_L) / data.length
  const barW = 34
  const scale = v => (v / max) * innerH

  const gridLines = [0.25, 0.5, 0.75, 1]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
      {gridLines.map(g => (
        <g key={g}>
          <line x1={PAD_L} x2={W} y1={H - PAD_B - innerH * g} y2={H - PAD_B - innerH * g}
            stroke="rgba(255,255,255,0.05)" strokeDasharray="3 5"/>
          <text x={PAD_L - 8} y={H - PAD_B - innerH * g + 4} textAnchor="end"
            fontSize="10" fill="rgba(170,176,188,0.45)" fontFamily="Inter, sans-serif">
            {Math.round(max * g)}
          </text>
        </g>
      ))}
      <line x1={PAD_L} x2={W} y1={H - PAD_B} y2={H - PAD_B} stroke="rgba(255,255,255,0.12)"/>

      {data.map((s, i) => {
        const x = PAD_L + slot * i + (slot - barW) / 2
        const h1 = scale(s.m1), h3 = scale(s.m3), hy = scale(s.y1)
        let y = H - PAD_B
        const seg = (h, color, rTop) => {
          y -= h
          return <rect key={color} x={x} y={y} width={barW} height={h} fill={color} rx={rTop ? 3 : 0}/>
        }
        return (
          <g key={s.label}>
            {seg(h1, '#5b626f')}
            {seg(h3, '#9aa3b2')}
            {seg(hy, '#e4e8ef', true)}
            <text x={x + barW / 2} y={H - PAD_B + 16} textAnchor="middle"
              fontSize="10.5" fill="rgba(170,176,188,0.6)" fontFamily="Inter, sans-serif">
              {s.label}
            </text>
            <text x={x + barW / 2} y={y - 6} textAnchor="middle"
              fontSize="10" fontWeight="600" fill="rgba(230,234,242,0.75)" fontFamily="Inter, sans-serif">
              {s.m1 + s.m3 + s.y1}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

/* ─── PÁGINA ─── */

export default function AdminPage() {
  const { user, loading, logout } = useAuth()
  const navigate = useNavigate()

  const [users, setUsers] = useState([])
  const [comments, setComments] = useState([])
  const [stats, setStats] = useState({ revenueSol: 0, revenueBrl: 0, totalSales: 0, sales: [] })
  const [affiliates, setAffiliates] = useState([])
  const [studentOpen, setStudentOpen] = useState(false) // Área do Aluno recolhida por padrão (menos poluição)

  // Busca tudo do banco: contas, comentários e estatísticas
  useEffect(() => {
    if (!user || user.role !== 'admin') return
    fetch('/api/admin/users', { credentials: 'include' })
      .then(r => r.json()).then(d => setUsers(d.users || [])).catch(() => {})
    fetch('/api/comments')
      .then(r => r.json()).then(d => setComments(d.comments || [])).catch(() => {})
    fetch('/api/admin/stats', { credentials: 'include' })
      .then(r => r.json()).then(d => setStats(d)).catch(() => {})
    fetch('/api/admin/affiliates', { credentials: 'include' })
      .then(r => r.json()).then(d => setAffiliates(d.affiliates || [])).catch(() => {})
  }, [user])

  const deleteUser = async (id) => {
    const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE', credentials: 'include' })
    if (res.ok) setUsers(list => list.filter(x => x.id !== id))
  }

  // Dá (comp manual) um plano Alpha a um usuário — usa o endpoint admin-only /api/subscriptions,
  // que cria a assinatura, aplica o cargo no Discord e manda a DM (mesmo fluxo do pagamento).
  const grantPlan = async (u, planId) => {
    if (!planId) return
    if (!confirm(`Dar o plano "${PLAN_META[planId]?.label || planId}" para @${u.handle}?`)) return
    const res = await fetch('/api/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ userId: u.id, plan: planId }),
    })
    const d = await res.json().catch(() => ({}))
    if (res.ok && d.user) {
      setUsers(list => list.map(x => x.id === u.id ? { ...x, plan: d.user.plan, planId: d.user.planId, expiresAt: d.user.expiresAt } : x))
    } else {
      alert(d.error || 'Não foi possível dar o plano')
    }
  }

  // Remove o Alpha de um usuário — apaga a assinatura e tira o cargo no Discord.
  const removeAlpha = async (u) => {
    if (!confirm(`Remover o Alpha de @${u.handle}? Isso também tira o cargo no Discord.`)) return
    const res = await fetch(`/api/subscriptions/${u.id}`, { method: 'DELETE', credentials: 'include' })
    const d = await res.json().catch(() => ({}))
    if (res.ok && d.user) {
      setUsers(list => list.map(x => x.id === u.id ? { ...x, plan: d.user.plan, planId: d.user.planId, expiresAt: d.user.expiresAt } : x))
    } else {
      alert(d.error || 'Não foi possível remover o Alpha')
    }
  }

  const deleteComment = async (id) => {
    const res = await fetch(`/api/comments/${id}`, { method: 'DELETE', credentials: 'include' })
    if (res.ok) setComments(list => list.filter(x => x.id !== id))
  }

  // Espera a sessão restaurar antes de decidir redirecionar
  if (loading) return <div style={{ minHeight: '100vh', background: '#0a0b0e' }} />
  if (!user || user.role !== 'admin') return <Navigate to="/" replace />

  const alphaCount = users.filter(u => u.planId).length
  const fmtDate = d => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

  const statCards = [
    { label: 'Membros ativos', value: users.length, hint: 'contas registradas' },
    { label: 'Assinaturas Alpha', value: alphaCount, hint: 'planos pagos ativos' },
    { label: 'Receita total', value: `${(stats.revenueSol ?? 0).toFixed(2)} SOL`,
      hint: `R$ ${(stats.revenueBrl ?? 0).toFixed(2).replace('.', ',')} em cartão/PIX` },
    { label: 'Reviews publicados', value: comments.length, hint: 'na comunidade' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#0a0b0e', position: 'relative' }}>

      {/* ── Luz branca acinzentada — ambiente ── */}
      <div aria-hidden="true" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {/* Glow principal no topo */}
        <div style={{
          position: 'absolute', top: '-25%', left: '50%', transform: 'translateX(-50%)',
          width: '900px', height: '500px',
          background: 'radial-gradient(ellipse at center, rgba(235,238,245,0.07) 0%, rgba(200,206,218,0.03) 45%, transparent 70%)',
          filter: 'blur(40px)',
        }}/>
        {/* Feixe prata diagonal */}
        <div style={{
          position: 'absolute', top: '-20%', right: '12%',
          width: '70px', height: '150%',
          background: 'linear-gradient(180deg, rgba(228,232,239,0.10) 0%, rgba(190,196,208,0.05) 45%, transparent 85%)',
          transform: 'rotate(-24deg)', transformOrigin: 'top center',
          filter: 'blur(14px)',
        }}/>
        <div style={{
          position: 'absolute', top: '-20%', right: '14.5%',
          width: '3px', height: '150%',
          background: 'linear-gradient(180deg, rgba(245,247,250,0.45) 0%, rgba(225,229,238,0.22) 40%, transparent 80%)',
          transform: 'rotate(-24deg)', transformOrigin: 'top center',
          filter: 'blur(1px)',
        }}/>
        {/* Orb cinza inferior esquerdo */}
        <div style={{
          position: 'absolute', bottom: '-15%', left: '-10%',
          width: '45vw', height: '40vw',
          background: 'radial-gradient(ellipse at center, rgba(160,168,182,0.05) 0%, transparent 65%)',
          filter: 'blur(70px)',
        }}/>
      </div>

      {/* ── Top bar ── */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-8 md:px-10" style={{
        height: 60,
        background: 'linear-gradient(180deg, rgba(165,172,185,0.10) 0%, rgba(130,138,152,0.06) 100%)',
        backdropFilter: 'blur(24px) saturate(140%)',
        WebkitBackdropFilter: 'blur(24px) saturate(140%)',
        borderBottom: '1px solid rgba(220,225,235,0.10)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 32px rgba(0,0,0,0.35)',
      }}>
        {/* Fio de luz prata no topo */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none" style={{
          height: '1px', width: '50%',
          background: 'linear-gradient(90deg, transparent 0%, rgba(225,229,238,0.4) 25%, rgba(248,250,252,0.85) 50%, rgba(225,229,238,0.4) 75%, transparent 100%)',
        }}/>

        <div className="flex items-center gap-3">
          <img src="/imgs/logo_elixir_grey.png" alt="Elixir" className="h-8" />
          <span style={{ width: 1, height: 20, background: 'rgba(220,225,235,0.14)' }}/>
          <span className="text-[13px] font-semibold tracking-wide" style={{ color: '#eef1f6', fontFamily: "'Space Grotesk', sans-serif" }}>
            Painel Admin
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide" style={{
            background: 'rgba(228,232,239,0.08)', border: '1px solid rgba(228,232,239,0.25)', color: '#cdd3dd',
          }}>
            ⚙ Admin
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/" className="text-[12px] font-medium transition-colors" style={{ color: 'rgba(200,206,218,0.5)', fontFamily: "'Inter', sans-serif" }}
            onMouseEnter={e => e.currentTarget.style.color = '#fff'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(200,206,218,0.5)'}>
            Ver site
          </Link>
          <button
            onClick={() => { logout(); navigate('/') }}
            className="text-[12px] font-medium px-4 py-1.5 rounded-full transition-all"
            style={{ color: 'rgba(255,130,130,0.8)', background: 'rgba(220,60,60,0.08)', border: '1px solid rgba(220,80,80,0.2)', cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}
          >
            Sair
          </button>
        </div>
      </header>

      <main className="relative max-w-[1200px] mx-auto px-6 md:px-10 py-10 flex flex-col gap-6">

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map(s => (
            <div key={s.label} className="rounded-2xl p-5" style={card}>
              <p className="text-[10px] font-bold tracking-[2px] uppercase mb-3" style={label}>{s.label}</p>
              <p className="text-[28px] font-bold leading-none mb-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#f2f4f8' }}>
                {s.value}
              </p>
              <p className="text-[11px]" style={{ color: 'rgba(170,176,188,0.45)', fontFamily: "'Inter', sans-serif" }}>{s.hint}</p>
            </div>
          ))}
        </div>

        {/* ── Gráfico de vendas ── */}
        <div className="grid grid-cols-1 gap-4">

          {/* Vendas */}
          <div className="rounded-2xl p-6" style={card}>
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
              <div>
                <h2 className="text-[16px] font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#f2f4f8' }}>
                  Vendas de planos
                </h2>
                <p className="text-[11px] mt-0.5" style={{ color: 'rgba(170,176,188,0.5)', fontFamily: "'Inter', sans-serif" }}>
                  {stats.totalSales} assinatura{stats.totalSales === 1 ? '' : 's'} no total
                </p>
              </div>
              <div className="flex items-center gap-4">
                {[['#5b626f', '1 mês'], ['#9aa3b2', '3 meses'], ['#e4e8ef', '1 ano']].map(([c, l]) => (
                  <span key={l} className="flex items-center gap-1.5 text-[11px]" style={{ color: 'rgba(200,206,218,0.55)', fontFamily: "'Inter', sans-serif" }}>
                    <span style={{ width: 9, height: 9, borderRadius: 3, background: c, display: 'inline-block' }}/>
                    {l}
                  </span>
                ))}
              </div>
            </div>
            <SalesChart data={stats.sales} />
          </div>

        </div>

        {/* ── Área do Aluno (gestão de conteúdo) — recolhível ── */}
        <div className="rounded-2xl p-6" style={card}>
          <button onClick={() => setStudentOpen(v => !v)} className="w-full flex items-center justify-between gap-3 text-left"
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
            <div>
              <h2 className="text-[16px] font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#f2f4f8' }}>
                Área do Aluno
              </h2>
              <p className="text-[11px] mt-0.5" style={{ color: 'rgba(170,176,188,0.5)', fontFamily: "'Inter', sans-serif" }}>
                Conteúdo exclusivo dos membros Alpha — vídeos e ferramentas, organizados por seção.
              </p>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, transform: studentOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
              <path d="M6 9l6 6 6-6" stroke="rgba(200,206,218,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {studentOpen && <div className="mt-4"><AdminStudentArea /></div>}
        </div>

        {/* ── Afiliados (saldos — só leitura) ── */}
        <div className="rounded-2xl p-6" style={card}>
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <div>
              <h2 className="text-[16px] font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#f2f4f8' }}>
                Afiliados
              </h2>
              <p className="text-[11px] mt-0.5" style={{ color: 'rgba(170,176,188,0.5)', fontFamily: "'Inter', sans-serif" }}>
                Quanto cada afiliado tem. O saque é automático via PIX — você não precisa aprovar nem pagar.
              </p>
            </div>
            <span className="text-[11px] px-3 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(220,225,235,0.10)', color: 'rgba(200,206,218,0.55)', fontFamily: "'Inter', sans-serif" }}>
              {affiliates.length} afiliado{affiliates.length === 1 ? '' : 's'}
            </span>
          </div>

          {affiliates.length === 0 ? (
            <p className="text-[13px] py-4" style={{ color: 'rgba(170,176,188,0.45)', fontFamily: "'Inter', sans-serif" }}>Nenhum afiliado ainda.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="w-full" style={{ borderCollapse: 'collapse', minWidth: 720 }}>
                <thead>
                  <tr>
                    {['Afiliado', 'Cliques', 'Cadastros', 'Disponível', 'Em proc.', 'Já pago', 'Chave PIX'].map((h, i) => (
                      <th key={h} className="text-[10px] font-bold tracking-[1.5px] uppercase pb-3 px-3" style={{ color: 'rgba(170,176,188,0.5)', fontFamily: "'Inter', sans-serif", textAlign: i === 0 || i === 6 ? 'left' : 'right', borderBottom: '1px solid rgba(220,225,235,0.08)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {affiliates.map(a => (
                    <tr key={a.id} style={{ borderBottom: '1px solid rgba(220,225,235,0.05)' }}>
                      <td className="py-3 px-3">
                        <div className="flex flex-col">
                          <span className="text-[13px] font-semibold" style={{ color: '#eef1f6', fontFamily: "'Inter', sans-serif" }}>@{a.refCode}</span>
                          <span className="text-[11px]" style={{ color: 'rgba(170,176,188,0.5)', fontFamily: "'Inter', sans-serif" }}>{a.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-[13px] text-right" style={{ color: 'rgba(200,206,218,0.7)', fontFamily: "'Inter', sans-serif" }}>{a.clicks}</td>
                      <td className="py-3 px-3 text-[13px] text-right" style={{ color: 'rgba(200,206,218,0.7)', fontFamily: "'Inter', sans-serif" }}>{a.signups}</td>
                      <td className="py-3 px-3 text-[13px] font-semibold text-right" style={{ color: '#8ee7b0', fontFamily: "'Space Grotesk', sans-serif" }}>{fmtBrl(a.available)}</td>
                      <td className="py-3 px-3 text-[13px] text-right" style={{ color: 'rgba(252,211,77,0.9)', fontFamily: "'Space Grotesk', sans-serif" }}>{fmtBrl(a.pending)}</td>
                      <td className="py-3 px-3 text-[13px] text-right" style={{ color: 'rgba(200,206,218,0.7)', fontFamily: "'Space Grotesk', sans-serif" }}>{fmtBrl(a.paid)}</td>
                      <td className="py-3 px-3 text-[11px]" style={{ color: 'rgba(170,176,188,0.55)', fontFamily: "'Inter', sans-serif", maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.pixKey || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Usuários ── */}
        <div className="rounded-2xl p-6" style={card}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-[16px] font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#f2f4f8' }}>
                Membros
              </h2>
              <p className="text-[11px] mt-0.5" style={{ color: 'rgba(170,176,188,0.5)', fontFamily: "'Inter', sans-serif" }}>
                Todas as contas registradas e seus planos
              </p>
            </div>
            <span className="text-[11px] px-3 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(220,225,235,0.10)', color: 'rgba(200,206,218,0.55)', fontFamily: "'Inter', sans-serif" }}>
              {users.length} contas
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="w-full" style={{ borderCollapse: 'collapse', minWidth: 640 }}>
              <thead>
                <tr>
                  {['Membro', 'Email', 'Plano', 'Desde', ''].map(h => (
                    <th key={h} className="text-left text-[10px] font-bold tracking-[2px] uppercase pb-3 pr-4" style={label}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const meta = PLAN_META[u.planId || 'free']
                  return (
                    <tr key={u.id} style={{ borderTop: '1px solid rgba(220,225,235,0.06)' }}>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0" style={{
                            background: !u.planId
                              ? 'linear-gradient(135deg, #3a3f48, #2a2e35)'
                              : 'linear-gradient(135deg, #8b93a2, #c2c9d4)',
                            color: !u.planId ? '#aeb6c4' : '#15171c',
                          }}>
                            {u.name[0]}
                          </div>
                          <div>
                            <p className="text-[13px] font-semibold leading-none" style={{ color: '#eef1f6', fontFamily: "'Inter', sans-serif" }}>{u.name}</p>
                            <p className="text-[11px] mt-0.5" style={{ color: 'rgba(170,176,188,0.5)', fontFamily: "'Inter', sans-serif" }}>@{u.handle}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-[12px]" style={{ color: 'rgba(200,206,218,0.55)', fontFamily: "'Inter', sans-serif" }}>{u.email}</td>
                      <td className="py-3 pr-4">
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide whitespace-nowrap" style={{
                          background: meta.bg, border: `1px solid ${meta.border}`, color: meta.color, fontFamily: "'Inter', sans-serif",
                        }}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-[12px] whitespace-nowrap" style={{ color: 'rgba(170,176,188,0.5)', fontFamily: "'Inter', sans-serif" }}>{fmtDate(u.createdAt)}</td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Dar plano Alpha (comp manual) */}
                          <select value="" onChange={e => grantPlan(u, e.target.value)} title="Dar plano Alpha a este usuário"
                            className="text-[11px] rounded-lg px-2 py-1.5 outline-none"
                            style={{ background: 'rgba(58,100,220,0.12)', border: '1px solid rgba(100,150,255,0.24)', color: 'rgba(170,200,255,0.95)', cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>
                            <option value="" style={{ color: '#111' }}>+ Dar plano</option>
                            {Object.entries(PLAN_META).filter(([id]) => id !== 'free').map(([id, m]) => (
                              <option key={id} value={id} style={{ color: '#111' }}>{m.label}</option>
                            ))}
                          </select>
                          {/* Remover Alpha — só aparece pra quem tem plano ativo */}
                          {u.planId && (
                            <button
                              onClick={() => removeAlpha(u)}
                              title="Remover o Alpha e o cargo no Discord"
                              className="text-[11px] font-medium px-3 py-1.5 rounded-lg transition-all whitespace-nowrap"
                              style={{ color: 'rgba(255,180,120,0.8)', background: 'rgba(220,140,40,0.08)', border: '1px solid rgba(230,150,50,0.2)', cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(220,140,40,0.16)'; e.currentTarget.style.color = 'rgba(255,190,130,0.95)' }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(220,140,40,0.08)'; e.currentTarget.style.color = 'rgba(255,180,120,0.8)' }}
                            >
                              Remover Alpha
                            </button>
                          )}
                          {u.role !== 'admin' && (
                          <button
                            onClick={() => deleteUser(u.id)}
                            className="text-[11px] font-medium px-3 py-1.5 rounded-lg transition-all"
                            style={{ color: 'rgba(255,130,130,0.7)', background: 'rgba(220,60,60,0.06)', border: '1px solid rgba(220,80,80,0.15)', cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(220,60,60,0.14)'; e.currentTarget.style.color = 'rgba(255,140,140,0.95)' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(220,60,60,0.06)'; e.currentTarget.style.color = 'rgba(255,130,130,0.7)' }}
                          >
                            Apagar
                          </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Comentários ── */}
        <div className="rounded-2xl p-6" style={card}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-[16px] font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#f2f4f8' }}>
                Comentários da comunidade
              </h2>
              <p className="text-[11px] mt-0.5" style={{ color: 'rgba(170,176,188,0.5)', fontFamily: "'Inter', sans-serif" }}>
                Reviews publicados — modere o que sair da linha
              </p>
            </div>
            <span className="text-[11px] px-3 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(220,225,235,0.10)', color: 'rgba(200,206,218,0.55)', fontFamily: "'Inter', sans-serif" }}>
              {comments.length} ativos
            </span>
          </div>

          <div className="flex flex-col gap-2.5">
            {comments.map(c => (
              <div key={c.id} className="flex items-start gap-3 px-4 py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(220,225,235,0.07)' }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold flex-shrink-0 mt-0.5" style={{
                  background: c.author.plan === 'alpha'
                    ? 'linear-gradient(135deg, #8b93a2, #c2c9d4)'
                    : 'linear-gradient(135deg, #3a3f48, #2a2e35)',
                  color: c.author.plan === 'alpha' ? '#15171c' : '#aeb6c4',
                }}>
                  {c.author.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-semibold" style={{ color: '#eef1f6', fontFamily: "'Inter', sans-serif" }}>{c.author.name}</span>
                    <span className="text-[11px]" style={{ color: 'rgba(170,176,188,0.45)', fontFamily: "'Inter', sans-serif" }}>@{c.author.handle}</span>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide" style={{
                      background: c.author.plan === 'alpha' ? 'rgba(228,232,239,0.10)' : 'rgba(138,145,158,0.08)',
                      border: `1px solid ${c.author.plan === 'alpha' ? 'rgba(228,232,239,0.30)' : 'rgba(138,145,158,0.22)'}`,
                      color: c.author.plan === 'alpha' ? '#e4e8ef' : '#8a919e',
                      fontFamily: "'Inter', sans-serif",
                    }}>
                      {c.author.plan === 'alpha' ? '⚡ Alpha' : '✦ Elixir'}
                    </span>
                    <span className="text-[11px] ml-auto" style={{ color: 'rgba(170,176,188,0.4)', fontFamily: "'Inter', sans-serif" }}>{timeAgo(c.createdAt)}</span>
                  </div>
                  <p className="text-[13px] mt-1 leading-relaxed" style={{ color: 'rgba(210,215,225,0.65)', fontFamily: "'Inter', sans-serif" }}>{c.text}</p>
                </div>
                <button
                  onClick={() => deleteComment(c.id)}
                  className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all mt-0.5"
                  style={{ color: 'rgba(255,130,130,0.6)', background: 'rgba(220,60,60,0.06)', border: '1px solid rgba(220,80,80,0.14)', cursor: 'pointer' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(220,60,60,0.15)'; e.currentTarget.style.color = 'rgba(255,140,140,0.95)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(220,60,60,0.06)'; e.currentTarget.style.color = 'rgba(255,130,130,0.6)' }}
                  title="Apagar comentário"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            ))}
            {comments.length === 0 && (
              <p className="text-center text-[12px] py-6" style={{ color: 'rgba(170,176,188,0.4)', fontFamily: "'Inter', sans-serif" }}>
                Nenhum comentário ativo.
              </p>
            )}
          </div>
        </div>

        <p className="text-center text-[11px] pb-4" style={{ color: 'rgba(170,176,188,0.3)', fontFamily: "'Inter', sans-serif" }}>
          Dados de demonstração — serão conectados ao backend
        </p>
      </main>
    </div>
  )
}
