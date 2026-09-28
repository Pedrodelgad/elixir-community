import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Nav from '../components/Nav'
import LoginModal from '../components/LoginModal'
import ToolBlocks from '../components/tools/ToolBlocks'
import {
  getJSON, countsList, lockedLine, fmtDate, pageBg, Beam, AlphaBadge, BannerArt,
  IconArrow, IconLeft, IconLink, IconLockBig,
} from '../components/tools/toolsShared'
import '../components/tools/tools.css'

// Copia o link da ferramenta (se o navegador bloquear, mostra o link pra copiar à mão)
function CopyLink({ slug }) {
  const [state, setState] = useState(null) // null | 'ok' | 'manual'
  const url = `${window.location.origin}/tools/${slug}`
  const copy = () => {
    try {
      navigator.clipboard.writeText(url).then(() => setState('ok'), () => setState('manual'))
    } catch { setState('manual') }
    setTimeout(() => setState(s => (s === 'ok' ? null : s)), 1800)
  }
  return (
    <>
      <button type="button" className="tl-btn tl-btn-ghost tl-btn-sm tl-btn-block" onClick={copy}>
        <IconLink /> {state === 'ok' ? 'Link copiado' : 'Copiar link da ferramenta'}
      </button>
      {state === 'manual' && <p className="tl-copied">{url}</p>}
    </>
  )
}

// Tool Alpha pra quem não é Alpha: só o topo + este cartão (o conteúdo nem chega no navegador)
function LockedCard({ tool, reason, onLogin }) {
  return (
    <>
      <div className="tl-lock">
        <span className="tl-lock-ic"><IconLockBig /></span>
        <h2>Conteúdo exclusivo Alpha</h2>
        <p>{lockedLine(tool.title, tool.counts)}</p>
        <div className="tl-lock-actions">
          <Link className="tl-btn tl-btn-gold" to="/planos">Desbloquear com Alpha <IconArrow /></Link>
          {reason === 'login' && <button type="button" className="tl-btn tl-btn-ghost" onClick={onLogin}>Já sou Alpha · Entrar</button>}
        </div>
      </div>
      <div className="tl-skel-wrap" aria-hidden="true">
        <div className="tl-sk" style={{ width: '42%' }} />
        <div className="tl-sk" style={{ width: '92%' }} />
        <div className="tl-sk" style={{ width: '78%' }} />
        <div className="tl-sk tl-sk-big" />
      </div>
    </>
  )
}

export default function ToolPage() {
  const { slug } = useParams()
  const { user } = useAuth()
  const [data, setData] = useState(null)     // { tool, blocks, reason }
  const [error, setError] = useState(null)   // { status }
  const [loginOpen, setLoginOpen] = useState(false)

  // Recarrega ao trocar de tool ou quando o login/plano muda (libera o conteúdo na hora)
  useEffect(() => {
    let alive = true
    setError(null)
    getJSON(`/api/tools/${encodeURIComponent(slug)}`)
      .then(d => { if (alive) setData(d) })
      .catch(e => { if (alive) { setData(null); setError({ status: e.status }) } })
    return () => { alive = false }
  }, [slug, user?.id, user?.plan])

  useEffect(() => {
    document.title = data?.tool ? `${data.tool.title} · Elixir Tools` : 'Tools · Elixir'
    window.scrollTo(0, 0)
  }, [data?.tool?.slug]) // eslint-disable-line react-hooks/exhaustive-deps

  const tool = data?.tool
  const items = tool ? countsList(tool.counts) : []

  return (
    <div className="relative overflow-hidden tl-root" style={pageBg}>
      <Beam />
      <Nav onLoginRequest={() => setLoginOpen(true)} />

      <div className="relative z-10 pt-28 pb-24 px-6 md:px-12 max-w-[1100px] mx-auto">
        <Link to="/tools" className="tl-back"><IconLeft /> Tools</Link>

        {error ? (
          <div className="tl-state">
            <strong>{error.status === 404 ? 'Ferramenta não encontrada' : 'Não foi possível carregar a ferramenta'}</strong>
            <p>{error.status === 404 ? 'Ela pode ter sido removida ou o link está incorreto.' : 'Confira sua conexão e tente de novo.'}</p>
            <Link className="tl-btn tl-btn-ghost tl-btn-sm" to="/tools">Ver todas as ferramentas</Link>
          </div>
        ) : !tool ? (
          <div aria-busy="true" aria-label="Carregando ferramenta">
            <div className="tl-hero-art tl-skel" />
            <div className="tl-skel-wrap" style={{ opacity: 1 }}>
              <div className="tl-sk" style={{ width: '38%', height: 28 }} />
              <div className="tl-sk" style={{ width: '70%' }} />
            </div>
          </div>
        ) : (
          <>
            {!tool.active && <div className="tl-draft">Rascunho — só administradores veem esta página até ela ser publicada no admin.</div>}
            <div className="tl-hero-art"><BannerArt tool={tool} /></div>

            <div className="tl-grid">
              <div className="tl-main">
                <div className="tl-title-row">
                  <h1>{tool.title}</h1>
                  {tool.access === 'alpha' && <AlphaBadge locked={tool.locked} />}
                </div>
                {tool.tagline && <p className="tl-tag">{tool.tagline}</p>}
                <p className="tl-sum">{tool.summary}</p>
                {tool.locked
                  ? <LockedCard tool={tool} reason={data.reason} onLogin={() => setLoginOpen(true)} />
                  : <ToolBlocks blocks={data.blocks} />}
              </div>

              <aside className="tl-aside" aria-label="Sobre a ferramenta">
                <h3>Nesta ferramenta</h3>
                <dl className="tl-meta">
                  <dt>Acesso</dt>
                  <dd>{tool.access === 'alpha' ? <AlphaBadge locked={tool.locked} /> : <span className="tl-badge tl-badge-pub">Pública</span>}</dd>
                  {items.length > 0 && <><dt>Conteúdo</dt><dd>{items.join(' · ')}</dd></>}
                  <dt>Atualizada</dt><dd>{fmtDate(tool.updatedAt)}</dd>
                </dl>
                {tool.locked
                  ? <Link className="tl-btn tl-btn-gold tl-btn-sm tl-btn-block" to="/planos">Ver planos Alpha</Link>
                  : <CopyLink slug={tool.slug} />}
              </aside>
            </div>
          </>
        )}
      </div>

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} redirect={`/tools/${slug}`} />
    </div>
  )
}
