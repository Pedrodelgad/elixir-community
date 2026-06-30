import { Link } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import Videos from '../components/Videos'
import LoginModal from '../components/LoginModal'

const PLAN_CONFIG = {
  alpha: { label: 'Alpha', color: '#7AA7FF', bg: 'rgba(58,123,213,0.18)', border: 'rgba(122,167,255,0.3)' },
  normal: { label: 'Elixir', color: '#8FA4C4', bg: 'rgba(143,164,196,0.1)', border: 'rgba(143,164,196,0.2)' },
}

export default function VideosPage() {
  const { user } = useAuth()
  const [loginOpen, setLoginOpen] = useState(false)

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(20,40,90,0.45) 0%, #020617 60%)' }}>

      {/* Nav */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-10"
        style={{
          height: '64px',
          background: 'linear-gradient(180deg, rgba(4,8,20,0.80) 0%, rgba(3,6,16,0.70) 100%)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          boxShadow: '0 8px 32px rgba(2,6,23,0.5)',
        }}
      >
        {/* Glow topo */}
        <div className="absolute top-0 pointer-events-none" style={{
          height: '1px', width: '50%', left: '50%', transform: 'translateX(-50%)',
          background: 'linear-gradient(90deg, transparent 0%, rgba(180,210,255,0.45) 20%, rgba(255,255,255,0.90) 50%, rgba(180,210,255,0.45) 80%, transparent 100%)',
        }}/>

        {/* Logo */}
        <Link to="/" className="flex items-center">
          <img src="/imgs/elixir_logo2.png" alt="Elixir" className="h-8 hover:brightness-125 transition-all" />
        </Link>

        {/* Ações */}
        <div className="flex items-center gap-4">
          <Link to="/" className="text-[12px] font-medium tracking-[2px] uppercase transition-colors duration-200" style={{ color: 'rgba(203,213,225,0.55)', fontFamily: "'Inter', sans-serif" }}
            onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.9)'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(203,213,225,0.55)'}>
            Voltar
          </Link>
          {user ? (
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase" style={{ background: PLAN_CONFIG[user.plan]?.bg, border: `1px solid ${PLAN_CONFIG[user.plan]?.border}`, color: PLAN_CONFIG[user.plan]?.color }}>
                {user.plan === 'alpha' ? '⚡ ' : '✦ '}{PLAN_CONFIG[user.plan]?.label}
              </span>
              <span className="text-sm font-medium" style={{ color: 'rgba(190,210,235,0.6)', fontFamily: "'Inter', sans-serif" }}>{user.name}</span>
            </div>
          ) : (
            <button
              onClick={() => setLoginOpen(true)}
              className="relative inline-flex items-center px-5 py-2 rounded-full text-[12px] font-semibold text-white transition-all hover:-translate-y-px"
              style={{
                background: 'linear-gradient(135deg, rgba(50,105,210,0.95), rgba(80,140,235,0.90))',
                boxShadow: '0 0 0 1px rgba(122,167,255,0.25), 0 4px 20px rgba(40,90,200,0.35)',
                fontFamily: "'Inter', sans-serif",
                border: 'none', cursor: 'pointer',
              }}
            >
              Entrar
            </button>
          )}
        </div>
      </nav>

      {/* Conteúdo */}
      <div className="pt-32 pb-10">
        <Videos onLoginRequest={() => setLoginOpen(true)} />
      </div>

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  )
}
