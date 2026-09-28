import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { AlphaBadge, BannerArt, IconArrow, IconX, countsList } from './toolsShared'

// Banner da vitrine (3:1). Clique abre a prévia.
export function ToolBanner({ tool, onOpen }) {
  return (
    <button
      type="button"
      className="tl-banner"
      onClick={e => onOpen(tool, e.currentTarget)}
      aria-label={`${tool.title}${tool.access === 'alpha' ? ' (exclusivo Alpha)' : ''}. Ver detalhes`}
    >
      <BannerArt tool={tool} />
      {tool.access === 'alpha' && <AlphaBadge locked={tool.locked} />}
      <span className="tl-more">Ver detalhes <IconArrow /></span>
    </button>
  )
}

// Prévia da ferramenta: banner, nome, texto curto, o que tem dentro e o botão.
// Sem acesso (tool Alpha) → "Desbloquear com Alpha" + link pra página (que mostra a versão bloqueada).
export function ToolPreview({ tool, onClose }) {
  const closeRef = useRef(null)
  const items = countsList(tool.counts)

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [onClose])

  return (
    <div className="tl-scrim" onClick={onClose}>
      <div className="tl-sheet" role="dialog" aria-modal="true" aria-labelledby="tl-preview-title" onClick={e => e.stopPropagation()}>
        <div className="tl-sheet-art">
          <BannerArt tool={tool} />
          <button ref={closeRef} type="button" className="tl-x" onClick={onClose} aria-label="Fechar prévia"><IconX /></button>
        </div>

        <div className="tl-sheet-body">
          <div className="tl-title-row">
            <h2 id="tl-preview-title">{tool.title}</h2>
            {tool.access === 'alpha' && <AlphaBadge locked={tool.locked} />}
          </div>
          {tool.tagline && <p className="tl-tag">{tool.tagline}</p>}
          <p className="tl-sum">{tool.summary}</p>
          {items.length > 0 && (
            <div className="tl-inside">
              <span className="tl-lbl">Dentro</span>
              {items.map(x => <span key={x} className="tl-chip">{x}</span>)}
            </div>
          )}
        </div>

        <div className="tl-sheet-foot">
          {tool.locked ? (
            <>
              <Link className="tl-btn tl-btn-gold tl-btn-block" to="/planos">Desbloquear com Alpha <IconArrow /></Link>
              <Link className="tl-btn tl-btn-ghost tl-btn-sm tl-btn-block" to={`/tools/${tool.slug}`}>Ver página da ferramenta</Link>
              <p className="tl-foot-note">Assinando o Alpha você libera esta e as outras ferramentas exclusivas.</p>
            </>
          ) : (
            <Link className="tl-btn tl-btn-primary tl-btn-block" to={`/tools/${tool.slug}`}>Acessar ferramenta <IconArrow /></Link>
          )}
        </div>
      </div>
    </div>
  )
}
