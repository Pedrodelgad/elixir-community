import { useState } from 'react'
import { useGLTF } from '@react-three/drei'
import Intro from './components/Intro'
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

// Preload do GLB da logo 3D — começa a baixar já no load da página
useGLTF.preload('/imgs/logo3d.glb')

export default function App() {
  // Se já viu o intro nessa sessão, vai direto para o site
  const already = sessionStorage.getItem('elixir_intro_done') === '1'
  const [phase, setPhase] = useState(already ? 'site' : 'logo')
  const [loginOpen, setLoginOpen] = useState(false)

  return (
    <>
      {/* Intro: logo 3D girando — a animação de entrada roda sozinha (sem cutscene, sem segurar) */}
      {!already && (
        <Intro onDone={() => { sessionStorage.setItem('elixir_intro_done', '1'); setPhase('site') }} />
      )}

      {/* Site principal */}
      <div style={{
        opacity: phase === 'site' ? 1 : 0,
        transition: 'opacity 800ms ease-in-out',
        transitionDelay: phase === 'site' ? '100ms' : '0ms',
        pointerEvents: phase === 'site' ? 'auto' : 'none',
        position: 'relative',
      }}>
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
