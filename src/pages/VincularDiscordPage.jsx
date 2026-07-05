import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'

const FONT = "'Inter', sans-serif"

export default function VincularDiscordPage() {
  const [params] = useSearchParams()
  const code = params.get('p')

  const [step, setStep] = useState('choice') // choice | login
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const finish = async (body) => {
    setLoading(true); setErr('')
    try {
      const res = await fetch('/api/auth/discord/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code, ...body }),
      })
      const d = await res.json().catch(() => ({}))
      if (res.ok) { window.location.href = '/planos' }
      else { setErr(d.error || 'Não foi possível vincular'); setLoading(false) }
    } catch {
      setErr('Erro de conexão'); setLoading(false)
    }
  }

  const card = {
    width: '100%', maxWidth: 400, padding: '32px 28px', borderRadius: 20,
    background: 'rgba(6,12,26,0.9)', border: '1px solid rgba(255,255,255,0.08)',
    boxShadow: '0 20px 60px rgba(2,6,23,0.6)',
  }
  const btnPrimary = {
    width: '100%', padding: '12px', borderRadius: 12, border: 'none', cursor: 'pointer',
    fontFamily: FONT, fontSize: 14, fontWeight: 600, color: '#fff',
    background: 'linear-gradient(135deg, #5865F2, #4752c4)', opacity: loading ? 0.6 : 1,
  }
  const btnGhost = {
    width: '100%', padding: '12px', borderRadius: 12, cursor: 'pointer', marginTop: 10,
    fontFamily: FONT, fontSize: 14, fontWeight: 500, color: 'rgba(200,210,230,0.8)',
    background: 'transparent', border: '1px solid rgba(255,255,255,0.12)',
  }
  const input = {
    width: '100%', padding: '11px 14px', borderRadius: 12, marginBottom: 12, fontFamily: FONT,
    fontSize: 14, color: '#eef2ff', background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)', outline: 'none',
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: '#020617' }}>
      <div style={card}>
        <h1 style={{ fontFamily: FONT, fontSize: 20, fontWeight: 700, color: '#eef2ff', marginBottom: 8 }}>
          Conectar Discord
        </h1>

        {!code ? (
          <p style={{ fontFamily: FONT, fontSize: 14, color: 'rgba(255,150,150,0.9)' }}>
            Link inválido ou expirado. Volte ao site e clique em “Conectar Discord” de novo.
          </p>
        ) : step === 'choice' ? (
          <>
            <p style={{ fontFamily: FONT, fontSize: 14, lineHeight: 1.6, color: 'rgba(190,205,230,0.7)', marginBottom: 22 }}>
              Esse Discord ainda não está vinculado a nenhuma conta. Se você já tem conta na Elixir,
              entre para vincular — assim seu Alpha e seu cargo ficam na conta certa (mesmo com e-mail diferente).
            </p>
            <button style={btnPrimary} onClick={() => setStep('login')} disabled={loading}>
              Já tenho conta — entrar e vincular
            </button>
            <button style={btnGhost} onClick={() => finish({ mode: 'new' })} disabled={loading}>
              Criar conta nova
            </button>
          </>
        ) : (
          <form onSubmit={e => { e.preventDefault(); finish({ mode: 'login', email, password }) }}>
            <p style={{ fontFamily: FONT, fontSize: 14, lineHeight: 1.6, color: 'rgba(190,205,230,0.7)', marginBottom: 18 }}>
              Entre na sua conta Elixir para vincular este Discord a ela.
            </p>
            <input style={input} type="email" placeholder="Seu e-mail de cadastro" value={email}
              onChange={e => setEmail(e.target.value)} autoComplete="email" required />
            <input style={input} type="password" placeholder="Sua senha" value={password}
              onChange={e => setPassword(e.target.value)} autoComplete="current-password" required />
            {err && <p style={{ fontFamily: FONT, fontSize: 13, color: 'rgba(255,140,140,0.9)', marginBottom: 10 }}>{err}</p>}
            <button style={btnPrimary} type="submit" disabled={loading}>
              {loading ? 'Vinculando...' : 'Entrar e vincular'}
            </button>
            <button style={btnGhost} type="button" onClick={() => { setStep('choice'); setErr('') }} disabled={loading}>
              Voltar
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
