import { useState } from 'react'
import Nav from './components/Nav'
import Hero from './components/Hero'
import Contrast from './components/Contrast'
import Features from './components/Features'
import Community from './components/Community'
import Videos from './components/Videos'
import Intelligence from './components/Intelligence'
import Manifesto from './components/Manifesto'
import Footer from './components/Footer'
import LoginModal from './components/LoginModal'
import AmbientBeams from './components/AmbientBeams'

export default function App() {
  const [loginOpen, setLoginOpen] = useState(false)

  // Sem cutscene e sem tela de "segurar para entrar" — carrega direto na home.
  return (
    <>
      <div style={{ position: 'relative' }}>
        <AmbientBeams />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <Nav onLoginRequest={() => setLoginOpen(true)} />
          <Hero />
          <Contrast />
          <Features />
          <Community onLoginRequest={() => setLoginOpen(true)} />
          <Videos onLoginRequest={() => setLoginOpen(true)} />
          <Intelligence />
          <Manifesto />
          <Footer />
        </div>
      </div>

      {/* Login Modal */}
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  )
}
