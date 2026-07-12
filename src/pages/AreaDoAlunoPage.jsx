import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import LoginModal from '../components/LoginModal'
import SecureVideo from '../components/SecureVideo'

// Transforma URLs do texto em links clicáveis (as quebras de linha vêm do white-space: pre-line)
function renderRichText(text) {
  if (!text) return null
  return String(text).split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
    /^https?:\/\//.test(part)
      ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: '#7AA7FF', textDecoration: 'underline', wordBreak: 'break-word' }}>{part}</a>
      : part
  )
}

/* ─── Card de vídeo (clique abre o player em tela cheia) ─── */
function VideoCard({ c, onPlay }) {
  return (
    <div className="group flex flex-col rounded-2xl overflow-hidden transition-all" onContextMenu={e => e.preventDefault()}
      style={{ background: 'linear-gradient(155deg, #0e1a3c 0%, #0a1230 70%, #070d24 100%)', border: '1px solid rgba(122,167,255,0.18)', boxShadow: '0 8px 28px rgba(8,20,80,0.4)' }}>
      <button onClick={() => onPlay(c)} aria-label={`Assistir ${c.title}`}
        className="relative block w-full" style={{ aspectRatio: '16/9', padding: 0, border: 'none', cursor: 'pointer', background: 'radial-gradient(ellipse at center, rgba(58,123,213,0.25) 0%, rgba(10,18,48,0.6) 70%)' }}>
        {c.imageUrl && <img src={c.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ zIndex: 0 }} />}
        {c.imageUrl && <div className="absolute inset-0" style={{ background: 'rgba(6,10,26,0.35)', zIndex: 1 }} />}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full flex items-center justify-center transition-transform group-hover:scale-110" style={{ background: 'rgba(58,123,213,0.4)', border: '1px solid rgba(122,167,255,0.5)', zIndex: 2 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M8 5v14l11-7-11-7z" fill="#cfe0ff"/></svg>
          </div>
        </div>
      </button>
      <div className="p-4">
        <p className="text-[13px] font-semibold leading-snug" style={{ color: '#EEF2FF', fontFamily: "'Inter', sans-serif" }}>{c.title}</p>
        {c.description && <p className="text-[11px] mt-1.5" style={{ color: 'rgba(190,210,235,0.45)', fontFamily: "'Inter', sans-serif", display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{c.description}</p>}
      </div>
    </div>
  )
}

/* ─── Player em tela cheia: vídeo grande em cima, título + descrição embaixo ─── */
function VideoPlayerOverlay({ content, onClose }) {
  const [video, setVideo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(false)

  // Busca o link/ID do vídeo ao abrir
  useEffect(() => {
    let alive = true
    setLoading(true); setErr(false); setVideo(null)
    fetch(`/api/student/video/${content.id}`, { credentials: 'include' })
      .then(r => r.json().then(j => { if (!r.ok) throw new Error(); return j }))
      .then(j => { if (!alive) return; if (j.videoId || j.src) setVideo(j); else setErr(true) })
      .catch(() => { if (alive) setErr(true) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [content.id])

  // Esc fecha + trava o scroll do fundo enquanto aberto
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [onClose])

  return (
    <div onClick={onClose} onContextMenu={e => e.preventDefault()}
      style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(2,4,12,0.88)', backdropFilter: 'blur(12px)', overflowY: 'auto', padding: '40px 16px' }}>
      <div onClick={e => e.stopPropagation()} className="w-full" style={{ maxWidth: 960, margin: '0 auto' }}>
        {/* Fechar */}
        <div className="flex justify-end mb-3">
          <button onClick={onClose} aria-label="Fechar"
            className="inline-flex items-center gap-2 text-[13px] font-medium px-3.5 py-2 rounded-xl transition-all hover:brightness-125"
            style={{ color: 'rgba(200,220,255,0.85)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>
            Fechar ✕
          </button>
        </div>

        {/* Player 16:9 grande */}
        <div className="relative rounded-2xl overflow-hidden" onContextMenu={e => e.preventDefault()}
          style={{ aspectRatio: '16/9', background: '#05070f', border: '1px solid rgba(122,167,255,0.18)', boxShadow: '0 24px 70px rgba(0,0,0,0.6)' }}>
          {loading && !err && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full animate-spin" style={{ border: '3px solid rgba(207,224,255,0.25)', borderTopColor: '#cfe0ff' }} />
            </div>
          )}
          {err && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-[13px]" style={{ color: 'rgba(255,160,160,0.85)', fontFamily: "'Inter', sans-serif" }}>Não foi possível carregar o vídeo.</p>
            </div>
          )}
          {video && (video.youtube
            ? <SecureVideo videoId={video.videoId} />
            : (
              <>
                <iframe src={video.src} title={content.title} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }} />
                <div onContextMenu={e => e.preventDefault()} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 64, zIndex: 2 }} />
              </>
            ))}
        </div>

        {/* Título + descrição abaixo */}
        <div className="mt-5">
          <h2 className="font-bold leading-tight" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#EEF2FF', fontSize: 'clamp(19px, 3vw, 25px)' }}>{content.title}</h2>
          {content.description && (
            <p className="text-[14px] leading-relaxed mt-3" style={{ color: 'rgba(200,216,240,0.72)', fontFamily: "'Inter', sans-serif", whiteSpace: 'pre-line' }}>{renderRichText(content.description)}</p>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Linha de ferramenta ─── */
/* Arquivo enviado → download. Link externo legado → abre em nova aba. */
function ToolRow({ c }) {
  const isFile = !!c.fileName || (c.url || '').startsWith('/uploads/')
  const linkProps = isFile
    ? { download: c.fileName || undefined }
    : { target: '_blank', rel: 'noopener noreferrer' }
  return (
    <a href={c.url || '#'} {...linkProps}
      className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:-translate-y-px"
      style={{ background: 'rgba(120,90,255,0.08)', border: '1px solid rgba(150,120,255,0.22)' }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(150,120,255,0.16)', border: '1px solid rgba(150,120,255,0.3)' }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M14.7 6.3a4 4 0 0 0-5 5l-6 6a1.5 1.5 0 0 0 2 2l6-6a4 4 0 0 0 5-5l-2.5 2.5L11 12l-1.8-1.8L11.7 8z" stroke="rgba(200,180,255,0.9)" strokeWidth="1.4" strokeLinejoin="round"/></svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold truncate" style={{ color: '#e8e2ff', fontFamily: "'Inter', sans-serif" }}>{c.title}</p>
        {(c.description || (isFile && c.fileName)) && <p className="text-[11px] truncate" style={{ color: 'rgba(190,180,235,0.5)', fontFamily: "'Inter', sans-serif" }}>{c.description || c.fileName}</p>}
      </div>
      {isFile
        ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}><path d="M12 4v10m0 0l-4-4m4 4l4-4M5 19h14" stroke="rgba(190,180,235,0.6)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
        : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}><path d="M9 6l6 6-6 6" stroke="rgba(190,180,235,0.5)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>}
    </a>
  )
}

/* ─── Bloco recursivo: conteúdos da categoria + subcategorias (tópicos) ─── */
function CategoryBlock({ node, depth = 0, onPlay }) {
  const videos = node.contents.filter(c => c.type === 'video')
  const tools = node.contents.filter(c => c.type === 'tool')
  const hasAny = videos.length || tools.length || node.children.length

  return (
    <div className={depth > 0 ? 'mt-7' : ''}>
      {depth > 0 && (
        <h3 className="text-[15px] font-bold mb-4 flex items-center gap-2" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#dCE6FF' }}>
          <span style={{ width: 4, height: 16, borderRadius: 2, background: 'linear-gradient(180deg,#7AA7FF,#3a7bd5)' }} />
          {node.name}
        </h3>
      )}
      {videos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {videos.map(c => <VideoCard key={c.id} c={c} onPlay={onPlay} />)}
        </div>
      )}
      {tools.length > 0 && (
        <div className="flex flex-col gap-2 mb-2">
          {tools.map(c => <ToolRow key={c.id} c={c} />)}
        </div>
      )}
      {node.children.map(child => <CategoryBlock key={child.id} node={child} depth={depth + 1} onPlay={onPlay} />)}
      {!hasAny && depth > 0 && (
        <p className="text-[12px]" style={{ color: 'rgba(190,210,235,0.35)', fontFamily: "'Inter', sans-serif" }}>Em breve.</p>
      )}
    </div>
  )
}

/* ─── Folder card (ícone = logo Elixir) — usado por seções e tópicos ─── */
function FolderCard({ name, count, onOpen, imageUrl }) {
  return (
    <button onClick={onOpen}
      className="group flex flex-col text-left rounded-2xl overflow-hidden transition-all hover:-translate-y-1"
      style={{ background: 'linear-gradient(155deg, #0e1a3c 0%, #0a1230 70%, #070d24 100%)', border: '1px solid rgba(122,167,255,0.18)', boxShadow: '0 8px 28px rgba(8,20,80,0.4)', cursor: 'pointer' }}>
      {/* Banner 16:9 — a foto preenche tudo; sem foto, o logo centralizado */}
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: '16/9', background: 'radial-gradient(ellipse at center, rgba(58,123,213,0.18) 0%, rgba(10,18,48,0.5) 70%)' }}>
        {imageUrl
          ? <img src={imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105" />
          : <div className="absolute inset-0 flex items-center justify-center">
              <img src="/imgs/logo3d.png" alt="" className="w-14 h-14 object-contain" style={{ filter: 'drop-shadow(0 4px 12px rgba(58,123,213,0.5))', opacity: 0.85 }} />
            </div>}
      </div>
      <div className="p-4">
        <p className="text-[15px] font-bold leading-tight" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#EEF2FF' }}>{name}</p>
        <span className="text-[11px] mt-1 block" style={{ color: 'rgba(190,210,235,0.45)', fontFamily: "'Inter', sans-serif" }}>{count} {count === 1 ? 'item' : 'itens'}</span>
      </div>
    </button>
  )
}

export default function AreaDoAlunoPage() {
  const { user, loading } = useAuth()
  const [tree, setTree] = useState(null)
  const [error, setError] = useState(null)
  const [openSection, setOpenSection] = useState(null) // folder de seção aberto (null = grade)
  const [chainId, setChainId] = useState(null)
  const [openTopic, setOpenTopic] = useState(null)     // folder de tópico aberto (dentro da seção)
  const [loginOpen, setLoginOpen] = useState(false)
  const [watching, setWatching] = useState(null)       // vídeo aberto no player em tela cheia

  const isAlpha = user?.plan === 'alpha'

  useEffect(() => {
    if (!isAlpha) return
    fetch('/api/student/tree', { credentials: 'include' })
      .then(r => r.json().then(d => { if (!r.ok) throw new Error(d.error || 'Erro'); return d }))
      .then(d => setTree(d.tree))
      .catch(e => setError(e.message))
  }, [isAlpha])

  const section = tree?.find(t => t.id === openSection) || null
  const chains = section?.children || []
  const activeChain = chains.length ? (chains.find(c => c.id === chainId) || chains[0]) : null
  const activeNode = activeChain || section
  const topics = activeNode?.children || []         // subcategorias viram folders de tópico
  const directContents = activeNode?.contents || [] // conteúdo solto (fora de tópico)
  const openTopicNode = topics.find(t => t.id === openTopic) || null
  // conta itens (vídeos/ferramentas) de um nó incluindo subcategorias — subtítulo do folder
  const countItems = (node) => node.contents.length + node.children.reduce((a, c) => a + countItems(c), 0)

  return (
    <div className="relative overflow-hidden" style={{ minHeight: '100vh', background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(30,30,80,0.5) 0%, #020617 60%)' }}>
      {/* Feixe de luz diagonal */}
      <div style={{ position: 'absolute', top: '-20%', left: '50%', width: '80px', height: '160%', background: 'linear-gradient(180deg, rgba(70,130,240,0.20) 0%, rgba(40,95,190,0.08) 60%, transparent 100%)', transform: 'rotate(-28deg)', transformOrigin: 'top center', filter: 'blur(16px)', pointerEvents: 'none' }} />

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-10"
        style={{ height: 64, background: 'linear-gradient(180deg, rgba(4,8,20,0.82) 0%, rgba(3,6,16,0.7) 100%)', backdropFilter: 'blur(24px) saturate(180%)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <Link to="/" className="flex items-center"><img src="/imgs/elixir_logo2.png" alt="Elixir" className="h-8 hover:brightness-125 transition-all" /></Link>
        <div className="flex items-center gap-4">
          <Link to="/" className="text-[12px] font-medium tracking-[2px] uppercase" style={{ color: 'rgba(203,213,225,0.55)', fontFamily: "'Inter', sans-serif" }}>Voltar</Link>
          {user && <span className="text-sm font-medium" style={{ color: 'rgba(190,210,235,0.6)', fontFamily: "'Inter', sans-serif" }}>{user.name}</span>}
        </div>
      </nav>

      <div className="relative z-10 pt-28 pb-24 px-6 md:px-12 max-w-[1100px] mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5" style={{ background: 'rgba(58,123,213,0.12)', border: '1px solid rgba(122,167,255,0.25)' }}>
            <span className="text-[11px] font-semibold tracking-[2px] uppercase" style={{ color: 'rgba(150,190,255,0.85)', fontFamily: "'Inter', sans-serif" }}>Área do Aluno</span>
          </div>
          <h1 className="font-bold leading-[1.08] tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(32px,5vw,52px)', color: '#EEF2FF' }}>
            Conteúdo <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(100deg,#d0e4ff,#7AA7FF,#4d8de8)' }}>exclusivo</span>
          </h1>
        </div>

        {/* Gating */}
        {!loading && !user && (
          <div className="rounded-2xl p-10 text-center" style={{ background: 'rgba(14,26,60,0.6)', border: '1px solid rgba(122,167,255,0.18)' }}>
            <p className="text-[15px] mb-5" style={{ color: 'rgba(220,230,250,0.8)', fontFamily: "'Inter', sans-serif" }}>Entre na sua conta para acessar a Área do Aluno.</p>
            <button onClick={() => setLoginOpen(true)} className="px-7 py-3 rounded-xl text-[13px] font-semibold text-white" style={{ background: 'linear-gradient(135deg,#2a5fc7,#5a98f0)', boxShadow: '0 6px 24px rgba(30,80,200,0.4)', border: 'none', cursor: 'pointer' }}>Entrar</button>
          </div>
        )}

        {user && !isAlpha && (
          <div className="rounded-2xl p-10 text-center" style={{ background: 'rgba(14,26,60,0.6)', border: '1px solid rgba(122,167,255,0.18)' }}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(58,123,213,0.18)', border: '1px solid rgba(122,167,255,0.3)' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="9" rx="2" stroke="#7AA7FF" strokeWidth="1.6"/><path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="#7AA7FF" strokeWidth="1.6"/></svg>
            </div>
            <h2 className="text-[20px] font-bold mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#EEF2FF' }}>Conteúdo exclusivo Alpha</h2>
            <p className="text-[13px] mb-6" style={{ color: 'rgba(190,210,235,0.55)', fontFamily: "'Inter', sans-serif", maxWidth: 380, margin: '0 auto' }}>A Área do Aluno é liberada para membros Alpha. Assine para acessar todos os vídeos e ferramentas.</p>
            <Link to="/planos" className="inline-block px-8 py-3 rounded-xl text-[14px] font-semibold text-white" style={{ background: 'linear-gradient(135deg,#2a5fc7,#5a98f0)', boxShadow: '0 6px 24px rgba(30,80,200,0.4)', textDecoration: 'none' }}>Ver planos Alpha</Link>
          </div>
        )}

        {error && isAlpha && (
          <div className="rounded-2xl px-6 py-4 mb-6" style={{ background: 'rgba(220,50,50,0.08)', border: '1px solid rgba(220,80,80,0.3)' }}>
            <p className="text-[13px]" style={{ color: 'rgba(255,160,160,0.9)', fontFamily: "'Inter', sans-serif" }}>{error}</p>
          </div>
        )}

        {/* Conteúdo (Alpha) — folders */}
        {isAlpha && tree && (
          tree.length === 0 ? (
            <p className="text-center text-[13px] py-16" style={{ color: 'rgba(190,210,235,0.4)', fontFamily: "'Inter', sans-serif" }}>Nenhum conteúdo ainda.</p>
          ) : !openSection ? (
            /* ── Grade de folders (ícone = logo Elixir) ── */
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {tree.map(s => (
                <FolderCard key={s.id} name={s.name} count={countItems(s)} imageUrl={s.imageUrl}
                  onOpen={() => { setOpenSection(s.id); setChainId(null); setOpenTopic(null) }} />
              ))}
            </div>
          ) : (
            /* ── Folder de seção aberto ── */
            <>
              {/* Header: voltar (1 nível) + nome (tópico se aberto, senão seção) */}
              <div className="flex items-center gap-3 mb-7">
                <button onClick={() => { if (openTopicNode) setOpenTopic(null); else { setOpenSection(null); setChainId(null); setOpenTopic(null) } }}
                  className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3.5 py-2 rounded-xl transition-all hover:-translate-x-px"
                  style={{ color: 'rgba(160,195,255,0.85)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>
                  ← Voltar
                </button>
                <div className="flex items-center gap-2.5">
                  <img src="/imgs/logo3d.png" alt="" className="w-7 h-7 object-contain" />
                  <h2 className="text-[20px] font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#EEF2FF' }}>{openTopicNode ? openTopicNode.name : section?.name}</h2>
                </div>
              </div>

              {!openTopicNode ? (
                <>
                  {/* Filtros de rede — FORA dos folders de tópico */}
                  {chains.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-8">
                      {chains.map(ch => {
                        const active = (activeChain?.id) === ch.id
                        return (
                          <button key={ch.id} onClick={() => { setChainId(ch.id); setOpenTopic(null) }}
                            className="px-4 py-1.5 rounded-full text-[12px] font-medium transition-all"
                            style={active
                              ? { background: 'rgba(58,123,213,0.22)', border: '1px solid rgba(122,167,255,0.4)', color: '#A8C8FF', cursor: 'pointer' }
                              : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(190,210,235,0.5)', cursor: 'pointer' }}>
                            {ch.name}
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {/* Conteúdo solto (vídeos/ferramentas fora de tópico) */}
                  {directContents.length > 0 && <div className="mb-4"><CategoryBlock node={{ ...activeNode, children: [] }} depth={0} onPlay={setWatching} /></div>}

                  {/* Folders de tópico */}
                  {topics.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      {topics.map(t => (
                        <FolderCard key={t.id} name={t.name} count={countItems(t)} imageUrl={t.imageUrl} onOpen={() => setOpenTopic(t.id)} />
                      ))}
                    </div>
                  ) : (directContents.length === 0 && (
                    <p className="text-center text-[13px] py-16" style={{ color: 'rgba(190,210,235,0.4)', fontFamily: "'Inter', sans-serif" }}>Nenhum conteúdo nesta categoria ainda.</p>
                  ))}
                </>
              ) : (
                /* ── Tópico aberto: o conteúdo ── */
                (openTopicNode.contents.length || openTopicNode.children.length)
                  ? <CategoryBlock node={openTopicNode} depth={0} onPlay={setWatching} />
                  : <p className="text-center text-[13px] py-16" style={{ color: 'rgba(190,210,235,0.4)', fontFamily: "'Inter', sans-serif" }}>Nenhum conteúdo neste tópico ainda.</p>
              )}
            </>
          )
        )}
      </div>

      {watching && <VideoPlayerOverlay content={watching} onClose={() => setWatching(null)} />}

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} redirect="/area-do-aluno" />
    </div>
  )
}
