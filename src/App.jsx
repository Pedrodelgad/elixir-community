import { useState } from 'react'
import { useGLTF } from '@react-three/drei'
import VideoIntro from './components/VideoIntro'
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

// Preload imediato — começa a baixar o GLB + HDR enquanto o vídeo toca
useGLTF.preload('/imgs/logo3d.glb')

// Mobile/celular: pointer grosso ou tela estreita
const isMobile = typeof window !== 'undefined' &&
  (window.matchMedia?.('(pointer: coarse)').matches || window.innerWidth < 768)

export default function App() {
  // Se já viu o intro nessa sessão, vai direto para o site
  const already = sessionStorage.getItem('elixir_intro_done') === '1'
  const [phase, setPhase] = useState(already ? 'site' : 'video')
  const [loginOpen, setLoginOpen] = useState(false)

  return (
    <>
      {/* 1. Cutscene */}
      {phase === 'video' && (
        <VideoIntro onDone={() => setPhase('logo')} />
      )}

      {/* 2. Logo gate.
           DESKTOP: montado JÁ durante o vídeo (atrás dele: Intro z-100, VideoIntro z-200) pra
           pré-aquecer o Canvas 3D + Environment — logo já pronta quando o vídeo sai, sem delay.
           MOBILE: montar durante o vídeo trava o celular (WebGL + HDR + render competindo com a
           decodificação do vídeo). Então no mobile a logo só monta DEPOIS do vídeo (phase !== 'video'). */}
      {!already && (!isMobile || phase !== 'video') && (
        <Intro onDone={() => { sessionStorage.setItem('elixir_intro_done', '1'); setPhase('site') }} />
      )}

      {/* 3. Site principal */}
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
