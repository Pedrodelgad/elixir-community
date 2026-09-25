import { useState, startTransition } from 'react'
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
// (o <link rel="preload"> no index.html já disparou antes disso; aqui é só garantia)
useGLTF.preload('/imgs/logo3d.glb')

const introDone = () => {
  try { return sessionStorage.getItem('elixir_intro_done') === '1' } catch { return false }
}

export default function App() {
  // Se já viu o intro nessa sessão, vai direto para o site
  const [already] = useState(introDone)
  // `mounted`: árvore do site montada · `visible`: fade-in ligado.
  // O site NÃO monta junto com a intro — AmbientBeams (feTurbulence fullscreen + ~12 camadas
  // de blur), o Hero e as outras seções roubariam a main thread justo enquanto o logo 3D
  // carrega e aparece. Monta quando o anel começa (startTransition, em fatias interrompíveis),
  // ficando pronto e pintado antes do reveal — que assim só compõe camadas.
  const [mounted, setMounted] = useState(already)
  const [visible, setVisible] = useState(already)
  const [loginOpen, setLoginOpen] = useState(false)

  return (
    <>
      {/* Intro: logo 3D girando — a animação de entrada roda sozinha (sem cutscene, sem segurar) */}
      {!already && (
        <Intro
          onStart={() => startTransition(() => setMounted(true))}
          onDone={() => {
            try { sessionStorage.setItem('elixir_intro_done', '1') } catch { /* modo privado */ }
            setMounted(true)
            setVisible(true)
          }}
        />
      )}

      {/* Site principal */}
      <div style={{
        opacity: visible ? 1 : 0,
        transition: 'opacity 800ms ease-in-out',
        transitionDelay: visible ? '100ms' : '0ms',
        pointerEvents: visible ? 'auto' : 'none',
        position: 'relative',
      }}>
        {mounted && (
          <>
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
          </>
        )}
      </div>

      {/* Login Modal */}
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  )
}
