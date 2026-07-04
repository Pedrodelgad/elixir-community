import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AccountModal from './AccountModal'

const PLAN_CONFIG = {
  alpha: { label: 'Alpha', color: '#7AA7FF', bg: 'rgba(58,123,213,0.18)', border: 'rgba(122,167,255,0.3)' },
  normal: { label: 'Elixir', color: '#8FA4C4', bg: 'rgba(143,164,196,0.1)', border: 'rgba(143,164,196,0.2)' },
}

// Links de navegação — aparecem inline no header (desktop) e dentro do menu (mobile)
const NAV_LINKS = [
  { label: 'Comunidade', href: '#comunidade' },
  { label: 'Área do Aluno', to: '/area-do-aluno' },
  { label: 'Planos', to: '/planos' },
  { label: 'Afiliados', to: '/afiliado' },
]

const linkStyle = { color: 'rgba(190,210,235,0.65)', fontFamily: "'Inter', sans-serif" }
const linkHover = (e, enter) => {
  e.currentTarget.style.background = enter ? 'rgba(255,255,255,0.05)' : 'transparent'
  e.currentTarget.style.color = enter ? 'rgba(255,255,255,0.95)' : 'rgba(190,210,235,0.65)'
}
const linkClass = "flex items-center px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all"

// Item de link inline no header (desktop)
const inlineClass = "px-3 py-2 rounded-lg text-[13px] font-medium transition-all whitespace-nowrap"
function InlineLink({ link, onClick }) {
  const props = {
    className: inlineClass, style: linkStyle, onClick,
    onMouseEnter: e => linkHover(e, true), onMouseLeave: e => linkHover(e, false),
  }
  return link.to
    ? <Link to={link.to} {...props}>{link.label}</Link>
    : <a href={link.href} {...props}>{link.label}</a>
}

// Item de link dentro do menu (mobile)
function MenuLink({ link, onClick }) {
  const props = {
    className: linkClass, style: linkStyle, onClick,
    onMouseEnter: e => linkHover(e, true), onMouseLeave: e => linkHover(e, false),
  }
  return link.to
    ? <Link to={link.to} {...props}>{link.label}</Link>
    : <a href={link.href} {...props}>{link.label}</a>
}

export default function Nav({ onLoginRequest }) {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const dropdownStyle = {
    minWidth: 200,
    background: 'rgba(4,10,24,0.92)',
    backdropFilter: 'blur(24px) saturate(180%)',
    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
    border: '1px solid rgba(255,255,255,0.08)',
    boxShadow: '0 16px 48px rgba(2,6,23,0.7), 0 0 0 1px rgba(122,167,255,0.06)',
  }
  const dropdownAnim = {
    initial: { opacity: 0, y: -8, scale: 0.97 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -6, scale: 0.97 },
    transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] },
  }
  const divider = { height: '1px', background: 'rgba(255,255,255,0.06)', margin: '8px 12px' }

  const dotsButton = (
    <button
      onClick={() => setOpen(v => !v)}
      className="flex items-center justify-center rounded-full transition-all duration-200"
      style={{
        width: 40, height: 40,
        background: open ? 'rgba(255,255,255,0.07)' : 'transparent',
        border: `1px solid ${open ? 'rgba(122,167,255,0.25)' : 'rgba(255,255,255,0.08)'}`,
        color: 'rgba(203,213,225,0.7)', cursor: 'pointer',
      }}
      aria-label="Menu"
    >
      <svg width="18" height="4" viewBox="0 0 18 4" fill="none">
        <circle cx="2"  cy="2" r="1.5" fill="currentColor"/>
        <circle cx="9"  cy="2" r="1.5" fill="currentColor"/>
        <circle cx="16" cy="2" r="1.5" fill="currentColor"/>
      </svg>
    </button>
  )

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 md:px-10 overflow-visible"
      style={{
        height: '64px',
        background: 'linear-gradient(180deg, rgba(4,8,20,0.80) 0%, rgba(3,6,16,0.70) 100%)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        boxShadow: '0 1px 0 rgba(255,255,255,0.03), 0 8px 32px rgba(2,6,23,0.5)',
      }}
    >
      {/* Glow topo */}
      <div className="absolute top-0 pointer-events-none" style={{
        height: '1px', width: '50%', left: '50%', transform: 'translateX(-50%)',
        background: 'linear-gradient(90deg, transparent 0%, rgba(180,210,255,0.45) 20%, rgba(255,255,255,0.90) 50%, rgba(180,210,255,0.45) 80%, transparent 100%)',
        filter: 'blur(0.5px)',
      }}/>

      {/* Linha animada base */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{ height: '1px', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.04)' }} />
        <div style={{
          position: 'absolute', top: 0, left: 0, height: '100%', width: '28%',
          background: 'linear-gradient(90deg, transparent 0%, rgba(180,210,255,0.4) 20%, rgba(255,255,255,0.85) 50%, rgba(180,210,255,0.4) 80%, transparent 100%)',
          filter: 'blur(0.5px)', animation: 'navLineSweep 5s linear infinite',
        }}/>
      </div>

      {/* Logo */}
      <Link to="/" className="relative flex items-center">
        <img src="/imgs/elixir_logo2.png" alt="Elixir" className="h-8 transition-all duration-300 hover:brightness-125" />
      </Link>

      {/* Links inline — desktop */}
      <div className="hidden md:flex items-center gap-1">
        {NAV_LINKS.map(l => <InlineLink key={l.label} link={l} />)}
      </div>

      {/* Direita — menu / entrar */}
      <div ref={menuRef} className="relative flex items-center gap-2">
        {user ? (
          <>
            {dotsButton}
            <AnimatePresence>
              {open && (
                <motion.div {...dropdownAnim}
                  className="absolute right-0 top-[calc(100%+10px)] rounded-2xl overflow-hidden"
                  style={dropdownStyle}
                >
                  <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', height: '1px', width: '60%', background: 'linear-gradient(90deg, transparent, rgba(122,167,255,0.6), rgba(255,255,255,0.7), rgba(122,167,255,0.6), transparent)' }}/>
                  <div className="p-2">
                    {/* Perfil — clica para abrir o painel da conta */}
                    <button
                      onClick={() => { setAccountOpen(true); setOpen(false) }}
                      className="w-full flex items-center gap-3 px-4 py-3 mb-1 rounded-xl transition-all text-left"
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: 'linear-gradient(135deg, #2a5fc7, #5a98f0)' }}>
                        {user.name[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold leading-none mb-1" style={{ color: '#EEF2FF', fontFamily: "'Inter', sans-serif" }}>{user.name}</p>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase" style={{ background: PLAN_CONFIG[user.plan]?.bg, border: `1px solid ${PLAN_CONFIG[user.plan]?.border}`, color: PLAN_CONFIG[user.plan]?.color, fontFamily: "'Inter', sans-serif" }}>
                          {user.plan === 'alpha' ? '⚡ ' : '✦ '}{PLAN_CONFIG[user.plan]?.label}
                        </span>
                      </div>
                      {/* Engrenagem — indica que é clicável */}
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, opacity: 0.4 }}>
                        <circle cx="12" cy="12" r="3" stroke="rgba(190,210,235,0.9)" strokeWidth="1.6"/>
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="rgba(190,210,235,0.9)" strokeWidth="1.4"/>
                      </svg>
                    </button>

                    <div style={divider}/>

                    {/* Painel do admin */}
                    {user.role === 'admin' && (
                      <Link to="/admin" onClick={() => setOpen(false)} className={linkClass}
                        style={{ color: '#cdd3dd', fontFamily: "'Inter', sans-serif" }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(228,232,239,0.07)'; e.currentTarget.style.color = '#ffffff' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#cdd3dd' }}>
                        Painel de controle
                      </Link>
                    )}

                    {/* Links — só no mobile (no desktop já estão no header) */}
                    <div className="md:hidden">
                      {NAV_LINKS.map(l => <MenuLink key={l.label} link={l} onClick={() => setOpen(false)} />)}
                    </div>

                    <button onClick={() => { logout(); setOpen(false) }} className="w-full flex items-center px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all" style={{ color: 'rgba(220,100,100,0.7)', fontFamily: "'Inter', sans-serif", background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(220,60,60,0.08)'; e.currentTarget.style.color = 'rgba(255,120,120,0.9)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(220,100,100,0.7)' }}>
                      Sair
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        ) : (
          <>
            {/* Entrar — desktop */}
            <button onClick={() => onLoginRequest()} className="hidden md:flex items-center justify-center px-5 py-2 rounded-xl text-[13px] font-semibold text-white transition-all"
              style={{ background: 'linear-gradient(135deg, rgba(50,105,210,0.95), rgba(80,140,235,0.90))', boxShadow: '0 0 0 1px rgba(122,167,255,0.2), 0 4px 16px rgba(40,90,200,0.3)', fontFamily: "'Inter', sans-serif", border: 'none', cursor: 'pointer' }}>
              Entrar
            </button>

            {/* Menu — mobile (links + entrar) */}
            <div className="md:hidden flex items-center">
              {dotsButton}
              <AnimatePresence>
                {open && (
                  <motion.div {...dropdownAnim}
                    className="absolute right-0 top-[calc(100%+10px)] rounded-2xl overflow-hidden"
                    style={dropdownStyle}
                  >
                    <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', height: '1px', width: '60%', background: 'linear-gradient(90deg, transparent, rgba(122,167,255,0.6), rgba(255,255,255,0.7), rgba(122,167,255,0.6), transparent)' }}/>
                    <div className="p-2">
                      {NAV_LINKS.map(l => <MenuLink key={l.label} link={l} onClick={() => setOpen(false)} />)}
                      <div style={divider}/>
                      <button onClick={() => { onLoginRequest(); setOpen(false) }} className="w-full flex items-center justify-center py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all"
                        style={{ background: 'linear-gradient(135deg, rgba(50,105,210,0.95), rgba(80,140,235,0.90))', boxShadow: '0 0 0 1px rgba(122,167,255,0.2), 0 4px 16px rgba(40,90,200,0.3)', fontFamily: "'Inter', sans-serif", border: 'none', cursor: 'pointer' }}>
                        Entrar
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>

      {/* Painel da conta */}
      <AccountModal open={accountOpen} onClose={() => setAccountOpen(false)} />
    </nav>
  )
}
