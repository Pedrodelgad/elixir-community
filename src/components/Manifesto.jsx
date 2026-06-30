import AnimateIn from './AnimateIn'
import { DiscordIcon } from './icons'

const DISCORD_INVITE = 'https://discord.gg/elixiralpha'

export default function Manifesto() {
  return (
    <section className="px-6 md:px-16 mb-0">
      <AnimateIn>
        <div className="max-w-[1100px] mx-auto text-center px-8 md:px-20 py-28 rounded-2xl relative overflow-hidden" style={{
          background: 'linear-gradient(160deg, rgba(11,46,74,0.8) 0%, rgba(6,26,43,0.9) 60%, rgba(2,6,23,0.95) 100%)',
          border: '1px solid rgba(58,123,213,0.2)',
          boxShadow: '0 0 80px rgba(58,123,213,0.08)',
          backdropFilter: 'blur(20px)',
        }}>

          {/* Glow */}
          <div className="absolute -top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] pointer-events-none" style={{
            background: 'radial-gradient(ellipse, rgba(58,123,213,0.2) 0%, transparent 65%)',
          }} />

          <span className="relative text-[11px] font-bold tracking-[3px] uppercase block mb-6" style={{ color: 'rgba(122,167,255,0.6)' }}>
            Para quem opera de verdade
          </span>
          <h2 className="relative text-[clamp(36px,5vw,62px)] font-bold tracking-tight leading-[1.06] mb-5" style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif", color: '#EEF2FF' }}>
            O mercado<br />
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(100deg, #d0e4ff 0%, #7AA7FF 45%, #4d8de8 100%)' }}>
              recompensa contexto.
            </span>
          </h2>
          <p className="relative text-[17px] text-e-text/60 mb-12 font-light">
            Menos superficialidade. Mais leitura que vale.
          </p>

          <a href={DISCORD_INVITE} target="_blank" rel="noopener noreferrer" className="relative inline-flex items-center gap-2.5 px-10 py-4 rounded-full text-[15px] font-bold text-white overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_40px_rgba(58,123,213,0.5)]" style={{
            background: 'linear-gradient(90deg, #3A7BD5, #7AA7FF)',
            boxShadow: '0 4px 28px rgba(58,123,213,0.35)',
          }}>
            <span className="absolute inset-0 pointer-events-none animate-shimmer" style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
              width: '40%',
            }} />
            <DiscordIcon />
            <span className="relative">Entrar na Comunidade</span>
          </a>

        </div>
      </AnimateIn>
    </section>
  )
}
