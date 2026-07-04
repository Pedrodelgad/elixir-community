import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import Logo3D from './Logo3D'

const HOLD_MS = 3000
const LOGO_SIZE = 280
const RING_R  = 168
const BOX     = 400
const CENTER  = BOX / 2
const CIRC    = 2 * Math.PI * RING_R

export default function Intro({ onDone }) {
  const [phase, setPhase] = useState('idle')
  const phaseRef = useRef('idle')

  const progressMV = useMotionValue(0)
  const ringOffset = useTransform(progressMV, p => CIRC * (1 - p))

  // Compartilhado com Logo3D via ref (sem re-render)
  const mousePos   = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 })

  const holdRafRef   = useRef(null)
  const holdStartRef = useRef(null)

  const setPhaseSync = (p) => { phaseRef.current = p; setPhase(p) }

  // ── Mouse global ────────────────────────────────────────────
  useEffect(() => {
    const onMove = (e) => { mousePos.current = { x: e.clientX, y: e.clientY } }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  // ── Hold: iniciar ────────────────────────────────────────────
  const startHold = () => {
    if (phaseRef.current !== 'idle') return
    holdStartRef.current = performance.now()
    setPhaseSync('holding')

    const tick = () => {
      const p = Math.min((performance.now() - holdStartRef.current) / HOLD_MS, 1)
      progressMV.set(p)
      if (p < 1) {
        holdRafRef.current = requestAnimationFrame(tick)
      } else {
        setPhaseSync('revealing')
        onDone()
        setTimeout(() => setPhaseSync('done'), 1100)
      }
    }
    holdRafRef.current = requestAnimationFrame(tick)
  }

  // ── Hold: cancelar ───────────────────────────────────────────
  const cancelHold = () => {
    if (phaseRef.current !== 'holding') return
    cancelAnimationFrame(holdRafRef.current)
    setPhaseSync('idle')
    animate(progressMV, 0, { duration: 0.45, ease: 'easeOut' })
  }

  if (phase === 'done') return null

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
      style={{ background: '#020617' }}
      animate={phase === 'revealing' ? { opacity: 0 } : { opacity: 1 }}
      transition={{ duration: 0.9, ease: 'easeInOut', delay: phase === 'revealing' ? 0.12 : 0 }}
    >

      {/* ── Glow de fundo pulsante ── */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 55% 55% at 50% 50%, rgba(22,74,115,0.32) 0%, rgba(6,26,43,0.5) 45%, transparent 75%)',
        }}
        animate={{
          opacity: phase === 'holding' ? [1, 1.7, 1] : [0.6, 1.1, 0.6],
          scale:   phase === 'holding' ? [1, 1.06, 1] : [1, 1.02, 1],
        }}
        transition={{ duration: phase === 'holding' ? 0.65 : 4, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* ── Zona interativa ── */}
      <div
        className="relative flex items-center justify-center select-none"
        style={{ width: BOX, height: BOX, cursor: phase === 'holding' ? 'grabbing' : 'grab' }}
        onMouseDown={startHold}
        onMouseUp={cancelHold}
        onMouseLeave={cancelHold}
        onTouchStart={(e) => { e.preventDefault(); startHold() }}
        onTouchEnd={cancelHold}
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
            <filter id="ringGlow" x="-15%" y="-15%" width="130%" height="130%">
              <feGaussianBlur stdDeviation="3" result="b" />
              <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
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
            filter="url(#ringGlow)"
          />
        </svg>

        {/* ── Logo 3D — outer motion.div para animação de reveal ──
            "Warp": a logo dá um leve recuo e então avança em direção ao espectador (scale↑)
            enquanto desaparece — sincronizado com o burst + flash + giro acelerado (Logo3D),
            dando a sensação de entrar pela logo no site (que faz fade-in atrás). */}
        <motion.div
          animate={phase === 'revealing'
            ? { scale: [1, 0.92, 5.2], opacity: [1, 1, 0] }
            : { scale: 1, opacity: 1 }
          }
          transition={{ duration: 0.8, ease: [0.5, 0, 0.75, 1], times: [0, 0.22, 1] }}
          style={{ pointerEvents: 'none' }}
        >
          <Logo3D mousePos={mousePos} phaseRef={phaseRef} size={LOGO_SIZE} />
        </motion.div>

        {/* ── Burst de luz no reveal ── */}
        {phase === 'revealing' && (
          <motion.div
            className="absolute pointer-events-none rounded-full"
            initial={{ scale: 0.3, opacity: 1 }}
            animate={{ scale: 8, opacity: 0 }}
            transition={{ duration: 1.0, ease: 'easeOut' }}
            style={{
              width: LOGO_SIZE, height: LOGO_SIZE,
              background:
                'radial-gradient(circle, rgba(122,167,255,0.9) 0%, rgba(58,123,213,0.5) 35%, rgba(22,74,115,0.1) 65%, transparent 80%)',
            }}
          />
        )}

        {/* ── Flash de tela ── */}
        {phase === 'revealing' && (
          <motion.div
            className="fixed inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.38, 0] }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            style={{
              background:
                'radial-gradient(ellipse at 50% 50%, rgba(58,123,213,0.55), transparent 65%)',
            }}
          />
        )}
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

      {/* ── Hint "segure para entrar" ── */}
      <motion.div
        className="absolute bottom-14 flex flex-col items-center gap-3 pointer-events-none"
        animate={{ opacity: phase === 'idle' ? 1 : 0 }}
        transition={{ duration: 0.25 }}
      >
        <motion.p
          className="text-[11px] font-bold tracking-[4px] uppercase"
          style={{ color: 'rgba(176,202,242,0.95)', textShadow: '0 0 14px rgba(58,123,213,0.5)' }}
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          segure para entrar
        </motion.p>
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <motion.div key={i} className="rounded-full"
              style={{ width: 4, height: 4, background: 'rgba(150,185,255,0.8)' }}
              animate={{ opacity: [0.35, 1, 0.35] }}
              transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.2, ease: 'easeInOut' }}
            />
          ))}
        </div>
      </motion.div>

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
