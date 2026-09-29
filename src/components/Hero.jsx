import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion'
import { DiscordIcon } from './icons'

const ease = [0.16, 1, 0.3, 1]
const DISCORD_INVITE = 'https://discord.gg/elixiralpha'

// Fundo em vídeo (10s em loop, sem áudio, ~1,9 MB). A capa é o 1º quadro do vídeo: aparece na hora
// e a troca pro vídeo não "pula".
const HERO_VIDEO = '/video/hero-bg.mp4'
const HERO_POSTER = '/video/hero-bg-poster.jpg'

// Quem pediu menos animação no sistema ou está economizando dados fica só com a capa (imagem).
const wantsVideo = () => {
  if (typeof window === 'undefined') return false
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const saveData = navigator.connection?.saveData
  return !reduceMotion && !saveData
}

// Entrada em cascata: eyebrow → "Comunidade" → "On-Chain" → subtítulo → botões
const cascade = { hidden: {}, show: { transition: { staggerChildren: 0.13, delayChildren: 0.1 } } }
const rise = {
  hidden: { opacity: 0, y: 34, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 1.1, ease } },
}

// `ready`: o site já apareceu (a intro do logo terminou) — a cascata do texto começa aí,
// e não escondida atrás da intro.
export default function Hero({ ready = true }) {
  const reduce = useReducedMotion()

  // ── MOUSE TRACKING (spotlight que segue o cursor) ──
  const mx = useMotionValue(0.5)
  const my = useMotionValue(0.5)
  const spS = { stiffness: 90, damping: 28 }
  const spX = useSpring(useTransform(mx, [0,1], ['5%', '85%']),  spS)
  const spY = useSpring(useTransform(my, [0,1], ['5%', '85%']),  spS)

  // ── VÍDEO DE FUNDO ──
  const sectionRef = useRef(null)
  const videoRef = useRef(null)
  const [useVideo] = useState(wantsVideo)
  const [playing, setPlaying] = useState(false)

  // ── ROLAGEM: o texto sobe mais rápido e some, o fundo aproxima de leve (profundidade) ──
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end start'] })
  const contentY = useTransform(scrollYProgress, [0, 1], [0, -140])
  const contentOpacity = useTransform(scrollYProgress, [0, 0.55], [1, 0])
  const bgScale = useTransform(scrollYProgress, [0, 1], [1, 1.12])
  const cueOpacity = useTransform(scrollYProgress, [0, 0.12], [1, 0])

  // O React não escreve o atributo "muted" no HTML, e navegador de celular (iPhone/Android) decide o
  // autoplay olhando esse atributo quando o vídeo entra na página → marca no mesmo instante (ref callback).
  const setVideoEl = (el) => {
    videoRef.current = el
    if (el) { el.muted = true; el.defaultMuted = true; el.setAttribute('muted', '') }
  }

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    let inView = true
    // bloqueado (ex.: modo economia de bateria do iPhone) → fica a capa
    const tryPlay = () => v.play().catch(e => console.warn('[Hero] vídeo de fundo não tocou:', e.name))
    tryPlay()
    // Pausa quando o topo sai da tela (poupa bateria/processamento) e volta a tocar ao reaparecer
    const io = new IntersectionObserver(([e]) => { inView = e.isIntersecting; if (inView) tryPlay(); else v.pause() }, { threshold: 0.05 })
    if (sectionRef.current) io.observe(sectionRef.current)
    // Voltou pra aba/app → retoma (o navegador pausa vídeo sem som em página escondida)
    const onVisible = () => { if (document.visibilityState === 'visible' && inView) tryPlay() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { io.disconnect(); document.removeEventListener('visibilitychange', onVisible) }
  }, [])

  const handleMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    mx.set((e.clientX - r.left) / r.width)
    my.set((e.clientY - r.top)  / r.height)
  }

  const handleLeave = () => { mx.set(0.5); my.set(0.5) }

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen flex items-center justify-center text-center overflow-hidden cursor-default"
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
    >
      {/* ── FUNDO: capa (aparece na hora) + vídeo em loop por cima quando começa a tocar ──
          A camada toda some em degradê no pé (máscara) e revela o fundo do resto do site por baixo:
          sem "emenda" entre o topo e a próxima seção. A máscara fica fora do zoom da rolagem. */}
      <div className="absolute inset-0 pointer-events-none" style={{
        maskImage: 'linear-gradient(to bottom, #000 0%, #000 58%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, #000 0%, #000 58%, transparent 100%)',
      }}>
      <motion.div className="absolute inset-0" style={reduce ? undefined : { scale: bgScale }}>
        <div className="absolute inset-0" style={{ background: `#020617 url(${HERO_POSTER}) 65% 50% / cover no-repeat` }} />
        {useVideo && (
          <video
            ref={setVideoEl}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            src={HERO_VIDEO}
            poster={HERO_POSTER}
            autoPlay muted loop playsInline preload="auto"
            disablePictureInPicture disableRemotePlayback
            aria-hidden="true" tabIndex={-1}
            onPlaying={() => setPlaying(true)}
            // recorte deslocado pra direita: no celular (tela em pé) mostra os arcos de luz, que ficam à direita no vídeo
            style={{ objectPosition: '65% 50%', opacity: playing ? 1 : 0, transition: 'opacity 600ms ease' }}
          />
        )}
      </motion.div>

      {/* ── LEITURA: escurece atrás do texto (os arcos de luz passam por trás do título) e nas bordas ── */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: `
          radial-gradient(ellipse 48% 42% at 50% 50%, rgba(2,6,23,0.62) 0%, rgba(2,6,23,0.34) 55%, transparent 100%),
          radial-gradient(ellipse at 50% 50%, transparent 45%, rgba(2,6,23,0.72) 100%)
        `,
      }}/>
      {/* topo: mantém o contraste da barra do menu */}
      <div className="absolute top-0 left-0 right-0 h-32 pointer-events-none" style={{
        background: 'linear-gradient(to bottom, rgba(2,6,23,0.65), transparent)',
      }}/>
      </div>

      {/* ── SPOTLIGHT — cursor ── */}
      <motion.div
        className="absolute pointer-events-none rounded-full"
        style={{
          width: 500, height: 500,
          left: spX, top: spY,
          x: '-50%', y: '-50%',
          background: 'radial-gradient(circle, rgba(100,150,230,0.10) 0%, rgba(50,100,200,0.05) 40%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />

      {/* ── CONTEÚDO ── */}
      <motion.div
        className="relative z-10 w-full max-w-[1100px] px-5 sm:px-8"
        style={reduce ? undefined : { y: contentY, opacity: contentOpacity }}
      >
        <motion.div
          variants={cascade}
          initial={reduce ? false : 'hidden'}
          animate={ready || reduce ? 'show' : 'hidden'}
        >
          {/* Eyebrow */}
          <motion.div className="hero-eyebrow" variants={rise}>
            <i /><span>ELIXIR</span><i />
          </motion.div>

          {/* Título — Space Grotesk */}
          <h1 className="hero-title">
            <motion.span className="hero-t1" variants={rise}>Comunidade</motion.span>
            <br />
            <motion.span className="hero-t2-wrap" variants={rise}>
              {/* brilho neon borrado atrás do texto (pulsa) */}
              <span className="hero-t2-glow" aria-hidden="true">On-Chain</span>
              <span className="hero-t2">On-Chain</span>
            </motion.span>
          </h1>

          {/* Subtexto */}
          <motion.p className="hero-sub" variants={rise}>
            <span className="l1">Contexto real. Trocas que valem.</span><br />
            <span className="l2">Para quem opera com cabeça.</span>
          </motion.p>

          {/* CTAs */}
          <motion.div className="flex items-center justify-center gap-4 flex-wrap" variants={rise}>
            {/* Primário — gradiente azul com halo pulsando */}
            <a href={DISCORD_INVITE} target="_blank" rel="noopener noreferrer" className="hero-cta">
              <span className="shine" aria-hidden="true" />
              <DiscordIcon size={20} />
              <span className="sep" aria-hidden="true" />
              <span>Entrar na Comunidade</span>
            </a>

            {/* Secundário — vidro escuro, seta azul */}
            <a href="#contrast" className="hero-cta2">
              Ver como funciona
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M8 3v10M3 8l5 5 5-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Indicador de rolagem: fio com uma luz descendo (some ao começar a rolar) */}
      <motion.div className="hero-scroll" aria-hidden="true" style={{ opacity: cueOpacity }}>
        <i />
      </motion.div>

    </section>
  )
}
