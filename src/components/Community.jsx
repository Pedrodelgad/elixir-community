import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import AnimateIn from './AnimateIn'
import { useAuth } from '../context/AuthContext'

const PLAN_CONFIG = {
  alpha: { label: 'Alpha', icon: '⚡', color: '#7AA7FF', bg: 'rgba(58,123,213,0.18)', border: 'rgba(122,167,255,0.3)' },
  normal: { label: 'Elixir', icon: '✦', color: '#8FA4C4', bg: 'rgba(143,164,196,0.1)', border: 'rgba(143,164,196,0.2)' },
}

// "2026-06-11T…" → "agora" / "5m" / "2h" / "3d"
function timeAgo(date) {
  const s = (Date.now() - new Date(date).getTime()) / 1000
  if (s < 60) return 'agora'
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}

const glass = {
  background: 'linear-gradient(145deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)',
  backdropFilter: 'blur(16px)',
  border: '1px solid rgba(255,255,255,0.09)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 24px rgba(2,6,20,0.3)',
}

const glassAlpha = {
  background: 'linear-gradient(145deg, rgba(30,55,120,0.18) 0%, rgba(15,30,80,0.12) 100%)',
  backdropFilter: 'blur(16px)',
  border: '1px solid rgba(100,150,255,0.16)',
  boxShadow: 'inset 0 1px 0 rgba(122,167,255,0.08), 0 4px 24px rgba(10,30,100,0.25)',
}

function PlanBadge({ plan }) {
  const c = PLAN_CONFIG[plan] || PLAN_CONFIG.normal
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wide uppercase"
      style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.color }}>
      <span style={{ fontSize: 9 }}>{c.icon}</span>{c.label}
    </span>
  )
}

function Avatar({ name, plan }) {
  const colors = { alpha: 'from-[#2a5fc7] to-[#3d7ae8]', normal: 'from-[#3a6880] to-[#2a5070]' }
  return (
    <div className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-[13px] font-bold text-white bg-gradient-to-br ${colors[plan] || colors.normal}`}>
      {name[0].toUpperCase()}
    </div>
  )
}

export default function Community({ onLoginRequest }) {
  const { user } = useAuth()
  const [reviews, setReviews] = useState([])
  const [text, setText] = useState('')
  const [liked, setLiked] = useState(new Set())
  const [posting, setPosting] = useState(false)

  // Carrega os reviews do banco
  useEffect(() => {
    fetch('/api/comments')
      .then(r => r.json())
      .then(d => setReviews(d.comments || []))
      .catch(() => setReviews([]))
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!text.trim() || !user || posting) return
    setPosting(true)
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ text: text.trim() }),
      })
      const d = await res.json()
      if (res.ok) {
        setReviews(r => [d.comment, ...r])
        setText('')
      }
    } finally {
      setPosting(false)
    }
  }

  const toggleLike = (id) => {
    if (!user) { onLoginRequest?.(); return }
    const removing = liked.has(id)
    // Otimista: atualiza na hora, API confirma por trás
    setLiked(prev => {
      const next = new Set(prev)
      removing ? next.delete(id) : next.add(id)
      return next
    })
    setReviews(r => r.map(rv => rv.id === id ? { ...rv, likes: Math.max(0, rv.likes + (removing ? -1 : 1)) } : rv))
    fetch(`/api/comments/${id}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ remove: removing }),
    }).catch(() => {})
  }

  return (
    <section id="comunidade" className="max-w-[1100px] mx-auto px-6 md:px-16 mb-44">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">

        {/* COLUNA ESQUERDA — sticky */}
        <AnimateIn className="md:sticky md:top-24">
          <span className="text-[11px] font-bold tracking-[3px] uppercase block mb-5" style={{ color: 'rgba(122,167,255,0.6)' }}>Comunidade</span>
          <h2 className="text-[clamp(32px,4vw,48px)] font-bold tracking-tight leading-[1.08] mb-4" style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif", color: '#EEF2FF' }}>
            O que os membros<br />
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(100deg, #d0e4ff 0%, #7AA7FF 45%, #4d8de8 100%)' }}>
              estão dizendo
            </span>
          </h2>
          <p className="text-[15px] text-e-text/70 leading-relaxed mb-8">
            Reviews reais de quem está dentro. Cada membro mostra o seu plano.
          </p>

          {/* Caixa de novo review */}
          {user ? (
            <form onSubmit={handleSubmit}>
              <div className="rounded-xl p-4" style={glassAlpha}>
                <div className="flex gap-3 items-start">
                  <Avatar name={user.name} plan={user.plan} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[13px] font-bold text-e-hi">{user.name}</span>
                      <PlanBadge plan={user.plan} />
                    </div>
                    <textarea
                      value={text}
                      onChange={e => setText(e.target.value)}
                      placeholder="Compartilhe sua experiência…"
                      rows={3}
                      className="w-full rounded-lg px-3 py-2.5 text-[13px] outline-none resize-none transition-all"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(200,215,235,0.85)', fontFamily: "'Inter', sans-serif" }}
                      onFocus={e => e.target.style.borderColor = 'rgba(122,167,255,0.3)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.07)'}
                    />
                    <div className="flex justify-end mt-2">
                      <button type="submit" disabled={!text.trim() || posting}
                        className="px-5 py-2 rounded-full text-xs font-bold text-white transition-all disabled:opacity-30"
                        style={{ background: 'linear-gradient(90deg, #3A7BD5, #7AA7FF)', boxShadow: '0 4px 16px rgba(58,123,213,0.3)' }}>
                        {posting ? 'Publicando…' : 'Publicar'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          ) : (
            <div className="flex items-center gap-4">
              <a href="#" onClick={e => { e.preventDefault(); onLoginRequest() }}
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-[14px] font-bold text-white transition-all hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(90deg, #3A7BD5, #7AA7FF)', boxShadow: '0 4px 20px rgba(58,123,213,0.3)' }}>
                Entrar para comentar
              </a>
            </div>
          )}
        </AnimateIn>

        {/* COLUNA DIREITA — lista de reviews */}
        <div className="flex flex-col gap-3">
          {reviews.length === 0 && (
            <div className="rounded-xl p-8 text-center" style={glass}>
              <p className="text-[13px]" style={{ color: 'rgba(143,164,196,0.5)', fontFamily: "'Inter', sans-serif" }}>
                Ainda não tem nenhum review. Seja o primeiro a contar como é por dentro.
              </p>
            </div>
          )}
          <AnimatePresence initial={false}>
            {reviews.map((r, i) => (
              <motion.div key={r.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <AnimateIn delay={i < 3 ? i * 0.1 : 0}>
                  <div className="rounded-xl p-4 flex gap-3" style={r.author.plan === 'alpha' ? glassAlpha : glass}>
                    <Avatar name={r.author.name} plan={r.author.plan} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[13px] font-bold text-e-hi">{r.author.name}</span>
                        <span className="text-[11px] text-e-lo">@{r.author.handle}</span>
                        <PlanBadge plan={r.author.plan} />
                        <span className="text-[11px] text-e-lo ml-auto">{timeAgo(r.createdAt)}</span>
                      </div>
                      <p className="text-[13px] text-e-text/70 leading-relaxed">{r.text}</p>
                      <button onClick={() => toggleLike(r.id)}
                        className="flex items-center gap-1.5 mt-2 text-[11px] transition-all"
                        style={{ color: liked.has(r.id) ? '#7AA7FF' : 'rgba(143,164,196,0.4)' }}>
                        <svg width="12" height="12" viewBox="0 0 16 16" fill={liked.has(r.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.4">
                          <path d="M8 13.5S2 10 2 5.5A3.5 3.5 0 0 1 8 3.4 3.5 3.5 0 0 1 14 5.5C14 10 8 13.5 8 13.5z" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        {r.likes}
                      </button>
                    </div>
                  </div>
                </AnimateIn>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

      </div>
    </section>
  )
}
