import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useTransform } from 'framer-motion'
import { releaseIntroGate } from '../introGate'
import Logo3D from './Logo3D'

const HOLD_MS = 2000
// Tempo com o logo já visível antes do anel começar a encher.
const MIN_SHOW_MS = 350
// Teto de segurança: mesmo que o 3D não fique pronto (rede ruim, GPU lenta), a intro anda.
const MAX_WAIT_MS = 2600
const LOGO_SIZE = 280
const RING_R  = 168
const BOX     = 400
const CENTER  = BOX / 2
const CIRC    = 2 * Math.PI * RING_R

export default function Intro({ onDone, onStart }) {
  const [phase, setPhase] = useState('idle')
  const phaseRef = useRef('idle')

  const progressMV = useMotionValue(0)
  const ringOffset = useTransform(progressMV, p => CIRC * (1 - p))

  // Compartilhado com Logo3D via ref (sem re-render)
  const mousePos   = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 })

  const holdRafRef   = useRef(null)
  const holdStartRef = useRef(null)
  const startTimerRef = useRef(null)
  const deadlineRef   = useRef(null)
  const mountedAtRef  = useRef(performance.now())
  const startedRef    = useRef(false)

  const setPhaseSync = (p) => { phaseRef.current = p; setPhase(p) }

  // ── Mouse global ────────────────────────────────────────────
  useEffect(() => {
    const onMove = (e) => { mousePos.current = { x: e.clientX, y: e.clientY } }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  // ── Trava o scroll enquanto a intro cobre a tela ─────────────
  // (também evita a barra de rolagem aparecer no meio da animação quando o site monta)
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // ── Hold: iniciar ────────────────────────────────────────────
  const startHold = () => {
    if (startedRef.current || phaseRef.current !== 'idle') return
    startedRef.current = true
    holdStartRef.current = performance.now()
    setPhaseSync('holding')

    // A partir daqui o 3D já está desenhado: é a janela certa pra montar o site e
    // soltar o restore de sessão, longe do primeiro frame e longe do reveal.
    onStart?.()
    releaseIntroGate()

    const tick = () => {
      const p = Math.min((performance.now() - holdStartRef.current) / HOLD_MS, 1)
      progressMV.set(p)
      if (p < 1) {
        holdRafRef.current = requestAnimationFrame(tick)
      } else {
        setPhaseSync('revealing')
        document.body.style.overflow = ''
        onDone()
        setTimeout(() => setPhaseSync('done'), 1100)
      }
    }
    holdRafRef.current = requestAnimationFrame(tick)
  }

  // Agenda o início respeitando o teto — nunca começa depois de MAX_WAIT_MS do mount.
  // O alvo só ANTECIPA, nunca atrasa: efeitos de filho rodam antes dos do pai, então o
  // "pronto" do Logo3D pode chegar antes deste componente agendar o teto.
  const armStart = (delay) => {
    if (startedRef.current) return
    const now = performance.now()
    const at = Math.min(now + delay, mountedAtRef.current + MAX_WAIT_MS)
    if (deadlineRef.current === null || at < deadlineRef.current) deadlineRef.current = at
    clearTimeout(startTimerRef.current)
    startTimerRef.current = setTimeout(startHold, Math.max(0, deadlineRef.current - now))
  }

  // ── Auto-play: o anel enche sozinho — mas só DEPOIS que o logo aparece na tela ──
  useEffect(() => {
    armStart(MAX_WAIT_MS)
    return () => {
      clearTimeout(startTimerRef.current)
      cancelAnimationFrame(holdRafRef.current)
    }
  }, [])

  if (phase === 'done') return null

  const revealing = phase === 'revealing'

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
      style={{ background: '#020617' }}
      animate={revealing ? { opacity: 0 } : { opacity: 1 }}
      transition={{ duration: 0.9, ease: 'easeInOut', delay: revealing ? 0.12 : 0 }}
    >

      {/* ── Glow de fundo pulsante ── */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 55% 55% at 50% 50%, rgba(22,74,115,0.32) 0%, rgba(6,26,43,0.5) 45%, transparent 75%)',
          willChange: 'transform, opacity',
        }}
        animate={{
          opacity: phase === 'holding' ? [1, 1.7, 1] : [0.6, 1.1, 0.6],
          scale:   phase === 'holding' ? [1, 1.06, 1] : [1, 1.02, 1],
        }}
        transition={{ duration: phase === 'holding' ? 0.65 : 4, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* ── Zona da logo (não-interativa — a animação roda sozinha) ── */}
      <div
        className="relative flex items-center justify-center select-none pointer-events-none"
        style={{ width: BOX, height: BOX }}
      >

        {/* ── SVG Ring ── */}
        <svg
          className="absolute inset-0 pointer-events-none"
          width={BOX} height={BOX}
          viewBox={`0 0 ${BOX} ${BOX}`}
        >
          <defs>
            <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor="#3A7BD5" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#7AA7FF" stopOpacity="1"   />
            </linearGradient>
          </defs>

          {/* Track */}
          <circle cx={CENTER} cy={CENTER} r={RING_R}
            fill="none" stroke="rgba(58,123,213,0.12)" strokeWidth="1" />

          {/* 4 marcadores cardinais */}
          {[0, 90, 180, 270].map((deg) => {
            const rad = (deg - 90) * Math.PI / 180
            return (
              <line key={deg}
                x1={CENTER + (RING_R - 6) * Math.cos(rad)}
                y1={CENTER + (RING_R - 6) * Math.sin(rad)}
                x2={CENTER + (RING_R + 6) * Math.cos(rad)}
                y2={CENTER + (RING_R + 6) * Math.sin(rad)}
                stroke="rgba(122,167,255,0.28)" strokeWidth="1.2" strokeLinecap="round"
              />
            )
          })}

          {/* Halo do arco — traço largo e translúcido no lugar do feGaussianBlur.
              Filtro SVG num elemento que muda TODO frame re-rasteriza a região inteira
              a 60fps (causa clássica de stutter, ainda mais em mobile). */}
          <motion.circle
            cx={CENTER} cy={CENTER} r={RING_R}
            fill="none"
            stroke="rgba(122,167,255,0.22)"
            strokeWidth="7"
            strokeLinecap="round"
            transform={`rotate(-90 ${CENTER} ${CENTER})`}
            strokeDasharray={CIRC}
            style={{ strokeDashoffset: ringOffset }}
          />

          {/* Progress arc */}
          <motion.circle
            cx={CENTER} cy={CENTER} r={RING_R}
            fill="none"
            stroke="url(#ringGrad)"
            strokeWidth="2"
            strokeLinecap="round"
            transform={`rotate(-90 ${CENTER} ${CENTER})`}
            strokeDasharray={CIRC}
            style={{ strokeDashoffset: ringOffset }}
          />
        </svg>

        {/* ── Logo 3D — outer motion.div para animação de reveal ──
            "Warp": a logo dá um leve recuo e então avança em direção ao espectador (scale↑)
            enquanto desaparece — sincronizado com o burst + flash + giro acelerado (Logo3D),
            dando a sensação de entrar pela logo no site (que faz fade-in atrás). */}
        <motion.div
          animate={revealing
            ? { scale: [1, 0.92, 5.2], opacity: [1, 1, 0] }
            : { scale: 1, opacity: 1 }
          }
          transition={{ duration: 0.8, ease: [0.5, 0, 0.75, 1], times: [0, 0.22, 1] }}
          style={{ pointerEvents: 'none', willChange: 'transform, opacity' }}
        >
          <Logo3D mousePos={mousePos} phaseRef={phaseRef} size={LOGO_SIZE} onReady={() => armStart(MIN_SHOW_MS)} />
        </motion.div>

        {/* ── Burst de luz no reveal ──
            Montado desde o início (opacity 0) pra a camada já existir: criar layer +
            pintar um gradiente grande no exato frame do reveal custa um engasgo. */}
        <motion.div
          className="absolute pointer-events-none rounded-full"
          initial={{ scale: 0.3, opacity: 0 }}
          animate={revealing ? { scale: 8, opacity: [1, 0] } : { scale: 0.3, opacity: 0 }}
          transition={{ duration: 1.0, ease: 'easeOut' }}
          style={{
            width: LOGO_SIZE, height: LOGO_SIZE,
            willChange: 'transform, opacity',
            background:
              'radial-gradient(circle, rgba(122,167,255,0.9) 0%, rgba(58,123,213,0.5) 35%, rgba(22,74,115,0.1) 65%, transparent 80%)',
          }}
        />

        {/* ── Flash de tela ── */}
        <motion.div
          className="fixed inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={revealing ? { opacity: [0, 0.38, 0] } : { opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{
            willChange: 'opacity',
            background:
              'radial-gradient(ellipse at 50% 50%, rgba(58,123,213,0.55), transparent 65%)',
          }}
        />
      </div>

      {/* ── Wordmark ELIXIR ── */}
      <motion.p
        className="absolute font-black tracking-[6px] uppercase pointer-events-none"
        style={{
          top: `calc(50% + ${BOX / 2 + 20}px)`,
          fontSize: '11px',
          background: 'linear-gradient(90deg, #7AA7FF, #3A7BD5)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
        animate={{ opacity: phase === 'idle' ? 0.7 : 0 }}
        transition={{ duration: 0.3 }}
      >
        ELIXIR
      </motion.p>

      {/* ── Feedback "entrando..." ── */}
      <motion.p
        className="absolute bottom-14 text-[10px] font-semibold tracking-[4px] uppercase pointer-events-none"
        style={{ color: 'rgba(122,167,255,0.8)' }}
        animate={{ opacity: phase === 'holding' ? 1 : 0 }}
        transition={{ duration: 0.2 }}
      >
        entrando...
      </motion.p>
    </motion.div>
  )
}
