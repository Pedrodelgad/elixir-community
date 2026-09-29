// Brilho azul que "respira" atrás de um bloco — as luzes pulsando pelo site.
// Radial-gradient (já é suave, sem filter blur) animado só em opacity/transform = leve.
// Fica atrás do conteúdo: a seção precisa ser `relative isolate` (z-index -1 dentro dela).
// Quem pede menos animação no sistema vê o brilho parado (.e-breathe no index.css).
export default function GlowOrb({
  top = '50%', left = '50%', size = 640,
  color = '58,123,213', strength = 0.2,
  duration = 7, delay = 0,
}) {
  return (
    <div
      aria-hidden="true"
      className="e-breathe pointer-events-none absolute rounded-full"
      style={{
        top, left, width: size, height: size, zIndex: -1,
        transform: 'translate(-50%, -50%)',
        background: `radial-gradient(circle, rgba(${color},${strength}) 0%, rgba(${color},${(strength * 0.35).toFixed(3)}) 40%, transparent 70%)`,
        animation: `glow-breathe ${duration}s ease-in-out ${delay}s infinite`,
        willChange: 'opacity, transform',
      }}
    />
  )
}
