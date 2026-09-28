import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import Nav from '../components/Nav'
import LoginModal from '../components/LoginModal'
import { ToolBanner, ToolPreview } from '../components/tools/ToolPreview'
import { getJSON, IconTools, pageBg, Beam } from '../components/tools/toolsShared'
import '../components/tools/tools.css'

// Vitrine das ferramentas: banners 3:1 empilhados, na ordem definida no admin.
export default function ToolsPage() {
  const { user } = useAuth()
  const [tools, setTools] = useState(null)
  const [error, setError] = useState(false)
  const [reload, setReload] = useState(0)
  const [open, setOpen] = useState(null)       // tool com a prévia aberta
  const [loginOpen, setLoginOpen] = useState(false)
  const openerRef = useRef(null)

  useEffect(() => { document.title = 'Tools · Elixir' }, [])

  // Recarrega quando o login/plano muda (o selo e o acesso de cada tool dependem disso)
  useEffect(() => {
    let alive = true
    setError(false)
    getJSON('/api/tools')
      .then(d => { if (alive) setTools(d.tools) })
      .catch(() => { if (alive) setError(true) })
    return () => { alive = false }
  }, [user?.id, user?.plan, reload])

  const openPreview = (tool, el) => { openerRef.current = el; setOpen(tool) }
  const closePreview = useCallback(() => {
    setOpen(null)
    requestAnimationFrame(() => openerRef.current?.focus()) // devolve o foco pro banner
  }, [])

  return (
    <div className="relative overflow-hidden tl-root" style={pageBg}>
      <Beam />
      <Nav onLoginRequest={() => setLoginOpen(true)} />

      <div className="relative z-10 pt-28 pb-24 px-6 md:px-12 max-w-[1100px] mx-auto">
        <header className="tl-head">
          <span className="tl-pill"><IconTools /> Tools</span>
          <h1>Ferramentas da <span className="tl-grad">Elixir</span></h1>
          <p>Bots, calculadoras e planilhas que a gente usa no dia a dia. As marcadas com Alpha são liberadas para membros.</p>
        </header>

        {error ? (
          <div className="tl-state">
            <strong>Não foi possível carregar as ferramentas</strong>
            <p>Confira sua conexão e tente de novo.</p>
            <button type="button" className="tl-btn tl-btn-ghost tl-btn-sm" onClick={() => setReload(n => n + 1)}>Tentar de novo</button>
          </div>
        ) : !tools ? (
          <div className="tl-banners" aria-busy="true" aria-label="Carregando ferramentas">
            {[0, 1, 2].map(i => <div key={i} className="tl-banner tl-skel" />)}
          </div>
        ) : tools.length === 0 ? (
          <div className="tl-state">
            <strong>Novas ferramentas em breve</strong>
            <p>Estamos preparando os bots e as planilhas da Elixir. Volte daqui a pouco.</p>
          </div>
        ) : (
          <div className="tl-banners">
            {tools.map(t => <ToolBanner key={t.id} tool={t} onOpen={openPreview} />)}
          </div>
        )}
      </div>

      {open && <ToolPreview tool={open} onClose={closePreview} />}
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} redirect="/tools" />
    </div>
  )
}
