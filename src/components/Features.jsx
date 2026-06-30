import AnimateIn from './AnimateIn'

const glass = {
  background: 'linear-gradient(145deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.02) 100%)',
  backdropFilter: 'blur(16px)',
  border: '1px solid rgba(255,255,255,0.08)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.25)',
  transition: 'transform 0.35s cubic-bezier(0.22,1,0.36,1), border-color 0.35s ease, box-shadow 0.35s ease',
}

const glassBlue = {
  background: 'linear-gradient(150deg, rgba(58,123,213,0.10) 0%, rgba(20,50,110,0.08) 100%)',
  backdropFilter: 'blur(16px)',
  border: '1px solid rgba(58,123,213,0.22)',
  boxShadow: 'inset 0 1px 0 rgba(122,167,255,0.10), 0 8px 40px rgba(58,123,213,0.15)',
  transition: 'transform 0.35s cubic-bezier(0.22,1,0.36,1), border-color 0.35s ease, box-shadow 0.35s ease',
}

const hoverIn = (e, blue) => {
  e.currentTarget.style.transform = 'translateY(-4px)'
  e.currentTarget.style.borderColor = blue ? 'rgba(122,167,255,0.40)' : 'rgba(255,255,255,0.16)'
  e.currentTarget.style.boxShadow = blue
    ? 'inset 0 1px 0 rgba(122,167,255,0.14), 0 16px 56px rgba(58,123,213,0.25)'
    : 'inset 0 1px 0 rgba(255,255,255,0.08), 0 16px 48px rgba(0,0,0,0.35)'
}
const hoverOut = (e, blue) => {
  e.currentTarget.style.transform = 'translateY(0)'
  e.currentTarget.style.borderColor = blue ? 'rgba(58,123,213,0.22)' : 'rgba(255,255,255,0.08)'
  e.currentTarget.style.boxShadow = blue
    ? 'inset 0 1px 0 rgba(122,167,255,0.10), 0 8px 40px rgba(58,123,213,0.15)'
    : 'inset 0 1px 0 rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.25)'
}

const CallIcon = () => (
  <svg viewBox="0 0 40 40" fill="none" className="w-10 h-10 text-e-bright">
    <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.3"/>
    <circle cx="20" cy="20" r="8" fill="currentColor" opacity="0.15"/>
    <circle cx="20" cy="20" r="4" fill="currentColor"/>
    <circle cx="20" cy="20" r="1.5" fill="white"/>
  </svg>
)

const NarrativaIcon = () => (
  <svg viewBox="0 0 40 40" fill="none" className="w-10 h-10 text-e-bright">
    <rect x="6" y="8" width="28" height="24" rx="5" stroke="currentColor" strokeWidth="1.5" opacity="0.3"/>
    <path d="M12 16h16M12 21h11M12 26h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

const NetworkIcon = () => (
  <svg viewBox="0 0 40 40" fill="none" className="w-10 h-10 text-e-bright">
    <circle cx="12" cy="18" r="5" stroke="currentColor" strokeWidth="1.5"/>
    <circle cx="28" cy="18" r="5" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M4 33c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M22 33c0-4.4 3.6-8 8-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
  </svg>
)


export default function Features() {
  return (
    <section className="max-w-[1100px] mx-auto px-6 md:px-16 mb-44">

      <AnimateIn>
        <div className="text-center mb-16">
          <span className="text-[11px] font-bold tracking-[3px] uppercase block mb-5" style={{ color: 'rgba(122,167,255,0.6)' }}>
            O que você encontra
          </span>
          <h2 className="text-[clamp(36px,4.5vw,56px)] font-bold tracking-tight leading-[1.08] mb-4" style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif", color: '#EEF2FF' }}>
            Elixir é a comunidade<br />
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(100deg, #d0e4ff 0%, #7AA7FF 45%, #4d8de8 100%)' }}>
              que faltava
            </span>
          </h2>
          <p className="text-[16px] text-e-text/70 max-w-md mx-auto leading-relaxed">
            Acesso direto a quem opera. Calls, contexto e leitura de mercado sem rodeio.
          </p>
        </div>
      </AnimateIn>

      {/* BENTO GRID */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 auto-rows-auto">

        {/* CARD GRANDE — Calls ao vivo */}
        <AnimateIn delay={0.05} className="md:col-span-7">
          <div className="rounded-2xl p-8 h-full min-h-[320px] flex flex-col justify-between" style={glassBlue}
            onMouseEnter={e => hoverIn(e, true)} onMouseLeave={e => hoverOut(e, true)}>
            <div>
              <CallIcon />
              <h3 className="text-xl font-bold mt-5 mb-2 text-e-hi">Calls ao vivo</h3>
              <p className="text-[14px] text-e-text/70 leading-relaxed max-w-xs">
                Com leitura no momento certo. Entrada, saída e contexto sem atraso.
              </p>
            </div>
          </div>
        </AnimateIn>

        {/* Coluna direita — 2 cards menores */}
        <div className="md:col-span-5 flex flex-col gap-4">

          {/* CARD — Narrativas */}
          <AnimateIn delay={0.15}>
            <div className="rounded-2xl p-8 flex-1" style={glass}
              onMouseEnter={e => hoverIn(e, false)} onMouseLeave={e => hoverOut(e, false)}>
              <NarrativaIcon />
              <h3 className="text-lg font-bold mt-5 mb-2 text-e-hi">Narrativas filtradas</h3>
              <p className="text-[13px] text-e-text/70 leading-relaxed">
                Oportunidades curadas antes de chegarem no feed. Menos ruído, mais sinal.
              </p>
            </div>
          </AnimateIn>

          {/* CARD — Networking */}
          <AnimateIn delay={0.25}>
            <div className="rounded-2xl p-8 flex-1" style={glass}
              onMouseEnter={e => hoverIn(e, false)} onMouseLeave={e => hoverOut(e, false)}>
              <NetworkIcon />
              <h3 className="text-lg font-bold mt-5 mb-2 text-e-hi">Networking real</h3>
              <p className="text-[13px] text-e-text/70 leading-relaxed">
                Troca com quem tá no jogo de verdade. Comunidade ativa, não grupo fantasma.
              </p>
            </div>
          </AnimateIn>
        </div>

      </div>
    </section>
  )
}
