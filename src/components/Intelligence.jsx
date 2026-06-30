const items = [
  'Alpha Intelligence','Uma Comunidade','24/7',
  'Fluxo Alpha','Live','Calls em tempo real',
  'Ativa','Quem entra, opera','Contexto real','Sem ruído',
]

export default function Intelligence() {
  const doubled = [...items, ...items]
  return (
    <div className="overflow-hidden py-5 mb-44" style={{
      borderTop: '1px solid rgba(255,255,255,0.07)',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
      background: 'rgba(255,255,255,0.02)',
      maskImage: 'linear-gradient(90deg, transparent 0%, black 12%, black 88%, transparent 100%)',
      WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, black 12%, black 88%, transparent 100%)',
    }}>
      <div className="flex items-center gap-0 animate-ticker w-max whitespace-nowrap">
        {doubled.map((item, i) => (
          <span key={i} className="inline-flex items-center gap-4 px-1 text-[13px]">
            {i % items.length === 0
              ? <strong className="text-e-bright font-bold tracking-wide">{item}</strong>
              : <span className="text-e-lo font-medium">{item}</span>
            }
            <span className="text-e-lo/30 text-base">·</span>
          </span>
        ))}
      </div>
    </div>
  )
}
