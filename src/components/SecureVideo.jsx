import { useEffect, useRef, useState } from 'react'

/* Player de YouTube "blindado": usa a IFrame API com controls:0 (sem interface do
   YouTube — sem copiar-link, sem logo, sem menu de clique-direito) e controles próprios.
   O vídeo nunca abre o YouTube e o ID não fica acessível pela UI. */

// Carrega a IFrame API uma única vez
let ytApiPromise = null
function loadYT() {
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT)
  if (ytApiPromise) return ytApiPromise
  ytApiPromise = new Promise(resolve => {
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => { if (prev) prev(); resolve(window.YT) }
    const s = document.createElement('script')
    s.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(s)
  })
  return ytApiPromise
}

const fmt = (s) => {
  if (!isFinite(s) || s < 0) return '0:00'
  const m = Math.floor(s / 60), sec = Math.floor(s % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}

export default function SecureVideo({ videoId }) {
  const holderRef = useRef(null)
  const playerRef = useRef(null)
  const wrapRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [cur, setCur] = useState(0)
  const [dur, setDur] = useState(0)

  useEffect(() => {
    let alive = true, poll
    loadYT().then(YT => {
      if (!alive || !holderRef.current) return
      playerRef.current = new YT.Player(holderRef.current, {
        width: '100%', height: '100%', videoId,
        host: 'https://www.youtube-nocookie.com',
        playerVars: {
          controls: 0, rel: 0, modestbranding: 1, disablekb: 1, fs: 0,
          iv_load_policy: 3, playsinline: 1, autoplay: 1, origin: window.location.origin,
        },
        events: {
          onReady: (e) => { setReady(true); setDur(e.target.getDuration() || 0); e.target.playVideo() },
          onStateChange: (e) => { setPlaying(e.data === YT.PlayerState.PLAYING) },
        },
      })
      poll = setInterval(() => {
        const p = playerRef.current
        if (p && p.getCurrentTime) { setCur(p.getCurrentTime() || 0); const d = p.getDuration(); if (d) setDur(d) }
      }, 500)
    })
    return () => { alive = false; clearInterval(poll); try { playerRef.current?.destroy() } catch {} }
  }, [videoId])

  const toggle = () => { const p = playerRef.current; if (!p) return; playing ? p.pauseVideo() : p.playVideo() }
  const seek = (e) => {
    const p = playerRef.current; if (!p || !dur) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
    p.seekTo(ratio * dur, true); setCur(ratio * dur)
  }
  const fullscreen = () => {
    const el = wrapRef.current
    if (!document.fullscreenElement) el?.requestFullscreen?.()
    else document.exitFullscreen?.()
  }

  return (
    <div ref={wrapRef} className="absolute inset-0" style={{ background: '#000' }} onContextMenu={e => e.preventDefault()}>
      {/* iframe do YouTube — sem interação direta (clicks vão pro overlay) */}
      <div ref={holderRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />

      {/* Overlay: captura todos os cliques (play/pause) e bloqueia título/menu do YouTube */}
      <div onClick={toggle} onContextMenu={e => e.preventDefault()} style={{ position: 'absolute', inset: 0, cursor: 'pointer' }} />

      {/* Ícone central quando pausado */}
      {ready && !playing && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(58,123,213,0.5)', border: '1px solid rgba(122,167,255,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7-11-7z" /></svg>
          </div>
        </div>
      )}

      {/* Barra de controle própria */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, background: 'linear-gradient(0deg, rgba(0,0,0,0.65), transparent)' }}>
        <button onClick={toggle} aria-label={playing ? 'Pausar' : 'Tocar'} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', padding: 0, display: 'flex' }}>
          {playing
            ? <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
            : <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7-11-7z" /></svg>}
        </button>
        <div onClick={seek} style={{ flex: 1, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.25)', cursor: 'pointer', position: 'relative' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${dur ? Math.min(100, cur / dur * 100) : 0}%`, background: '#7AA7FF', borderRadius: 3 }} />
        </div>
        <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, fontFamily: "'Inter', sans-serif", whiteSpace: 'nowrap' }}>{fmt(cur)} / {fmt(dur)}</span>
        <button onClick={fullscreen} aria-label="Tela cheia" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', padding: 0, display: 'flex' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 9V5a1 1 0 011-1h4M20 9V5a1 1 0 00-1-1h-4M4 15v4a1 1 0 001 1h4M20 15v4a1 1 0 01-1 1h-4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" /></svg>
        </button>
      </div>
    </div>
  )
}
