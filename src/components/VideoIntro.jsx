import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

const FADE_AT = 3.5   // começa fade aos 3.5s (vídeo tem 4.04s)
const FADE_MS = 700   // duração do fade out

// Mobile/celular: pointer grosso ou tela estreita → render mais leve
const isMobile = typeof window !== 'undefined' &&
  (window.matchMedia?.('(pointer: coarse)').matches || window.innerWidth < 768)

export default function VideoIntro({ onDone }) {
  const [phase, setPhase] = useState('playing') // playing → fading → done
  const videoRef = useRef(null)
  const firedRef = useRef(false)

  const triggerFade = () => {
    if (firedRef.current) return
    firedRef.current = true
    setPhase('fading')
    setTimeout(() => {
      setPhase('done')
      onDone?.()
    }, FADE_MS)
  }

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // Autoplay no mobile: o React não seta a PROPRIEDADE muted de forma confiável (só o atributo),
    // e iOS/Android bloqueiam autoplay se o vídeo não estiver mudo no nível da propriedade → aparece
    // o botão de play. Garantimos mudo aqui e disparamos o play() manualmente.
    video.muted = true
    video.defaultMuted = true
    const playPromise = video.play?.()
    if (playPromise?.catch) {
      playPromise.catch(() => triggerFade())  // autoplay negado → não trava com botão de play, pula pra logo
    }

    const onTime   = () => { if (video.currentTime >= FADE_AT) triggerFade() }
    const fallback = setTimeout(triggerFade, (FADE_AT + 1.5) * 1000)

    video.addEventListener('timeupdate', onTime)
    video.addEventListener('ended', triggerFade)
    video.addEventListener('error', triggerFade)  // codec não suportado (ex.: HEVC no Android) → não trava, pula pra logo na hora
    return () => {
      video.removeEventListener('timeupdate', onTime)
      video.removeEventListener('ended', triggerFade)
      video.removeEventListener('error', triggerFade)
      clearTimeout(fallback)
    }
  }, [])

  if (phase === 'done') return null

  return (
    <motion.div
      className="fixed inset-0 z-[200] overflow-hidden"
      style={{ background: '#020617' }}
      animate={{ opacity: phase === 'fading' ? 0 : 1 }}
      transition={{ duration: FADE_MS / 1000, ease: 'easeInOut' }}
    >
      {/* ── SVG filter: unsharp mask (sharpen) + color matrix ── */}
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <defs>
          <filter id="vid-enhance" colorInterpolationFilters="sRGB">
            {/* Unsharp mask — aumenta nitidez percebida */}
            <feConvolveMatrix
              order="3"
              kernelMatrix="0 -0.6 0  -0.6 4.4 -0.6  0 -0.6 0"
              preserveAlpha="true"
              result="sharp"
            />
            {/* Color grade: contraste + saturação + leve warm */}
            <feColorMatrix
              in="sharp"
              type="matrix"
              values="1.12  0.02  0.00  0  -0.06
                      0.00  1.10  0.02  0  -0.04
                      0.00  0.00  1.06  0  -0.02
                      0     0     0     1   0"
            />
          </filter>
        </defs>
      </svg>

      {/* ── Vídeo com sharpen + color grade ──
          Fontes: mp4 (H.264/avc1) primeiro — universal e leve (~400KB), toca em qualquer
          Android/iOS. O .mov é HEVC (hvc1): não decodifica na maioria dos Androids → só fica
          como fallback. No mobile trocamos o filtro SVG pesado (feConvolveMatrix roda por
          pixel/frame, trava o celular) por um filtro CSS barato acelerado por GPU. */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        preload="auto"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          // Filtro CSS barato (GPU) tanto no mobile quanto no desktop — o feConvolveMatrix (SVG,
          // por pixel/frame) travava a cutscene em máquinas mais fracas. Mantém o color grade.
          filter: isMobile
            ? 'contrast(1.06) saturate(1.08) brightness(1.04)'
            : 'contrast(1.10) saturate(1.12) brightness(1.05)',
          willChange: 'transform',
          transform: 'translateZ(0)',
        }}
      >
        <source src="/imgs/intro.mp4" type="video/mp4" />
        <source src="/imgs/intro.mov" type="video/quicktime" />
      </video>

      {/* ── Vinheta cinemática ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 85% 85% at 50% 50%, transparent 45%, rgba(2,6,23,0.55) 75%, rgba(2,6,23,0.92) 100%)',
        }}
      />

      {/* ── Overlay de tint azul Elixir — sutil, dá coesão ao brand.
           mix-blend-mode sobre vídeo é caro no GPU do celular → só no desktop. ── */}
      {!isMobile && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'rgba(6,26,43,0.12)',
            mixBlendMode: 'multiply',
          }}
        />
      )}

      {/* ── Barras letterbox cinemáticas ── */}
      <div className="absolute top-0 left-0 right-0 pointer-events-none"
        style={{ height: '4.5%', background: '#020617' }} />
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none"
        style={{ height: '4.5%', background: '#020617' }} />

      {/* ── Fade de entrada suave no início ── */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ background: '#020617' }}
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      />
    </motion.div>
  )
}
