import { Link } from 'react-router-dom'
import AnimateIn from './AnimateIn'
import { useAuth } from '../context/AuthContext'

// Mock — futuramente vem do backend + sincronização com a API do Discord,
// que valida se o plano Alpha do membro ainda está dentro do período pago.
const VIDEOS = [
  { id: 1, title: 'Leitura de mercado — semana 23',  duration: '18:42', date: '08 Jun 2026', grad: ['#16304f', '#2a5fc7'] },
  { id: 2, title: 'Carteiras que importam agora',     duration: '12:10', date: '02 Jun 2026', grad: ['#0d2240', '#3d7ae8'] },
  { id: 3, title: 'Narrativas para o próximo ciclo',  duration: '24:05', date: '28 Mai 2026', grad: ['#142a52', '#5a98f0'] },
  { id: 4, title: 'Setup de entrada: o que olhar',    duration: '09:31', date: '20 Mai 2026', grad: ['#0f1e3d', '#7AA7FF'] },
  { id: 5, title: 'Análise do fluxo SOL',             duration: '15:48', date: '12 Mai 2026', grad: ['#1a3360', '#4d8de8'] },
  { id: 6, title: 'Gestão de risco sem firula',       duration: '11:22', date: '05 Mai 2026', grad: ['#0c1c38', '#3A7BD5'] },
]

function VideoCard({ v }) {
  return (
    <div
      className="rounded-2xl overflow-hidden cursor-pointer group"
      style={{
        background: 'linear-gradient(145deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 8px 32px rgba(2,6,20,0.3)',
        transition: 'transform 0.35s cubic-bezier(0.22,1,0.36,1), border-color 0.35s ease',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = 'rgba(122,167,255,0.3)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
    >
      {/* Thumbnail */}
      <div className="relative flex items-center justify-center" style={{
        aspectRatio: '16/9',
        background: `linear-gradient(135deg, ${v.grad[0]} 0%, ${v.grad[1]}40 100%)`,
      }}>
        {/* Glow central */}
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse at center, rgba(122,167,255,0.12) 0%, transparent 60%)',
        }}/>
        {/* Play */}
        <div className="relative w-12 h-12 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110" style={{
          background: 'rgba(4,10,26,0.65)',
          border: '1px solid rgba(122,167,255,0.35)',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 4px 24px rgba(2,6,23,0.5)',
        }}>
          <svg width="14" height="16" viewBox="0 0 14 16" fill="none" style={{ marginLeft: 2 }}>
            <path d="M1 1.8v12.4c0 .8.9 1.3 1.6.9l10-6.2c.6-.4.6-1.4 0-1.8l-10-6.2C1.9.5 1 1 1 1.8z" fill="#A8C8FF"/>
          </svg>
        </div>
        {/* Duração */}
        <span className="absolute bottom-2.5 right-2.5 text-[10px] font-semibold px-2 py-0.5 rounded-md" style={{
          background: 'rgba(2,6,23,0.75)', color: 'rgba(200,215,235,0.85)', fontFamily: "'Inter', sans-serif",
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          {v.duration}
        </span>
      </div>
      {/* Info */}
      <div className="p-4">
        <h3 className="text-[14px] font-semibold leading-snug mb-1.5" style={{ color: '#EEF2FF', fontFamily: "'Inter', sans-serif" }}>
          {v.title}
        </h3>
        <p className="text-[11px]" style={{ color: 'rgba(143,164,196,0.5)', fontFamily: "'Inter', sans-serif" }}>
          {v.date}
        </p>
      </div>
    </div>
  )
}

export default function Videos({ onLoginRequest }) {
  const { user } = useAuth()
  const isAlpha = user?.plan === 'alpha'

  return (
    <section id="videos" className="max-w-[1100px] mx-auto px-6 md:px-16 mb-44">

      {/* Header */}
      <AnimateIn>
        <div className="text-center mb-12">
          <h2 className="text-[clamp(32px,4vw,48px)] font-bold tracking-tight leading-[1.08] mb-4" style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif", color: '#EEF2FF' }}>
            Conteúdo{' '}
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(100deg, #d0e4ff 0%, #7AA7FF 45%, #4d8de8 100%)' }}>
              Alpha
            </span>
          </h2>
          <p className="text-[15px] max-w-md mx-auto" style={{ color: 'rgba(190,210,235,0.45)', fontFamily: "'Inter', sans-serif" }}>
            Análises, leituras de mercado e setups gravados. Liberado enquanto seu plano Alpha estiver ativo.
          </p>
        </div>
      </AnimateIn>

      <AnimateIn delay={0.1}>
        <div className="relative">

          {/* Grid de vídeos */}
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            style={!isAlpha ? {
              filter: 'blur(10px) saturate(70%)',
              opacity: 0.55,
              pointerEvents: 'none',
              userSelect: 'none',
            } : undefined}
            aria-hidden={!isAlpha}
          >
            {VIDEOS.map(v => <VideoCard key={v.id} v={v} />)}
          </div>

          {/* Overlay de bloqueio */}
          {!isAlpha && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center px-10 py-9 rounded-2xl max-w-sm mx-4" style={{
                background: 'linear-gradient(160deg, rgba(8,18,42,0.92) 0%, rgba(4,10,26,0.96) 100%)',
                border: '1px solid rgba(122,167,255,0.22)',
                boxShadow: '0 24px 64px rgba(2,6,23,0.7), inset 0 1px 0 rgba(122,167,255,0.10)',
                backdropFilter: 'blur(12px)',
              }}>
                {/* Cadeado */}
                <div className="w-12 h-12 mx-auto mb-4 rounded-xl flex items-center justify-center" style={{
                  background: 'rgba(58,123,213,0.14)',
                  border: '1px solid rgba(122,167,255,0.3)',
                  boxShadow: '0 0 20px rgba(58,123,213,0.2)',
                }}>
                  <svg width="18" height="20" viewBox="0 0 18 21" fill="none">
                    <rect x="1" y="8.5" width="16" height="11" rx="3" stroke="#7AA7FF" strokeWidth="1.6"/>
                    <path d="M5 8.5V6a4 4 0 0 1 8 0v2.5" stroke="#7AA7FF" strokeWidth="1.6" strokeLinecap="round"/>
                    <circle cx="9" cy="14" r="1.6" fill="#7AA7FF"/>
                  </svg>
                </div>
                <h3 className="text-[18px] font-bold mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#EEF2FF' }}>
                  Exclusivo Alpha
                </h3>
                <p className="text-[13px] leading-relaxed mb-6" style={{ color: 'rgba(190,210,235,0.5)', fontFamily: "'Inter', sans-serif" }}>
                  Os vídeos ficam liberados enquanto o seu plano Alpha estiver ativo. Assine para desbloquear.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <Link
                    to="/planos"
                    className="px-6 py-2.5 rounded-full text-[13px] font-semibold text-white transition-all hover:-translate-y-px"
                    style={{
                      background: 'linear-gradient(135deg, #2a5fc7 0%, #3d7ae8 50%, #5a98f0 100%)',
                      boxShadow: '0 0 0 1px rgba(100,160,255,0.2), 0 6px 24px rgba(30,80,200,0.35)',
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    Ver planos
                  </Link>
                  {!user && (
                    <button
                      onClick={onLoginRequest}
                      className="px-6 py-2.5 rounded-full text-[13px] font-semibold transition-all"
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: 'rgba(190,210,235,0.7)',
                        fontFamily: "'Inter', sans-serif",
                        cursor: 'pointer',
                      }}
                    >
                      Entrar
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </AnimateIn>

      {/* Nota para membros Alpha */}
      {isAlpha && (
        <p className="text-center mt-8 text-[12px]" style={{ color: 'rgba(143,164,196,0.35)', fontFamily: "'Inter', sans-serif" }}>
          Acesso ativo — seu plano libera os vídeos pelo período contratado · Sincronização com Discord em breve
        </p>
      )}
    </section>
  )
}
