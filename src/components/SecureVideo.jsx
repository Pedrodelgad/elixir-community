import { useEffect, useLayoutEffect, useRef, useState } from 'react'

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

// Velocidades de reprodução (YouTube IFrame API: setPlaybackRate)
const RATES = [0.5, 1, 1.25, 1.5, 1.75, 2]

// Fullscreen API com prefixo webkit (Safari/iPad). No iPhone não existe p/ elementos — só p/ <video>.
const fsElement = () => document.fullscreenElement || document.webkitFullscreenElement || null
const fsEnabled = () => !!(document.fullscreenEnabled || document.webkitFullscreenEnabled)

// Ícone de alto-falante que muda conforme o volume (mudo / baixo / alto), estilo YouTube
function VolumeIcon({ muted, volume }) {
  const off = muted || volume === 0
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
      <path d="M11 5 6 9H3v6h3l5 4V5z" fill="#fff" />
      {off ? (
        <path d="M16 9.5l5 5M21 9.5l-5 5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
      ) : (
        <>
          <path d="M15.5 9.2a4 4 0 010 5.6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
          {volume >= 50 && <path d="M18.2 6.8a8 8 0 010 10.4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />}
        </>
      )}
    </svg>
  )
}

export default function SecureVideo({ videoId }) {
  const holderRef = useRef(null)
  const playerRef = useRef(null)
  const wrapRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [cur, setCur] = useState(0)
  const [dur, setDur] = useState(0)
  const [volume, setVolume] = useState(100)
  const [muted, setMuted] = useState(false)
  const volTrackRef = useRef(null)
  const draggingVol = useRef(false)
  const [rate, setRate] = useState(1)
  const [speedOpen, setSpeedOpen] = useState(false)
  const [cc, setCc] = useState(false)
  const ccRef = useRef(false)
  // Tela cheia: 'native' (Fullscreen API — Android, desktop, iPad) | 'fake' (simulada — iPhone e
  // navegadores dentro de apps, ex. Discord, que não deixam pôr o player em tela cheia) | null
  const [fsMode, setFsMode] = useState(null)
  const [vp, setVp] = useState({ w: 0, h: 0 }) // viewport medida (tela cheia simulada)
  const rotRef = useRef(false)                  // simulada + celular em pé → player girado 90°

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
          onReady: (e) => {
            setReady(true); setDur(e.target.getDuration() || 0)
            try { setVolume(e.target.getVolume?.() ?? 100); setMuted(e.target.isMuted?.() || false) } catch {}
            try { e.target.unloadModule('captions'); e.target.unloadModule('cc') } catch {}
            e.target.playVideo()
          },
          onStateChange: (e) => {
            const isPlaying = e.data === YT.PlayerState.PLAYING
            setPlaying(isPlaying)
            // O módulo de legenda só existe depois do play — aplica o estado atual do CC quando começa a tocar
            if (isPlaying) {
              try {
                if (ccRef.current) { e.target.loadModule('captions'); e.target.loadModule('cc') }
                else { e.target.unloadModule('captions'); e.target.unloadModule('cc') }
              } catch {}
            }
          },
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

  // Posição (0–1) do toque ao longo de uma barra. Na tela cheia simulada girada (celular em pé)
  // as barras ficam na vertical da tela — então mede no eixo Y.
  const along = (e, el) => {
    const r = el.getBoundingClientRect()
    const v = rotRef.current ? (e.clientY - r.top) / r.height : (e.clientX - r.left) / r.width
    return Math.min(1, Math.max(0, v))
  }

  const seek = (e) => {
    const p = playerRef.current; if (!p || !dur) return
    const ratio = along(e, e.currentTarget)
    p.seekTo(ratio * dur, true); setCur(ratio * dur)
  }

  // ── Tela cheia ──
  // 1º tenta a nativa (Android deita o vídeo sozinho). Se o navegador não suporta (iPhone) ou bloqueia
  // (navegador dentro do Discord/Instagram), cai na simulada, que cobre a tela e gira em pé.
  const enterFake = () => { setVp({ w: window.innerWidth, h: window.innerHeight }); setFsMode('fake') }
  const fullscreen = async () => {
    const el = wrapRef.current; if (!el) return
    if (fsMode === 'fake') { setFsMode(null); return }
    if (fsElement()) {
      try { await (document.exitFullscreen || document.webkitExitFullscreen)?.call(document) } catch {}
      return
    }
    const req = el.requestFullscreen || el.webkitRequestFullscreen
    if (req && fsEnabled()) {
      // Vigia independente da promise: alguns navegadores embutidos nem resolvem nem rejeitam
      // o pedido (fica pendurado) — se em 600ms não entrou, cai na simulada.
      const watchdog = setTimeout(() => {
        if (fsElement() !== el) { setVp({ w: window.innerWidth, h: window.innerHeight }); setFsMode(m => m ?? 'fake') }
      }, 600)
      try {
        await req.call(el, { navigationUI: 'hide' })
        try { await screen.orientation?.lock?.('landscape') } catch {}
        return
      } catch { clearTimeout(watchdog) /* recusada → simulada já */ }
    }
    enterFake()
  }

  // Tela cheia nativa: acompanha entrada/saída (inclusive pelo gesto/botão voltar do sistema)
  useEffect(() => {
    const onChange = () => {
      const active = !!wrapRef.current && fsElement() === wrapRef.current
      setFsMode(m => (active ? 'native' : m === 'native' ? null : m))
      if (!active) { try { screen.orientation?.unlock?.() } catch {} }
    }
    document.addEventListener('fullscreenchange', onChange)
    document.addEventListener('webkitfullscreenchange', onChange)
    return () => {
      document.removeEventListener('fullscreenchange', onChange)
      document.removeEventListener('webkitfullscreenchange', onChange)
    }
  }, [])

  // Tela cheia simulada: o player vira position:fixed cobrindo a tela. Ancestrais com
  // backdrop-filter/transform/filter (ex.: o modal com blur) "prendem" o fixed dentro deles —
  // neutraliza enquanto dura e restaura exatamente ao sair.
  useLayoutEffect(() => {
    if (fsMode !== 'fake') return
    const touched = []
    for (let n = wrapRef.current?.parentElement; n && n !== document.documentElement; n = n.parentElement) {
      const cs = getComputedStyle(n)
      const traps = [cs.backdropFilter, cs.webkitBackdropFilter, cs.filter, cs.transform, cs.perspective]
        .some(v => v && v !== 'none')
        || /transform|filter|perspective/.test(cs.willChange || '')
        || /paint|layout|strict|content/.test(cs.contain || '')
      if (!traps) continue
      touched.push([n, n.style.cssText])
      Object.assign(n.style, { backdropFilter: 'none', webkitBackdropFilter: 'none', filter: 'none',
        transform: 'none', perspective: 'none', willChange: 'auto', contain: 'none' })
    }
    const html = document.documentElement
    const prevOverflow = html.style.overflow
    html.style.overflow = 'hidden'
    const measure = () => setVp({ w: window.innerWidth, h: window.innerHeight })
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('orientationchange', measure)
    // Esc sai só da tela cheia (o modal do vídeo também escuta Esc e fecharia tudo)
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); setFsMode(null) } }
    window.addEventListener('keydown', onKey, true)
    return () => {
      touched.forEach(([n, css]) => { n.style.cssText = css })
      html.style.overflow = prevOverflow
      window.removeEventListener('resize', measure)
      window.removeEventListener('orientationchange', measure)
      window.removeEventListener('keydown', onKey, true)
    }
  }, [fsMode])

  const fake = fsMode === 'fake'
  const rotated = fake && vp.h > vp.w
  rotRef.current = rotated
  const rootStyle = !fake ? { background: '#000' } : {
    position: 'fixed', zIndex: 2147483647, background: '#000', right: 'auto', bottom: 'auto', touchAction: 'none',
    ...(rotated
      // em pé: caixa com as dimensões trocadas, centralizada e girada 90° → vídeo deitado ocupando a tela toda
      ? { width: vp.h, height: vp.w, top: (vp.h - vp.w) / 2, left: (vp.w - vp.h) / 2, transform: 'rotate(90deg)' }
      : { width: vp.w, height: vp.h, top: 0, left: 0 }),
  }

  // ── Volume (estilo YouTube: barrinha arrastável + botão de mudo) ──
  const applyVol = (v, m) => {
    const p = playerRef.current; if (!p) return
    if (m) p.mute?.()
    else { p.unMute?.(); p.setVolume?.(v) }
  }
  const setVolFromEvent = (e) => {
    const el = volTrackRef.current; if (!el) return
    const v = Math.round(along(e, el) * 100)
    setVolume(v); setMuted(v === 0); applyVol(v, v === 0)
  }
  const onVolDown = (e) => {
    e.preventDefault(); e.stopPropagation()
    draggingVol.current = true
    setVolFromEvent(e)
    const move = (ev) => { if (draggingVol.current) setVolFromEvent(ev) }
    const up = () => { draggingVol.current = false; window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }
  const toggleMute = (e) => {
    e.stopPropagation()
    if (muted || volume === 0) { const v = volume === 0 ? 60 : volume; setMuted(false); setVolume(v); applyVol(v, false) }
    else { setMuted(true); applyVol(volume, true) }
  }
  const volPct = muted ? 0 : volume

  // ── Velocidade (setPlaybackRate da API do YouTube) ──
  const applyRate = (r) => { playerRef.current?.setPlaybackRate?.(r); setRate(r); setSpeedOpen(false) }

  // ── Legenda / CC (loadModule/unloadModule da API do YouTube) ──
  const toggleCC = (e) => {
    e.stopPropagation()
    const nv = !cc; setCc(nv); ccRef.current = nv
    const p = playerRef.current; if (!p) return
    try {
      if (nv) { p.loadModule?.('captions'); p.loadModule?.('cc') }
      else { p.unloadModule?.('captions'); p.unloadModule?.('cc') }
    } catch {}
  }

  return (
    <div ref={wrapRef} className="absolute inset-0" style={rootStyle} onContextMenu={e => e.preventDefault()}>
      {/* iframe do YouTube — sem interação direta (clicks vão pro overlay) */}
      <div ref={holderRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />

      {/* Overlay: captura todos os cliques (play/pause) e bloqueia título/menu do YouTube */}
      <div onClick={() => { if (speedOpen) setSpeedOpen(false); else toggle() }} onContextMenu={e => e.preventDefault()} style={{ position: 'absolute', inset: 0, cursor: 'pointer' }} />

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

        {/* Controle de volume — arrastar a barrinha p/ subir/baixar; botão muta/desmuta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <button onClick={toggleMute} aria-label={muted ? 'Ativar som' : 'Mudo'} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', padding: 0, display: 'flex' }}>
            <VolumeIcon muted={muted} volume={volume} />
          </button>
          <div ref={volTrackRef} onPointerDown={onVolDown} style={{ width: 66, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.25)', cursor: 'pointer', position: 'relative', touchAction: 'none' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${volPct}%`, background: '#fff', borderRadius: 3 }} />
            <div style={{ position: 'absolute', left: `${volPct}%`, top: '50%', width: 12, height: 12, marginLeft: -6, transform: 'translateY(-50%)', borderRadius: '50%', background: '#fff', boxShadow: '0 0 3px rgba(0,0,0,0.5)' }} />
          </div>
        </div>

        <div onClick={seek} style={{ flex: 1, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.25)', cursor: 'pointer', position: 'relative' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${dur ? Math.min(100, cur / dur * 100) : 0}%`, background: '#7AA7FF', borderRadius: 3 }} />
        </div>
        <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, fontFamily: "'Inter', sans-serif", whiteSpace: 'nowrap' }}>{fmt(cur)} / {fmt(dur)}</span>

        {/* Legenda (CC) — liga/desliga (desligada por padrão) */}
        <button onClick={toggleCC} aria-label={cc ? 'Desativar legenda' : 'Ativar legenda'} title={cc ? 'Desativar legenda' : 'Ativar legenda'}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.3, lineHeight: '13px', fontFamily: "'Inter', sans-serif", color: cc ? '#7AA7FF' : '#fff', borderBottom: `2px solid ${cc ? '#7AA7FF' : 'transparent'}` }}>CC</span>
        </button>

        {/* Velocidade de reprodução (0.5x–2x) */}
        <div style={{ position: 'relative', display: 'flex' }}>
          <button onClick={() => setSpeedOpen(o => !o)} aria-label="Velocidade"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: rate !== 1 ? '#7AA7FF' : '#fff', padding: '0 2px', display: 'flex', alignItems: 'center', fontSize: 12, fontWeight: 700, fontFamily: "'Inter', sans-serif", whiteSpace: 'nowrap' }}>
            {rate}x
          </button>
          {speedOpen && (
            <div style={{ position: 'absolute', bottom: 'calc(100% + 12px)', right: 0, background: 'rgba(12,16,26,0.97)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 10, padding: 5, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 78, boxShadow: '0 10px 28px rgba(0,0,0,0.55)', zIndex: 5 }}>
              {RATES.map(r => (
                <button key={r} onClick={() => applyRate(r)}
                  style={{ background: r === rate ? 'rgba(58,123,213,0.35)' : 'none', border: 'none', cursor: 'pointer', color: r === rate ? '#cfe0ff' : 'rgba(255,255,255,0.85)', padding: '6px 10px', borderRadius: 7, fontSize: 12.5, fontWeight: r === rate ? 700 : 500, textAlign: 'center', fontFamily: "'Inter', sans-serif", whiteSpace: 'nowrap' }}>
                  {r === 1 ? 'Normal' : r + 'x'}
                </button>
              ))}
            </div>
          )}
        </div>

        <button onClick={fullscreen} aria-label={fsMode ? 'Sair da tela cheia' : 'Tela cheia'} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', padding: 0, display: 'flex' }}>
          {fsMode
            ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M9 4v4a1 1 0 01-1 1H4M15 4v4a1 1 0 001 1h4M9 20v-4a1 1 0 00-1-1H4M15 20v-4a1 1 0 011-1h4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" /></svg>
            : <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 9V5a1 1 0 011-1h4M20 9V5a1 1 0 00-1-1h-4M4 15v4a1 1 0 001 1h4M20 15v4a1 1 0 01-1 1h-4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" /></svg>}
        </button>
      </div>
    </div>
  )
}
