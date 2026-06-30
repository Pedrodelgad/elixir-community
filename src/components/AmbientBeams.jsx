export default function AmbientBeams() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 0,
        pointerEvents: 'none', overflow: 'hidden',
      }}
    >
      {/* ── SVG grain texture ── */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.028 }}>
        <filter id="bg-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.68" numOctaves="3" stitchTiles="stitch"/>
          <feColorMatrix type="saturate" values="0"/>
        </filter>
        <rect width="100%" height="100%" filter="url(#bg-grain)"/>
      </svg>

      {/* ══ FEIXE A — diagonal esquerda-direita, azul-gelo ══ */}
      {/* halo externo */}
      <div style={{
        position: 'absolute', top: '-30%', left: '-5%',
        width: '260px', height: '200%',
        background: 'linear-gradient(180deg, rgba(90,140,240,0.00) 0%, rgba(90,140,240,0.10) 20%, rgba(122,167,255,0.12) 50%, rgba(90,140,240,0.06) 80%, transparent 100%)',
        transform: 'rotate(28deg)', transformOrigin: 'top left',
        filter: 'blur(40px)',
      }}/>
      {/* corpo médio */}
      <div style={{
        position: 'absolute', top: '-30%', left: '3%',
        width: '60px', height: '200%',
        background: 'linear-gradient(180deg, transparent 0%, rgba(122,167,255,0.18) 18%, rgba(140,185,255,0.22) 50%, rgba(122,167,255,0.12) 82%, transparent 100%)',
        transform: 'rotate(28deg)', transformOrigin: 'top left',
        filter: 'blur(10px)',
      }}/>
      {/* fio central nítido */}
      <div style={{
        position: 'absolute', top: '-30%', left: '5.5%',
        width: '2px', height: '200%',
        background: 'linear-gradient(180deg, transparent 0%, rgba(200,225,255,0.55) 20%, rgba(220,235,255,0.70) 50%, rgba(180,210,255,0.40) 80%, transparent 100%)',
        transform: 'rotate(28deg)', transformOrigin: 'top left',
        filter: 'blur(0.8px)',
      }}/>

      {/* ══ FEIXE B — diagonal direita-esquerda, índigo/azul ══ */}
      {/* halo externo */}
      <div style={{
        position: 'absolute', top: '-25%', right: '-8%',
        width: '240px', height: '200%',
        background: 'linear-gradient(180deg, rgba(70,100,220,0.00) 0%, rgba(70,100,220,0.09) 15%, rgba(80,120,230,0.12) 50%, rgba(60,90,200,0.06) 80%, transparent 100%)',
        transform: 'rotate(-32deg)', transformOrigin: 'top right',
        filter: 'blur(45px)',
      }}/>
      {/* corpo médio */}
      <div style={{
        position: 'absolute', top: '-25%', right: '1%',
        width: '55px', height: '200%',
        background: 'linear-gradient(180deg, transparent 0%, rgba(100,145,255,0.16) 15%, rgba(122,167,255,0.20) 50%, rgba(90,130,240,0.10) 82%, transparent 100%)',
        transform: 'rotate(-32deg)', transformOrigin: 'top right',
        filter: 'blur(10px)',
      }}/>
      {/* fio central nítido */}
      <div style={{
        position: 'absolute', top: '-25%', right: '3.2%',
        width: '2px', height: '200%',
        background: 'linear-gradient(180deg, transparent 0%, rgba(190,215,255,0.50) 18%, rgba(210,230,255,0.65) 50%, rgba(170,200,255,0.35) 80%, transparent 100%)',
        transform: 'rotate(-32deg)', transformOrigin: 'top right',
        filter: 'blur(0.8px)',
      }}/>

      {/* ══ FEIXE C — quase vertical, mais estreito, ciano-suave ══ */}
      {/* halo */}
      <div style={{
        position: 'absolute', top: '-10%', left: '44%',
        width: '180px', height: '200%',
        background: 'linear-gradient(180deg, rgba(50,130,180,0.00) 0%, rgba(50,130,180,0.08) 20%, rgba(60,150,200,0.10) 55%, rgba(40,110,160,0.05) 80%, transparent 100%)',
        transform: 'rotate(8deg)', transformOrigin: 'top center',
        filter: 'blur(50px)',
      }}/>
      {/* corpo */}
      <div style={{
        position: 'absolute', top: '-10%', left: '48%',
        width: '40px', height: '200%',
        background: 'linear-gradient(180deg, transparent 0%, rgba(80,160,220,0.12) 20%, rgba(100,175,230,0.16) 55%, rgba(70,140,200,0.08) 80%, transparent 100%)',
        transform: 'rotate(8deg)', transformOrigin: 'top center',
        filter: 'blur(10px)',
      }}/>
      {/* fio */}
      <div style={{
        position: 'absolute', top: '-10%', left: '49.2%',
        width: '1.5px', height: '200%',
        background: 'linear-gradient(180deg, transparent 0%, rgba(160,210,245,0.40) 22%, rgba(180,220,250,0.55) 55%, rgba(140,200,240,0.28) 80%, transparent 100%)',
        transform: 'rotate(8deg)', transformOrigin: 'top center',
        filter: 'blur(0.6px)',
      }}/>

      {/* ══ GLOW DE CRUZAMENTO — onde A e B se encontram ══ */}
      <div style={{
        position: 'absolute', top: '28%', left: '42%',
        width: '220px', height: '220px',
        background: 'radial-gradient(ellipse at center, rgba(122,167,255,0.10) 0%, rgba(90,130,230,0.06) 40%, transparent 70%)',
        transform: 'translate(-50%, -50%)',
        filter: 'blur(30px)',
      }}/>
      {/* ponto de brilho no cruzamento */}
      <div style={{
        position: 'absolute', top: '28%', left: '42%',
        width: '60px', height: '60px',
        background: 'radial-gradient(ellipse at center, rgba(200,220,255,0.18) 0%, rgba(160,195,255,0.08) 50%, transparent 100%)',
        transform: 'translate(-50%, -50%)',
        filter: 'blur(8px)',
      }}/>

      {/* ══ GLOW DE CRUZAMENTO — onde A e C se encontram ══ */}
      <div style={{
        position: 'absolute', top: '52%', left: '60%',
        width: '180px', height: '180px',
        background: 'radial-gradient(ellipse at center, rgba(100,160,230,0.09) 0%, rgba(80,130,200,0.05) 45%, transparent 70%)',
        transform: 'translate(-50%, -50%)',
        filter: 'blur(28px)',
      }}/>

      {/* ══ ORBS AMBIENTES — profundidade de cor no fundo ══ */}
      <div style={{
        position: 'absolute', top: '15%', left: '-15%',
        width: '50vw', height: '50vw',
        background: 'radial-gradient(ellipse at center, rgba(20,50,120,0.12) 0%, transparent 65%)',
        filter: 'blur(80px)',
      }}/>
      <div style={{
        position: 'absolute', top: '60%', right: '-15%',
        width: '45vw', height: '45vw',
        background: 'radial-gradient(ellipse at center, rgba(15,40,100,0.10) 0%, transparent 65%)',
        filter: 'blur(90px)',
      }}/>
      <div style={{
        position: 'absolute', top: '80%', left: '25%',
        width: '40vw', height: '35vw',
        background: 'radial-gradient(ellipse at center, rgba(30,20,70,0.09) 0%, transparent 65%)',
        filter: 'blur(100px)',
      }}/>
    </div>
  )
}
