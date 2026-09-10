import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { DiscordIcon } from './icons'

const ease = [0.22, 1, 0.36, 1]
const DISCORD_INVITE = 'https://discord.gg/elixiralpha'

export default function Hero() {
  // ── MOUSE TRACKING ──────────────────────────────
  const mx = useMotionValue(0.5)
  const my = useMotionValue(0.5)

  const sp1 = { stiffness: 40, damping: 22, mass: 1.2 }
  const sp2 = { stiffness: 28, damping: 18, mass: 1.4 }
  const sp3 = { stiffness: 20, damping: 16, mass: 1.6 }
  const spS = { stiffness: 90, damping: 28 }

  const b1x = useSpring(useTransform(mx, [0,1], [-80, 80]),  sp1)
  const b1y = useSpring(useTransform(my, [0,1], [-55, 55]),  sp1)
  const b2x = useSpring(useTransform(mx, [0,1], [60, -60]),  sp2)
  const b2y = useSpring(useTransform(my, [0,1], [45, -45]),  sp2)
  const b3x = useSpring(useTransform(mx, [0,1], [-45, 45]),  sp3)
  const b3y = useSpring(useTransform(my, [0,1], [-35, 35]),  sp3)
  const spX = useSpring(useTransform(mx, [0,1], ['5%', '85%']),  spS)
  const spY = useSpring(useTransform(my, [0,1], ['5%', '85%']),  spS)

  const handleMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    mx.set((e.clientX - r.left) / r.width)
    my.set((e.clientY - r.top)  / r.height)
  }

  const handleLeave = () => { mx.set(0.5); my.set(0.5) }

  return (
    <section
      className="relative min-h-screen flex items-center justify-center text-center overflow-hidden cursor-default"
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
    >
      {/* ── BASE GRADIENT — azul profundo, quase preto ── */}
      <div className="absolute inset-0" style={{
        background: `
          radial-gradient(ellipse 120% 80% at 38% 50%, rgba(14,46,82,0.30) 0%, transparent 58%),
          radial-gradient(ellipse 65%  55% at 76% 20%, rgba(8,28,54,0.25)  0%, transparent 52%),
          linear-gradient(160deg, #020617 0%, #040e22 30%, #071828 55%, #040e22 78%, #020617 100%)
        `,
      }}/>

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

      {/* ── BLOB 1 ── */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 700, height: 700,
          top: '18%', left: '12%',
          x: b1x, y: b1y,
          background: 'radial-gradient(circle, rgba(42,100,190,0.22) 0%, transparent 68%)',
          filter: 'blur(60px)',
        }}
      />

      {/* ── BLOB 2 ── */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 650, height: 650,
          top: '8%', right: '4%',
          x: b2x, y: b2y,
          background: 'radial-gradient(circle, rgba(70,120,210,0.16) 0%, transparent 68%)',
          filter: 'blur(65px)',
        }}
      />

      {/* ── BLOB 3 ── */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 620, height: 620,
          bottom: '4%', left: '4%',
          x: b3x, y: b3y,
          background: 'radial-gradient(circle, rgba(30,80,165,0.18) 0%, transparent 68%)',
          filter: 'blur(55px)',
        }}
      />

      {/* ── VINHETA ── */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at 50% 50%, transparent 35%, rgba(2,6,23,0.70) 100%)',
      }}/>

      {/* ── CONTEÚDO ── */}
      <div className="relative z-10 max-w-3xl px-8">

        {/* Eyebrow */}
        <motion.div
          className="flex items-center justify-center gap-3 mb-8"
          initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }}
          transition={{ duration:0.6, ease }}
        >
          <span className="h-px w-8" style={{ background: 'rgba(122,167,255,0.3)' }} />
          <span
            className="text-[10px] font-semibold tracking-[4px] uppercase"
            style={{ color: 'rgba(160,190,230,0.55)', fontFamily: "'Inter', sans-serif", letterSpacing: '0.3em' }}
          >
            ELIXIR
          </span>
          <span className="h-px w-8" style={{ background: 'rgba(122,167,255,0.3)' }} />
        </motion.div>

        {/* Título — Space Grotesk */}
        <motion.h1
          className="leading-[0.93] mb-8"
          style={{
            fontFamily: "'Space Grotesk', 'Inter', sans-serif",
            fontWeight: 700,
            fontSize: 'clamp(56px, 8vw, 96px)',
            letterSpacing: '-0.035em',
            color: '#EEF2FF',
          }}
          initial={{ opacity:0, y:26 }} animate={{ opacity:1, y:0 }}
          transition={{ duration:0.75, delay:0.1, ease }}
        >
          Comunidade<br />
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: 'linear-gradient(100deg, #d0e4ff 0%, #7AA7FF 45%, #4d8de8 100%)' }}
          >
            On-Chain
          </span>
        </motion.h1>

        {/* Subtexto */}
        <motion.p
          className="text-[17px] leading-[1.8] mb-12 max-w-md mx-auto"
          style={{
            color: 'rgba(190,210,235,0.52)',
            fontFamily: "'Inter', sans-serif",
            fontWeight: 400,
          }}
          initial={{ opacity:0, y:18 }} animate={{ opacity:1, y:0 }}
          transition={{ duration:0.65, delay:0.22, ease }}
        >
          Contexto real. Trocas que valem.<br />
          Para quem opera com cabeça.
        </motion.p>

        {/* CTAs */}
        <motion.div
          className="flex items-center justify-center gap-4 flex-wrap"
          initial={{ opacity:0, y:18 }} animate={{ opacity:1, y:0 }}
          transition={{ duration:0.65, delay:0.34, ease }}
        >
          {/* Primário — pill + gradient azul */}
          <a href={DISCORD_INVITE} target="_blank" rel="noopener noreferrer"
            className="relative inline-flex items-center gap-2.5 px-10 py-[14px] rounded-full text-[14px] font-semibold text-white overflow-hidden transition-all duration-300 hover:-translate-y-0.5"
            style={{
              fontFamily: "'Inter', sans-serif",
              background: 'linear-gradient(135deg, #2a5fc7 0%, #3d7ae8 50%, #5a98f0 100%)',
              boxShadow: '0 0 0 1px rgba(100,160,255,0.2), 0 6px 32px rgba(30,80,200,0.40)',
            }}
          >
            <span className="absolute inset-0 pointer-events-none animate-shimmer" style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)',
              width: '40%',
            }}/>
            <DiscordIcon className="relative" />
            <span className="relative">Entrar na Comunidade</span>
          </a>

          {/* Secundário — outline discreto */}
          <a href="#contrast"
            className="inline-flex items-center gap-2 px-8 py-[14px] rounded-full text-[13px] font-medium transition-all duration-300 group"
            style={{
              fontFamily: "'Inter', sans-serif",
              color: 'rgba(190,210,235,0.50)',
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.02)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = 'rgba(220,235,255,0.85)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.16)'
              e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = 'rgba(190,210,235,0.50)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
              e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
            }}
          >
            Ver como funciona
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" className="transition-transform group-hover:translate-y-0.5">
              <path d="M8 3v10M3 8l5 5 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>
        </motion.div>
      </div>

      {/* Fade para a próxima seção */}
      <div className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none" style={{
        background: 'linear-gradient(to top, #020617 0%, transparent 100%)',
      }}/>
    </section>
  )
}
