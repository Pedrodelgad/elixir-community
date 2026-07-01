import { useEffect, useRef, useState } from 'react'
import { DiscordIcon, XIcon } from './icons'

const SOCIAL = [
  { label: 'Discord', href: 'https://discord.gg/b8VFpgbg5U', Icon: DiscordIcon },
  { label: 'X', href: 'https://x.com/elixiralpha_', Icon: XIcon },
  { label: 'Termos', href: '#' },
]

export default function Footer() {
  const sentinelRef = useRef(null)
  const [visible, setVisible] = useState(false)
  const [jumpscare, setJumpscare] = useState(false)

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.1 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const handleCumpa = (e) => {
    e.preventDefault()
    setJumpscare(true)
    setTimeout(() => setJumpscare(false), 2000)
  }

  return (
    <>
      <div ref={sentinelRef} style={{ height: 1 }} />

      {/* Jumpscare */}
      {jumpscare && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#000',
            animation: 'jumpscareIn 0.08s ease-out',
          }}
          onClick={() => setJumpscare(false)}
        >
          <img
            src="/imgs/cumpa.jpg"
            alt="cumpa"
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
          />
          <style>{`
            @keyframes jumpscareIn {
              0% { transform: scale(1.08); opacity: 0; }
              100% { transform: scale(1); opacity: 1; }
            }
          `}</style>
        </div>
      )}

      <footer style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
        background: 'linear-gradient(180deg, rgba(2,6,23,0.88) 0%, rgba(2,6,23,0.98) 100%)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        transform: visible ? 'translateY(0)' : 'translateY(110%)',
        transition: 'transform 0.55s cubic-bezier(0.22, 1, 0.36, 1)',
      }}>
        <div className="flex items-center justify-between px-16 py-4">
          <span className="text-[13px] text-e-lo">© 2025 Elixir Community</span>
          <div className="flex gap-6">
            {SOCIAL.map(({ label, href, Icon }) => (
              <a key={label} href={href}
                {...(href !== '#' ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                className="text-[13px] text-e-lo hover:text-e-text transition-colors duration-200 inline-flex items-center gap-1.5">
                {Icon && <Icon size={14} />}{label}
              </a>
            ))}
            <a href="#" onClick={handleCumpa} className="text-[13px] text-e-lo hover:text-e-text transition-colors duration-200">
              Cumpa
            </a>
          </div>
        </div>
      </footer>
    </>
  )
}
