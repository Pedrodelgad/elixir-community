import Plans from '../components/Plans'
import LoginModal from '../components/LoginModal'
import Nav from '../components/Nav'
import { useState } from 'react'

export default function PlansPage() {
  const [loginOpen, setLoginOpen] = useState(false)

  return (
    <div style={{ minHeight: '100vh', background: '#020617' }}>

      {/* Nav (barra completa, igual em todas as páginas) */}
      <Nav onLoginRequest={() => setLoginOpen(true)} />

      {/* Conteúdo */}
      <div className="pt-16">
        <Plans onLoginRequest={() => setLoginOpen(true)} />
      </div>

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} redirect="/planos" />
    </div>
  )
}
