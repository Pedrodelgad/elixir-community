import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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

const PLAN_CONFIG = {
  alpha: { label: 'Alpha', icon: '⚡', color: '#7AA7FF', bg: 'rgba(58,123,213,0.18)', border: 'rgba(122,167,255,0.3)' },
  normal: { label: 'Elixir', icon: '✦', color: '#8FA4C4', bg: 'rgba(143,164,196,0.1)', border: 'rgba(143,164,196,0.2)' },
}

function Feedback({ kind, children }) {
  const ok = kind === 'ok'
  return (
    <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-[12px]" style={{
      background: ok ? 'rgba(40,180,120,0.08)' : 'rgba(220,60,60,0.08)',
      border: `1px solid ${ok ? 'rgba(60,200,140,0.25)' : 'rgba(220,80,80,0.25)'}`,
      color: ok ? 'rgba(120,230,180,0.9)' : 'rgba(255,150,150,0.9)',
      fontFamily: "'Inter', sans-serif",
    }}>
      {children}
    </div>
  )
}

export default function AccountModal({ open, onClose }) {
  const { user, updateName, setup2fa, enable2fa, disable2fa, disable2faSendEmail } = useAuth()

  const [name, setName] = useState('')
  const [nameMsg, setNameMsg] = useState(null)   // { kind, text }
  const [savingName, setSavingName] = useState(false)

  // Fluxo de senha: 'idle' → 'sent' → 'done'
  const [pwStep, setPwStep] = useState('idle')
  const [sentTo, setSentTo] = useState('')
  const [devCode, setDevCode] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [pwMsg, setPwMsg] = useState(null)
  const [pwBusy, setPwBusy] = useState(false)

  // Fluxo 2FA: 'idle' → 'setup' (mostrando QR) → ativado | 'disabling'
  const [twoFaStep, setTwoFaStep] = useState('idle')
  const [twoFaQr, setTwoFaQr] = useState('')
  const [twoFaSecret, setTwoFaSecret] = useState('')
  const [twoFaCode, setTwoFaCode] = useState('')
  const [twoFaMsg, setTwoFaMsg] = useState(null)
  const [twoFaBusy, setTwoFaBusy] = useState(false)
  const [twoFaEmailSentTo, setTwoFaEmailSentTo] = useState('') // recuperação por email ao desativar
  const [twoFaEmailDevCode, setTwoFaEmailDevCode] = useState('')

  if (!user) return null

  const resetAll = () => {
    setName(''); setNameMsg(null); setSavingName(false)
    setPwStep('idle'); setSentTo(''); setDevCode(''); setCode(''); setNewPassword(''); setPwMsg(null); setPwBusy(false)
    setTwoFaStep('idle'); setTwoFaQr(''); setTwoFaSecret(''); setTwoFaCode(''); setTwoFaMsg(null); setTwoFaBusy(false)
    setTwoFaEmailSentTo(''); setTwoFaEmailDevCode('')
  }

  const startSetup2fa = async () => {
    setTwoFaBusy(true); setTwoFaMsg(null)
    try {
      const d = await setup2fa()
      setTwoFaQr(d.qr); setTwoFaSecret(d.secret); setTwoFaStep('setup')
    } catch (e) { setTwoFaMsg({ kind: 'err', text: e.message }) }
    finally { setTwoFaBusy(false) }
  }
  const confirmEnable2fa = async (e) => {
    e.preventDefault(); setTwoFaBusy(true); setTwoFaMsg(null)
    try {
      await enable2fa(twoFaCode)
      setTwoFaStep('idle'); setTwoFaCode(''); setTwoFaMsg({ kind: 'ok', text: '2FA ativado! Sua conta está mais protegida.' })
    } catch (err) { setTwoFaMsg({ kind: 'err', text: err.message }) }
    finally { setTwoFaBusy(false) }
  }
  const confirmDisable2fa = async (e) => {
    e.preventDefault(); setTwoFaBusy(true); setTwoFaMsg(null)
    try {
      await disable2fa(twoFaCode)
      setTwoFaStep('idle'); setTwoFaCode(''); setTwoFaEmailSentTo(''); setTwoFaEmailDevCode('')
      setTwoFaMsg({ kind: 'ok', text: '2FA desativado.' })
    } catch (err) { setTwoFaMsg({ kind: 'err', text: err.message }) }
    finally { setTwoFaBusy(false) }
  }
  // Recuperação: envia o código por email para desativar (quando se perde o app autenticador)
  const sendDisableEmailCode = async () => {
    setTwoFaBusy(true); setTwoFaMsg(null)
    try {
      const d = await disable2faSendEmail()
      setTwoFaEmailSentTo(d.sentTo || 'seu email'); setTwoFaEmailDevCode(d.devCode || '')
    } catch (err) { setTwoFaMsg({ kind: 'err', text: err.message }) }
    finally { setTwoFaBusy(false) }
  }
  const close = () => { onClose(); setTimeout(resetAll, 250) }

  const planCfg = PLAN_CONFIG[user.plan] || PLAN_CONFIG.normal

  const saveName = async (e) => {
    e.preventDefault()
    if (!name.trim() || savingName) return
    setSavingName(true); setNameMsg(null)
    try {
      await updateName(name.trim())
      setNameMsg({ kind: 'ok', text: 'Nome atualizado!' })
      setName('')
    } catch (err) {
      setNameMsg({ kind: 'err', text: err.message })
    } finally {
      setSavingName(false)
    }
  }

  const requestCode = async () => {
    setPwBusy(true); setPwMsg(null)
    try {
      const res = await fetch('/api/account/password/request', { method: 'POST', credentials: 'include' })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Erro ao enviar código')
      setSentTo(d.sentTo)
      setDevCode(d.devCode || '')
      setPwStep('sent')
    } catch (err) {
      setPwMsg({ kind: 'err', text: err.message })
    } finally {
      setPwBusy(false)
    }
  }

  const confirmPassword = async (e) => {
    e.preventDefault()
    if (pwBusy) return
    setPwBusy(true); setPwMsg(null)
    try {
      const res = await fetch('/api/account/password/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code, newPassword }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Erro ao trocar senha')
      setPwStep('done')
      setPwMsg({ kind: 'ok', text: 'Senha alterada com sucesso!' })
      setCode(''); setNewPassword('')
    } catch (err) {
      setPwMsg({ kind: 'err', text: err.message })
    } finally {
      setPwBusy(false)
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
            onClick={close}
          />

          {/* Modal — ancorado no topo para nunca cortar */}
          <motion.div
            className="fixed z-[310] left-1/2 w-full max-w-md px-4"
            style={{ x: '-50%', top: '5vh' }}
            initial={{ opacity: 0, scale: 0.96, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 14 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="rounded-2xl overflow-hidden relative flex flex-col" style={{
              background: 'linear-gradient(170deg, #060f26 0%, #040a1c 50%, #030714 100%)',
              border: '1px solid rgba(255,255,255,0.09)',
              boxShadow: '0 32px 80px rgba(2,6,23,0.85), 0 0 0 1px rgba(58,123,213,0.08), inset 0 1px 0 rgba(122,167,255,0.06)',
              maxHeight: '90vh',
            }}>
              {/* Fio de luz */}
              <div style={{
                height: '1px',
                background: 'linear-gradient(90deg, transparent, rgba(122,167,255,0.5), rgba(255,255,255,0.65), rgba(122,167,255,0.5), transparent)',
              }}/>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none" style={{
                width: '360px', height: '160px',
                background: 'radial-gradient(ellipse at top, rgba(58,123,213,0.14) 0%, transparent 70%)',
              }}/>

              <div className="p-8 relative flex-1" style={{ overflowY: 'auto', minHeight: 0 }}>

                {/* Header — perfil */}
                <div className="flex items-start justify-between mb-7">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white" style={{
                      background: 'linear-gradient(135deg, #2a5fc7, #5a98f0)',
                      border: '1px solid rgba(122,167,255,0.4)',
                      boxShadow: '0 4px 20px rgba(30,80,200,0.35)',
                    }}>
                      {user.name[0].toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-white font-bold text-xl tracking-tight leading-none" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        {user.name}
                      </h2>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[13px]" style={{ color: 'rgba(190,210,235,0.45)', fontFamily: "'Inter', sans-serif" }}>
                          @{user.handle}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase" style={{
                          background: planCfg.bg, border: `1px solid ${planCfg.border}`, color: planCfg.color, fontFamily: "'Inter', sans-serif",
                        }}>
                          {planCfg.icon} {planCfg.label}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button onClick={close} className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:rotate-90 duration-300" style={{ color: 'rgba(190,210,235,0.4)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>

                {/* Email cadastrado */}
                <div className="mb-6">
                  <label className={labelCls} style={labelStyle}>Email cadastrado</label>
                  <div className="px-4 py-3 rounded-xl text-sm" style={{
                    background: 'rgba(255,255,255,0.025)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    color: 'rgba(190,210,235,0.55)',
                    fontFamily: "'Inter', sans-serif",
                  }}>
                    {user.email}
                  </div>
                </div>

                {/* ── Trocar nome ── */}
                <form onSubmit={saveName} className="mb-7">
                  <label className={labelCls} style={labelStyle}>Trocar nome</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder={user.name}
                      value={name}
                      onChange={e => { setName(e.target.value); setNameMsg(null) }}
                      className="flex-1 rounded-xl px-4 py-3 text-sm text-white outline-none transition-all"
                      style={inputStyle} onFocus={focusIn} onBlur={focusOut}
                    />
                    <button
                      type="submit"
                      disabled={!name.trim() || savingName}
                      className="px-5 rounded-xl text-[13px] font-semibold text-white transition-all disabled:opacity-30"
                      style={{
                        background: 'linear-gradient(135deg, #2a5fc7, #5a98f0)',
                        boxShadow: '0 4px 16px rgba(30,80,200,0.3)',
                        fontFamily: "'Inter', sans-serif",
                        cursor: savingName ? 'wait' : 'pointer',
                      }}
                    >
                      {savingName ? '…' : 'Salvar'}
                    </button>
                  </div>
                  {nameMsg && <div className="mt-2"><Feedback kind={nameMsg.kind}>{nameMsg.text}</Feedback></div>}
                </form>

                {/* Divisor */}
                <div className="flex items-center gap-3 mb-6">
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }}/>
                  <span className="text-[10px] uppercase tracking-[2px]" style={{ color: 'rgba(190,210,235,0.25)', fontFamily: "'Inter', sans-serif" }}>segurança</span>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }}/>
                </div>

                {/* ── Trocar senha ── */}
                <div>
                  <label className={labelCls} style={labelStyle}>Trocar senha</label>

                  {pwStep === 'idle' && (
                    <>
                      <p className="text-[12px] leading-relaxed mb-3" style={{ color: 'rgba(190,210,235,0.45)', fontFamily: "'Inter', sans-serif" }}>
                        Enviamos um código de verificação para <strong style={{ color: 'rgba(190,210,235,0.7)' }}>{user.email}</strong> para confirmar que é você.
                      </p>
                      <button
                        onClick={requestCode}
                        disabled={pwBusy}
                        className="w-full py-3 rounded-xl text-[13px] font-semibold transition-all hover:-translate-y-px disabled:opacity-40"
                        style={{
                          background: 'rgba(58,100,220,0.16)',
                          border: '1px solid rgba(100,150,255,0.22)',
                          color: 'rgba(160,195,255,0.85)',
                          fontFamily: "'Inter', sans-serif",
                          cursor: pwBusy ? 'wait' : 'pointer',
                        }}
                      >
                        {pwBusy ? 'Enviando…' : 'Enviar código por email'}
                      </button>
                    </>
                  )}

                  {pwStep === 'sent' && (
                    <form onSubmit={confirmPassword} className="flex flex-col gap-3">
                      <Feedback kind="ok">Código enviado para {sentTo} — vale por 15 minutos.</Feedback>
                      {devCode && (
                        <p className="text-[11px] px-1" style={{ color: 'rgba(143,164,196,0.4)', fontFamily: "'Inter', sans-serif" }}>
                          (modo dev — sem email real ainda, o código é <strong style={{ color: 'rgba(190,210,235,0.6)' }}>{devCode}</strong>)
                        </p>
                      )}
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="Código de 6 dígitos"
                        value={code}
                        onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        required
                        className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all tracking-[4px]"
                        style={inputStyle} onFocus={focusIn} onBlur={focusOut}
                      />
                      <input
                        type="password"
                        placeholder="Nova senha (mín. 6 caracteres)"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        required minLength={6}
                        autoComplete="new-password"
                        className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all"
                        style={inputStyle} onFocus={focusIn} onBlur={focusOut}
                      />
                      <button
                        type="submit"
                        disabled={pwBusy || code.length < 6 || newPassword.length < 6}
                        className="w-full py-3 rounded-xl text-[13px] font-semibold text-white transition-all disabled:opacity-30"
                        style={{
                          background: 'linear-gradient(135deg, #2a5fc7, #5a98f0)',
                          boxShadow: '0 4px 16px rgba(30,80,200,0.3)',
                          fontFamily: "'Inter', sans-serif",
                          cursor: pwBusy ? 'wait' : 'pointer',
                        }}
                      >
                        {pwBusy ? 'Confirmando…' : 'Confirmar nova senha'}
                      </button>
                    </form>
                  )}

                  {pwStep === 'done' && pwMsg && <Feedback kind={pwMsg.kind}>{pwMsg.text}</Feedback>}
                  {pwStep !== 'done' && pwMsg && <div className="mt-2"><Feedback kind={pwMsg.kind}>{pwMsg.text}</Feedback></div>}
                </div>

                {/* Divisor */}
                <div className="flex items-center gap-3 my-6">
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }}/>
                  <span className="text-[10px] uppercase tracking-[2px]" style={{ color: 'rgba(190,210,235,0.25)', fontFamily: "'Inter', sans-serif" }}>verificação em 2 etapas</span>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }}/>
                </div>

                {/* ── 2FA ── */}
                <div>
                  {user.twoFactorEnabled && twoFaStep !== 'disabling' ? (
                    <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl" style={{ background: 'rgba(40,180,120,0.08)', border: '1px solid rgba(60,200,140,0.25)' }}>
                      <div className="flex items-center gap-2.5">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="#5fd9a4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        <span className="text-[13px] font-semibold" style={{ color: '#7defc0', fontFamily: "'Inter', sans-serif" }}>2FA ativado</span>
                      </div>
                      <button onClick={() => { setTwoFaStep('disabling'); setTwoFaMsg(null); setTwoFaCode('') }}
                        className="text-[12px] font-medium px-3 py-1.5 rounded-lg" style={{ color: 'rgba(255,140,140,0.85)', background: 'rgba(220,60,60,0.08)', border: '1px solid rgba(220,80,80,0.2)', cursor: 'pointer' }}>
                        Desativar
                      </button>
                    </div>
                  ) : twoFaStep === 'disabling' ? (
                    <form onSubmit={confirmDisable2fa} className="flex flex-col gap-3">
                      <p className="text-[12px]" style={{ color: 'rgba(190,210,235,0.5)', fontFamily: "'Inter', sans-serif" }}>
                        {twoFaEmailSentTo ? 'Digite o código do app ou o que enviamos por email para desativar.' : 'Digite um código do app para desativar — ou peça um por email.'}
                      </p>
                      {twoFaEmailSentTo && (
                        <div className="flex flex-col gap-1">
                          <div className="px-3 py-2 rounded-lg text-[12px]" style={{ background: 'rgba(40,180,120,0.08)', border: '1px solid rgba(60,200,140,0.25)', color: 'rgba(120,230,180,0.9)', fontFamily: "'Inter', sans-serif" }}>
                            Código enviado para {twoFaEmailSentTo} — vale 15 minutos.
                          </div>
                          {twoFaEmailDevCode && (
                            <p className="text-[11px] px-1" style={{ color: 'rgba(143,164,196,0.4)', fontFamily: "'Inter', sans-serif" }}>(dev) código: <strong style={{ color: 'rgba(190,210,235,0.7)' }}>{twoFaEmailDevCode}</strong></p>
                          )}
                        </div>
                      )}
                      <input type="text" inputMode="numeric" placeholder="000000" value={twoFaCode} onChange={e => setTwoFaCode(e.target.value.replace(/\D/g, '').slice(0, 6))} required className="w-full rounded-xl px-4 py-3 text-center text-white outline-none tracking-[6px]" style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
                      <button type="button" onClick={sendDisableEmailCode} disabled={twoFaBusy}
                        className="text-[12px] self-start disabled:opacity-50" style={{ color: 'rgba(122,167,255,0.7)', fontFamily: "'Inter', sans-serif", background: 'none', border: 'none', cursor: twoFaBusy ? 'wait' : 'pointer' }}>
                        {twoFaEmailSentTo ? 'Reenviar código por email' : 'Perdi o app — enviar código por email'}
                      </button>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => { setTwoFaStep('idle'); setTwoFaCode(''); setTwoFaMsg(null); setTwoFaEmailSentTo(''); setTwoFaEmailDevCode('') }} className="flex-1 py-2.5 rounded-xl text-[13px]" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(190,210,235,0.7)', cursor: 'pointer' }}>Cancelar</button>
                        <button type="submit" disabled={twoFaBusy || twoFaCode.length < 6} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-white disabled:opacity-40" style={{ background: 'linear-gradient(135deg, #c0392b, #e74c3c)', cursor: 'pointer' }}>{twoFaBusy ? '…' : 'Desativar'}</button>
                      </div>
                    </form>
                  ) : twoFaStep === 'setup' ? (
                    <form onSubmit={confirmEnable2fa} className="flex flex-col gap-3">
                      <p className="text-[12px] leading-relaxed" style={{ color: 'rgba(190,210,235,0.5)', fontFamily: "'Inter', sans-serif" }}>
                        Escaneie com Google Authenticator, Authy ou similar, depois digite o código que aparecer.
                      </p>
                      {twoFaQr && <img src={twoFaQr} alt="QR do 2FA" className="mx-auto rounded-xl" style={{ width: 160, height: 160, background: '#fff', padding: 6 }} />}
                      <p className="text-[10px] text-center break-all" style={{ color: 'rgba(190,210,235,0.4)', fontFamily: "'Inter', sans-serif" }}>ou digite manual: <strong style={{ color: 'rgba(190,210,235,0.65)' }}>{twoFaSecret}</strong></p>
                      <input type="text" inputMode="numeric" placeholder="000000" value={twoFaCode} onChange={e => setTwoFaCode(e.target.value.replace(/\D/g, '').slice(0, 6))} required className="w-full rounded-xl px-4 py-3 text-center text-white outline-none tracking-[6px]" style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
                      <div className="flex gap-2">
                        <button type="button" onClick={() => { setTwoFaStep('idle'); setTwoFaCode(''); setTwoFaMsg(null) }} className="flex-1 py-2.5 rounded-xl text-[13px]" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(190,210,235,0.7)', cursor: 'pointer' }}>Cancelar</button>
                        <button type="submit" disabled={twoFaBusy || twoFaCode.length < 6} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-white disabled:opacity-40" style={{ background: 'linear-gradient(135deg, #2a5fc7, #5a98f0)', cursor: 'pointer' }}>{twoFaBusy ? '…' : 'Ativar'}</button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[12px]" style={{ color: 'rgba(190,210,235,0.5)', fontFamily: "'Inter', sans-serif" }}>Proteja a conta com um código do celular a cada login.</p>
                      <button onClick={startSetup2fa} disabled={twoFaBusy} className="text-[13px] font-semibold px-4 py-2 rounded-xl whitespace-nowrap disabled:opacity-50" style={{ background: 'rgba(58,100,220,0.16)', border: '1px solid rgba(100,150,255,0.22)', color: 'rgba(160,195,255,0.9)', cursor: 'pointer' }}>{twoFaBusy ? '…' : 'Ativar 2FA'}</button>
                    </div>
                  )}
                  {twoFaMsg && <div className="mt-2.5"><Feedback kind={twoFaMsg.kind === 'ok' ? 'ok' : 'err'}>{twoFaMsg.text}</Feedback></div>}
                </div>

              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
