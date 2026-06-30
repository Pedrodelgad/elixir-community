import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const inputStyle = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  fontFamily: "'Inter', sans-serif",
}
const focusIn  = e => { e.target.style.borderColor = 'rgba(122,167,255,0.40)'; e.target.style.boxShadow = '0 0 0 3px rgba(58,123,213,0.12)' }
const focusOut = e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none' }

const labelCls = "block text-[10px] font-bold mb-2 tracking-[2px] uppercase"
const labelStyle = { color: 'rgba(122,167,255,0.55)', fontFamily: "'Inter', sans-serif" }

export default function LoginModal({ open, onClose, redirect = '' }) {
  const { register, login, loginVerify2fa, login2faSendEmail } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState('register') // 'register' | 'login' | 'forgot'
  const [form, setForm] = useState({ name: '', handle: '', email: '', password: '' })
  const [step, setStep] = useState('form') // 'form' | 'success' | 'admin' | 'forgot-sent' | 'forgot-done' | '2fa'
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [successName, setSuccessName] = useState('')

  // estado do 2FA no login
  const [pendingToken, setPendingToken] = useState(null)
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [emailSentTo, setEmailSentTo] = useState('')   // recuperação por email (fallback)
  const [emailDevCode, setEmailDevCode] = useState('')
  const [emailBusy, setEmailBusy] = useState(false)

  // estado do fluxo "esqueceu a senha"
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotCode, setForgotCode] = useState('')
  const [forgotPassword, setForgotPassword] = useState('')
  const [forgotSentTo, setForgotSentTo] = useState('')
  const [forgotDevCode, setForgotDevCode] = useState('')

  const reset = () => {
    setStep('form'); setError(''); setBusy(false)
    setForm({ name: '', handle: '', email: '', password: '' })
    setForgotEmail(''); setForgotCode(''); setForgotPassword(''); setForgotSentTo(''); setForgotDevCode('')
    setPendingToken(null); setTwoFactorCode(''); setEmailSentTo(''); setEmailDevCode(''); setEmailBusy(false)
  }

  const finish = (user) => {
    setSuccessName(user.name)
    if (user.role === 'admin') {
      setStep('admin')
      setTimeout(() => { onClose(); reset(); navigate('/admin') }, 1100)
    } else {
      setStep('success')
      setTimeout(() => { onClose(); reset() }, 1400)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const user = mode === 'register'
        ? await register(form)
        : await login(form.email, form.password)
      // Conta com 2FA: pula para o passo do código
      if (user?.twoFactorRequired) {
        setPendingToken(user.pendingToken)
        setStep('2fa')
        setBusy(false)
        return
      }
      finish(user)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  const handle2fa = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const user = await loginVerify2fa(pendingToken, twoFactorCode)
      finish(user)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  // Recuperação: envia o código por email (quando não tem mais o app autenticador)
  const sendEmailCode = async () => {
    setError(''); setEmailBusy(true)
    try {
      const d = await login2faSendEmail(pendingToken)
      setEmailSentTo(d.sentTo || 'seu email'); setEmailDevCode(d.devCode || '')
    } catch (err) {
      setError(err.message)
    } finally {
      setEmailBusy(false)
    }
  }

  const handleForgotRequest = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Erro inesperado')
      setForgotSentTo(d.sentTo)
      setForgotDevCode(d.devCode || '')
      setStep('forgot-sent')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleForgotConfirm = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail, code: forgotCode, newPassword: forgotPassword }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Erro inesperado')
      setStep('forgot-done')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            className="fixed inset-0 z-[300]"
            style={{ background: 'rgba(2,6,23,0.78)', backdropFilter: 'blur(10px)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed z-[310] left-1/2 top-1/2 w-full max-w-md px-4"
            style={{ x: '-50%', y: '-50%' }}
            initial={{ opacity: 0, scale: 0.96, y: '-46%' }}
            animate={{ opacity: 1, scale: 1, y: '-50%' }}
            exit={{ opacity: 0, scale: 0.96, y: '-46%' }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="rounded-2xl overflow-hidden relative" style={{
              background: 'linear-gradient(170deg, #060f26 0%, #040a1c 50%, #030714 100%)',
              border: '1px solid rgba(255,255,255,0.09)',
              boxShadow: '0 32px 80px rgba(2,6,23,0.85), 0 0 0 1px rgba(58,123,213,0.08), inset 0 1px 0 rgba(122,167,255,0.06)',
            }}>
              {/* Fio de luz no topo */}
              <div style={{
                height: '1px',
                background: 'linear-gradient(90deg, transparent, rgba(122,167,255,0.5), rgba(255,255,255,0.65), rgba(122,167,255,0.5), transparent)',
              }}/>
              {/* Glow ambiente do header */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none" style={{
                width: '360px', height: '180px',
                background: 'radial-gradient(ellipse at top, rgba(58,123,213,0.16) 0%, transparent 70%)',
              }}/>

              <div className="p-8 relative">
                {step === 'admin' ? (
                  <motion.div
                    className="flex flex-col items-center gap-4 py-6"
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  >
                    <motion.div
                      initial={{ scale: 0.6 }} animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                      className="w-16 h-16 rounded-2xl flex items-center justify-center"
                      style={{
                        background: 'linear-gradient(135deg, #5b626f, #c2c9d4)',
                        boxShadow: '0 0 0 6px rgba(200,206,218,0.10), 0 8px 32px rgba(140,148,160,0.3)',
                      }}
                    >
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2l8 4v6c0 4.6-3.3 8.9-8 10-4.7-1.1-8-5.4-8-10V6l8-4z" stroke="#15171c" strokeWidth="1.6" strokeLinejoin="round"/>
                        <path d="M9 12l2 2 4-4" stroke="#15171c" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </motion.div>
                    <div className="text-center">
                      <p className="text-white font-bold text-lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        Acesso administrador
                      </p>
                      <span className="inline-flex items-center gap-1.5 mt-2 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wide" style={{
                        background: 'rgba(228,232,239,0.08)',
                        border: '1px solid rgba(228,232,239,0.25)',
                        color: '#cdd3dd',
                      }}>
                        ⚙ Admin
                      </span>
                    </div>
                    <p className="text-sm" style={{ color: 'rgba(190,210,235,0.45)' }}>Abrindo o painel…</p>
                  </motion.div>
                ) : step === 'success' ? (
                  <motion.div
                    className="flex flex-col items-center gap-4 py-6"
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  >
                    <motion.div
                      initial={{ scale: 0.6 }} animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                      className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white"
                      style={{
                        background: 'linear-gradient(135deg, #2a5fc7, #5a98f0)',
                        boxShadow: '0 0 0 6px rgba(58,123,213,0.12), 0 8px 32px rgba(30,80,200,0.4)',
                      }}
                    >
                      {successName[0]?.toUpperCase()}
                    </motion.div>
                    <div className="text-center">
                      <p className="text-white font-bold text-lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        Bem-vindo, {successName}!
                      </p>
                    </div>
                    <p className="text-sm" style={{ color: 'rgba(190,210,235,0.45)' }}>Entrando na comunidade…</p>
                  </motion.div>
                ) : step === '2fa' ? (
                  <motion.form onSubmit={handle2fa} className="flex flex-col gap-4 py-2" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="text-center mb-1">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: 'rgba(58,123,213,0.16)', border: '1px solid rgba(122,167,255,0.3)' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="9" rx="2" stroke="#7AA7FF" strokeWidth="1.6"/><path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="#7AA7FF" strokeWidth="1.6"/></svg>
                      </div>
                      <h2 className="text-white font-bold text-lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Verificação em duas etapas</h2>
                      <p className="text-[13px] mt-1.5" style={{ color: 'rgba(190,210,235,0.5)', fontFamily: "'Inter', sans-serif" }}>
                        {emailSentTo
                          ? 'Digite o código de 6 dígitos do app autenticador ou o que enviamos por email.'
                          : 'Digite o código de 6 dígitos do seu app autenticador.'}
                      </p>
                    </div>
                    {emailSentTo && (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-[12px]" style={{ background: 'rgba(40,180,120,0.08)', border: '1px solid rgba(60,200,140,0.25)', color: 'rgba(120,230,180,0.9)', fontFamily: "'Inter', sans-serif" }}>
                          Código enviado para {emailSentTo} — vale 15 minutos.
                        </div>
                        {emailDevCode && (
                          <p className="text-[11px] px-1" style={{ color: 'rgba(143,164,196,0.4)', fontFamily: "'Inter', sans-serif" }}>
                            (dev) código: <strong style={{ color: 'rgba(190,210,235,0.7)' }}>{emailDevCode}</strong>
                          </p>
                        )}
                      </div>
                    )}
                    <input
                      type="text" inputMode="numeric" placeholder="000000" value={twoFactorCode}
                      onChange={e => { setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError('') }}
                      autoFocus required
                      className="w-full rounded-xl px-4 py-3 text-center text-lg text-white outline-none transition-all tracking-[10px]"
                      style={inputStyle} onFocus={focusIn} onBlur={focusOut}
                    />
                    {error && (
                      <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-[12px]" style={{ background: 'rgba(220,60,60,0.08)', border: '1px solid rgba(220,80,80,0.25)', color: 'rgba(255,150,150,0.9)', fontFamily: "'Inter', sans-serif" }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.6"/><path d="M12 7v6M12 16.5v.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
                        {error}
                      </div>
                    )}
                    <button type="submit" disabled={busy || twoFactorCode.length < 6}
                      className="w-full py-3.5 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-px disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg, #2a5fc7 0%, #3d7ae8 50%, #5a98f0 100%)', boxShadow: '0 0 0 1px rgba(100,160,255,0.2), 0 6px 24px rgba(30,80,200,0.35)', fontFamily: "'Inter', sans-serif", cursor: busy ? 'wait' : 'pointer' }}>
                      {busy ? 'Verificando…' : 'Verificar'}
                    </button>
                    <button type="button" onClick={sendEmailCode} disabled={emailBusy}
                      className="text-center text-[12px] disabled:opacity-50" style={{ color: 'rgba(122,167,255,0.7)', fontFamily: "'Inter', sans-serif", background: 'none', border: 'none', cursor: emailBusy ? 'wait' : 'pointer' }}>
                      {emailBusy ? 'Enviando…' : emailSentTo ? 'Reenviar código por email' : 'Não consigo usar o app — enviar código por email'}
                    </button>
                    <button type="button" onClick={() => { setStep('form'); setError(''); setTwoFactorCode(''); setPendingToken(null); setEmailSentTo(''); setEmailDevCode('') }}
                      className="text-center text-[12px]" style={{ color: 'rgba(122,167,255,0.55)', fontFamily: "'Inter', sans-serif", background: 'none', border: 'none', cursor: 'pointer' }}>
                      ← Voltar para o login
                    </button>
                  </motion.form>
                ) : (
                  <>
                    {/* Header */}
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-3.5">
                        {/* Avatar preview ao vivo */}
                        <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white transition-all duration-300" style={{
                          background: form.name.trim()
                            ? 'linear-gradient(135deg, #2a5fc7, #5a98f0)'
                            : 'rgba(255,255,255,0.05)',
                          border: form.name.trim()
                            ? '1px solid rgba(122,167,255,0.4)'
                            : '1px dashed rgba(255,255,255,0.15)',
                          boxShadow: form.name.trim() ? '0 4px 20px rgba(30,80,200,0.35)' : 'none',
                        }}>
                          {form.name.trim()
                            ? form.name.trim()[0].toUpperCase()
                            : <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="rgba(190,210,235,0.3)" strokeWidth="1.5"/><path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" stroke="rgba(190,210,235,0.3)" strokeWidth="1.5" strokeLinecap="round"/></svg>
                          }
                        </div>
                        <div>
                          <h2 className="text-white font-bold text-xl tracking-tight leading-none" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                            {mode === 'register' ? 'Criar conta' : 'Entrar na Elixir'}
                          </h2>
                          <p className="text-[13px] mt-1.5" style={{ color: 'rgba(190,210,235,0.45)', fontFamily: "'Inter', sans-serif" }}>
                            {form.handle.trim() ? `@${form.handle.trim()}` : mode === 'register' ? 'Crie sua identidade na comunidade' : 'Bom te ver de novo'}
                          </p>
                        </div>
                      </div>
                      <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:rotate-90 duration-300" style={{ color: 'rgba(190,210,235,0.4)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      </button>
                    </div>

                    {/* Toggle criar conta / entrar */}
                    <div className="grid grid-cols-2 gap-1 p-1 rounded-xl mb-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      {[['register', 'Criar conta'], ['login', 'Já tenho conta']].map(([m, l]) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => { setMode(m); setError('') }}
                          className="py-2 rounded-lg text-[12px] font-semibold transition-all"
                          style={{
                            background: (mode === m || (mode === 'forgot' && m === 'login')) ? 'rgba(58,123,213,0.22)' : 'transparent',
                            border: `1px solid ${(mode === m || (mode === 'forgot' && m === 'login')) ? 'rgba(122,167,255,0.3)' : 'transparent'}`,
                            color: (mode === m || (mode === 'forgot' && m === 'login')) ? '#A8C8FF' : 'rgba(190,210,235,0.45)',
                            fontFamily: "'Inter', sans-serif",
                            cursor: 'pointer',
                          }}
                        >
                          {l}
                        </button>
                      ))}
                    </div>

                    {/* ── Fluxo: esqueceu a senha ── */}
                    {mode === 'forgot' && step === 'form' && (
                      <form onSubmit={handleForgotRequest} className="flex flex-col gap-4">
                        <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(190,210,235,0.5)', fontFamily: "'Inter', sans-serif" }}>
                          Digite o email cadastrado e enviamos um código para criar uma nova senha.
                        </p>
                        <div>
                          <label className={labelCls} style={labelStyle}>Email</label>
                          <input
                            type="email" placeholder="voce@email.com"
                            value={forgotEmail}
                            onChange={e => { setForgotEmail(e.target.value); setError('') }}
                            required autoComplete="email"
                            className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all"
                            style={inputStyle} onFocus={focusIn} onBlur={focusOut}
                          />
                        </div>
                        {error && (
                          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-[12px]" style={{ background: 'rgba(220,60,60,0.08)', border: '1px solid rgba(220,80,80,0.25)', color: 'rgba(255,150,150,0.9)', fontFamily: "'Inter', sans-serif" }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.6"/><path d="M12 7v6M12 16.5v.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
                            {error}
                          </div>
                        )}
                        <button type="submit" disabled={busy}
                          className="w-full py-3.5 rounded-xl text-sm font-semibold text-white mt-1 transition-all hover:-translate-y-px disabled:opacity-50"
                          style={{ background: 'linear-gradient(135deg, #2a5fc7 0%, #3d7ae8 50%, #5a98f0 100%)', boxShadow: '0 0 0 1px rgba(100,160,255,0.2), 0 6px 24px rgba(30,80,200,0.35)', fontFamily: "'Inter', sans-serif", cursor: busy ? 'wait' : 'pointer' }}>
                          {busy ? 'Enviando…' : 'Enviar código'}
                        </button>
                        <button type="button" onClick={() => { setMode('login'); setError('') }}
                          className="text-center text-[12px] transition-colors"
                          style={{ color: 'rgba(122,167,255,0.55)', fontFamily: "'Inter', sans-serif", cursor: 'pointer', background: 'none', border: 'none' }}>
                          ← Voltar para o login
                        </button>
                      </form>
                    )}

                    {mode === 'forgot' && step === 'forgot-sent' && (
                      <form onSubmit={handleForgotConfirm} className="flex flex-col gap-4">
                        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-[12px]" style={{ background: 'rgba(40,180,120,0.08)', border: '1px solid rgba(60,200,140,0.25)', color: 'rgba(120,230,180,0.9)', fontFamily: "'Inter', sans-serif" }}>
                          Código enviado para {forgotSentTo} — vale 15 minutos.
                        </div>
                        {forgotDevCode && (
                          <p className="text-[11px] px-1" style={{ color: 'rgba(143,164,196,0.4)', fontFamily: "'Inter', sans-serif" }}>
                            (dev) código: <strong style={{ color: 'rgba(190,210,235,0.7)' }}>{forgotDevCode}</strong>
                          </p>
                        )}
                        <div>
                          <label className={labelCls} style={labelStyle}>Código de 6 dígitos</label>
                          <input
                            type="text" inputMode="numeric" placeholder="000000"
                            value={forgotCode}
                            onChange={e => { setForgotCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError('') }}
                            required
                            className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all tracking-[6px]"
                            style={inputStyle} onFocus={focusIn} onBlur={focusOut}
                          />
                        </div>
                        <div>
                          <label className={labelCls} style={labelStyle}>Nova senha</label>
                          <input
                            type="password" placeholder="••••••••"
                            value={forgotPassword}
                            onChange={e => { setForgotPassword(e.target.value); setError('') }}
                            required minLength={6} autoComplete="new-password"
                            className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all"
                            style={inputStyle} onFocus={focusIn} onBlur={focusOut}
                          />
                        </div>
                        {error && (
                          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-[12px]" style={{ background: 'rgba(220,60,60,0.08)', border: '1px solid rgba(220,80,80,0.25)', color: 'rgba(255,150,150,0.9)', fontFamily: "'Inter', sans-serif" }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.6"/><path d="M12 7v6M12 16.5v.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
                            {error}
                          </div>
                        )}
                        <button type="submit" disabled={busy || forgotCode.length < 6 || forgotPassword.length < 6}
                          className="w-full py-3.5 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-px disabled:opacity-50"
                          style={{ background: 'linear-gradient(135deg, #2a5fc7 0%, #3d7ae8 50%, #5a98f0 100%)', boxShadow: '0 0 0 1px rgba(100,160,255,0.2), 0 6px 24px rgba(30,80,200,0.35)', fontFamily: "'Inter', sans-serif", cursor: busy ? 'wait' : 'pointer' }}>
                          {busy ? 'Confirmando…' : 'Criar nova senha'}
                        </button>
                      </form>
                    )}

                    {mode === 'forgot' && step === 'forgot-done' && (
                      <div className="flex flex-col items-center gap-4 py-4">
                        <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'rgba(40,180,120,0.14)', border: '1px solid rgba(60,200,140,0.3)', boxShadow: '0 0 20px rgba(40,180,120,0.2)' }}>
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="#5fd9a4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                        <div className="text-center">
                          <p className="text-white font-bold text-lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Senha redefinida!</p>
                          <p className="text-[13px] mt-1" style={{ color: 'rgba(190,210,235,0.45)', fontFamily: "'Inter', sans-serif" }}>Agora é só entrar com a nova senha.</p>
                        </div>
                        <button type="button" onClick={() => { setMode('login'); setStep('form'); setError('') }}
                          className="px-8 py-3 rounded-full text-[13px] font-semibold text-white transition-all hover:-translate-y-px"
                          style={{ background: 'linear-gradient(135deg, #2a5fc7, #5a98f0)', boxShadow: '0 4px 20px rgba(30,80,200,0.35)', fontFamily: "'Inter', sans-serif", cursor: 'pointer', border: 'none' }}>
                          Ir para o login
                        </button>
                      </div>
                    )}

                    {/* ── Formulário normal (register / login) ── */}
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4" style={{ display: mode === 'forgot' ? 'none' : undefined }}>
                      {mode === 'register' && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className={labelCls} style={labelStyle}>Nome</label>
                            <input
                              type="text" placeholder="Seu nome"
                              value={form.name}
                              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                              required
                              className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all"
                              style={inputStyle} onFocus={focusIn} onBlur={focusOut}
                            />
                          </div>
                          <div>
                            <label className={labelCls} style={labelStyle}>Usuário</label>
                            <div className="relative">
                              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold" style={{ color: 'rgba(122,167,255,0.55)' }}>@</span>
                              <input
                                type="text" placeholder="usuario"
                                value={form.handle}
                                onChange={e => setForm(f => ({ ...f, handle: e.target.value.replace(/\s/g,'').toLowerCase() }))}
                                required
                                className="w-full rounded-xl pl-8 pr-4 py-3 text-sm text-white outline-none transition-all"
                                style={inputStyle} onFocus={focusIn} onBlur={focusOut}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      <div>
                        <label className={labelCls} style={labelStyle}>Email</label>
                        <input
                          type="email" placeholder="voce@email.com"
                          value={form.email}
                          onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                          required autoComplete="email"
                          className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all"
                          style={inputStyle} onFocus={focusIn} onBlur={focusOut}
                        />
                      </div>

                      <div>
                        <label className={labelCls} style={labelStyle}>Senha</label>
                        <input
                          type="password" placeholder="••••••••"
                          value={form.password}
                          onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                          required minLength={6}
                          autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                          className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all"
                          style={inputStyle} onFocus={focusIn} onBlur={focusOut}
                        />
                      </div>

                      {/* Erro do servidor */}
                      {error && (
                        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-[12px]" style={{
                          background: 'rgba(220,60,60,0.08)',
                          border: '1px solid rgba(220,80,80,0.25)',
                          color: 'rgba(255,150,150,0.9)',
                          fontFamily: "'Inter', sans-serif",
                        }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.6"/>
                            <path d="M12 7v6M12 16.5v.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                          </svg>
                          {error}
                        </div>
                      )}

                      {/* Esqueceu a senha — só no modo login */}
                      {mode === 'login' && (
                        <div className="flex justify-end -mt-1">
                          <button type="button"
                            onClick={() => { setMode('forgot'); setForgotEmail(form.email); setError('') }}
                            className="text-[12px] transition-colors"
                            style={{ color: 'rgba(122,167,255,0.55)', fontFamily: "'Inter', sans-serif", background: 'none', border: 'none', cursor: 'pointer' }}
                            onMouseEnter={e => e.currentTarget.style.color = '#7AA7FF'}
                            onMouseLeave={e => e.currentTarget.style.color = 'rgba(122,167,255,0.55)'}
                          >
                            Esqueceu a senha?
                          </button>
                        </div>
                      )}

                      {/* Submit */}
                      <button
                        type="submit"
                        disabled={busy}
                        className="w-full py-3.5 rounded-xl text-sm font-semibold text-white mt-1 relative overflow-hidden transition-all hover:-translate-y-px disabled:opacity-50"
                        style={{
                          background: 'linear-gradient(135deg, #2a5fc7 0%, #3d7ae8 50%, #5a98f0 100%)',
                          boxShadow: '0 0 0 1px rgba(100,160,255,0.2), 0 6px 24px rgba(30,80,200,0.35)',
                          fontFamily: "'Inter', sans-serif",
                          cursor: busy ? 'wait' : 'pointer',
                        }}
                      >
                        <span className="absolute inset-0 pointer-events-none animate-shimmer" style={{
                          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)',
                          width: '40%',
                        }}/>
                        <span className="relative">
                          {busy ? 'Aguarde…' : mode === 'register' ? 'Criar conta' : 'Entrar'}
                        </span>
                      </button>

                      <div className="flex items-center gap-3 mt-1">
                        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }}/>
                        <span className="text-[10px] uppercase tracking-[2px]" style={{ color: 'rgba(190,210,235,0.25)', fontFamily: "'Inter', sans-serif" }}>ou</span>
                        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }}/>
                      </div>
                      <a
                        href={`/api/auth/discord${redirect ? '?redirect=' + encodeURIComponent(redirect) : ''}`}
                        className="w-full py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2.5 transition-all hover:-translate-y-px"
                        style={{
                          background: 'rgba(88,101,242,0.14)',
                          border: '1px solid rgba(88,101,242,0.35)',
                          color: 'rgba(180,190,255,0.9)',
                          fontFamily: "'Inter', sans-serif",
                          cursor: 'pointer',
                          textDecoration: 'none',
                        }}
                      >
                        <svg width="16" height="12" viewBox="0 0 71 55" fill="currentColor">
                          <path d="M60.1 4.9A58.5 58.5 0 0 0 45.5.9a40 40 0 0 0-1.8 3.7 54 54 0 0 0-16.4 0A38 38 0 0 0 25.5.9 58.3 58.3 0 0 0 10.9 5C1.6 18.9-.9 32.4.3 45.7a58.9 58.9 0 0 0 18 9.1 43 43 0 0 0 3.7-6.1 38.3 38.3 0 0 1-6-2.9l1.5-1.1a42 42 0 0 0 36 0l1.5 1.1a38.2 38.2 0 0 1-6 2.9 43 43 0 0 0 3.7 6.1 58.7 58.7 0 0 0 18-9.1c1.5-15.4-2.6-28.8-10.5-40.8zM23.8 37.5c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2 6.5 3.2 6.4 7.2c0 4-2.8 7.2-6.4 7.2zm23.4 0c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2 6.5 3.2 6.4 7.2c0 4-2.8 7.2-6.4 7.2z"/>
                        </svg>
                        Continuar com Discord
                      </a>
                    </form>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
