import { useState } from 'react'
import { Link } from 'react-router-dom'
import SecureVideo from '../SecureVideo'
import { RichText, getJSON, fmtSize, IconArrow, IconExt, IconFile, IconPlay } from './toolsShared'

// Vídeo: mostra a capa; o ID do YouTube só é buscado no play (o servidor confere o acesso) e toca
// no mesmo player blindado da Área do Aluno — com CC, velocidade e tela cheia no celular.
function VideoBlock({ block }) {
  const [state, setState] = useState('idle') // idle | loading | playing | error
  const [videoId, setVideoId] = useState(null)

  const play = () => {
    setState('loading')
    getJSON(`/api/tools/video/${block.id}`)
      .then(d => { setVideoId(d.videoId); setState('playing') })
      .catch(() => setState('error'))
  }

  return (
    <figure>
      <div className="tl-vid">
        {state === 'playing' ? (
          <SecureVideo videoId={videoId} />
        ) : (
          <button type="button" className="tl-vid-poster" onClick={play} disabled={state === 'loading'}
            aria-label={block.title ? `Assistir: ${block.title}` : 'Assistir vídeo'}>
            {block.imageUrl && <img src={block.imageUrl} alt="" loading="lazy" decoding="async" />}
            <span className="tl-vid-play">{state === 'loading' ? <span className="tl-spin" /> : <IconPlay />}</span>
            {state === 'error' && <span className="tl-vid-err">Não foi possível carregar o vídeo. Toque para tentar de novo.</span>}
          </button>
        )}
      </div>
      {block.title && <figcaption className="tl-cap"><strong>{block.title}</strong></figcaption>}
    </figure>
  )
}

// Botão de link: externo abre em nova aba; interno ("/planos") navega no próprio site
function LinkButton({ block }) {
  const cls = `tl-btn ${block.variant === 'secondary' ? 'tl-btn-ghost' : 'tl-btn-primary'}`
  if (block.url.startsWith('/')) return <Link className={cls} to={block.url}>{block.title} <IconArrow /></Link>
  return <a className={cls} href={block.url} target="_blank" rel="noopener noreferrer">{block.title} <IconExt /></a>
}

// Arquivo: o download passa pelo servidor, que confere o acesso antes de entregar
function FileBlock({ block }) {
  const sub = [block.title && block.fileName, fmtSize(block.fileSize)].filter(Boolean).join(' · ')
  return (
    <div className="tl-b-file">
      <span className="tl-f-ic"><IconFile /></span>
      <div className="tl-f-meta">
        <span className="tl-f-name">{block.title || block.fileName}</span>
        {sub && <span className="tl-f-size">{sub}</span>}
      </div>
      <a className="tl-btn tl-btn-ghost tl-btn-sm" href={`/api/tools/file/${block.id}`}>Baixar</a>
    </div>
  )
}

export default function ToolBlocks({ blocks }) {
  // Botões seguidos ficam lado a lado numa linha só
  const groups = []
  for (const b of blocks) {
    const last = groups[groups.length - 1]
    if (b.type === 'button') {
      if (last?.type === 'buttons') last.items.push(b)
      else groups.push({ type: 'buttons', key: `b${b.id}`, items: [b] })
    } else groups.push({ type: b.type, key: b.id, block: b })
  }

  return (
    <div className="tl-blocks">
      {groups.map(g => {
        if (g.type === 'text') return (
          <section key={g.key} className="tl-b-text">
            {g.block.title && <h2>{g.block.title}</h2>}
            <RichText text={g.block.body} />
          </section>
        )
        if (g.type === 'video') return <VideoBlock key={g.key} block={g.block} />
        if (g.type === 'image') return (
          <figure key={g.key} className="tl-b-image">
            <img src={g.block.url} alt={g.block.title || ''} loading="lazy" decoding="async" />
            {g.block.title && <figcaption className="tl-cap">{g.block.title}</figcaption>}
          </figure>
        )
        if (g.type === 'buttons') return <div key={g.key} className="tl-b-buttons">{g.items.map(b => <LinkButton key={b.id} block={b} />)}</div>
        if (g.type === 'file') return <FileBlock key={g.key} block={g.block} />
        return null
      })}
    </div>
  )
}
