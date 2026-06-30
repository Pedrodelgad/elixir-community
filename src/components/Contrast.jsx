import AnimateIn from './AnimateIn'

const bad  = ['FOMO sem contexto', 'FUD absurdo todo ciclo', 'Ruído de feed infinito', 'Superficialidade empacotada', 'Calls sem leitura de mercado']
const good = ['Contexto real antes do feed', 'Menos superficialidade. Mais leitura que vale.', 'Calls ao vivo com leitura no momento certo', 'Quem entra, opera']

const glassCard = {
  background: 'linear-gradient(145deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.02) 100%)',
  backdropFilter: 'blur(16px)',
  border: '1px solid rgba(255,255,255,0.08)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.3)',
}

export default function Contrast() {
  return (
    <section id="contrast" className="max-w-4xl mx-auto px-6 md:px-16 mb-44">
      <AnimateIn>
        <p className="text-center text-[11px] font-bold tracking-[2px] text-e-muted uppercase mb-14">
          O mercado recompensa contexto. Não barulho.
        </p>
      </AnimateIn>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_48px_1fr] items-start gap-4 md:gap-0">

        {/* BAD */}
        <AnimateIn delay={0.1}>
          <div className="rounded-2xl p-10" style={glassCard}>
            <p className="text-[11px] font-bold tracking-[2px] uppercase text-e-muted mb-7">O mercado entrega</p>
            <ul className="flex flex-col gap-5">
              {bad.map(t => (
                <li key={t} className="flex items-start gap-3.5 text-[15px] text-e-muted/70">
                  <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-e-lo" style={{ border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.03)' }}>✕</span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </AnimateIn>

        {/* DIVIDER */}
        <div className="hidden md:flex flex-col items-center pt-20 gap-2.5">
          <div className="w-px flex-1 min-h-[60px]" style={{ background:'rgba(255,255,255,0.08)' }} />
          <span className="text-[10px] font-bold text-e-lo border rounded-full px-2.5 py-1.5 bg-e-deep uppercase tracking-widest" style={{ borderColor:'rgba(255,255,255,0.08)' }}>vs</span>
          <div className="w-px flex-1 min-h-[60px]" style={{ background:'rgba(255,255,255,0.08)' }} />
        </div>

        {/* GOOD */}
        <AnimateIn delay={0.2}>
          <div className="rounded-2xl p-10 relative overflow-hidden" style={{ ...glassCard, background: 'linear-gradient(150deg, rgba(58,123,213,0.09) 0%, rgba(20,50,110,0.06) 100%)', border:'1px solid rgba(58,123,213,0.25)', boxShadow:'inset 0 1px 0 rgba(122,167,255,0.10), 0 8px 32px rgba(58,123,213,0.12)' }}>
            {/* fio de luz no topo */}
            <div style={{ position:'absolute', top:0, left:'50%', transform:'translateX(-50%)', height:'1px', width:'60%', background:'linear-gradient(90deg, transparent, rgba(122,167,255,0.45), rgba(200,220,255,0.6), rgba(122,167,255,0.45), transparent)' }}/>
            <p className="text-[11px] font-bold tracking-[2px] uppercase text-e-blue mb-7">A Elixir entrega</p>
            <ul className="flex flex-col gap-5">
              {good.map(t => (
                <li key={t} className="flex items-start gap-3.5 text-[15px] text-e-text">
                  <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-e-bright" style={{ border:'1px solid rgba(122,167,255,0.3)', background:'rgba(58,123,213,0.12)' }}>✓</span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </AnimateIn>
      </div>
    </section>
  )
}
