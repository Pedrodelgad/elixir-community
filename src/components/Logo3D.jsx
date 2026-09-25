import { useRef, Suspense, useEffect, useLayoutEffect, useState, Component } from 'react'
import { Canvas, useFrame, useThree, useLoader } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js'

// Se o WebGL cair (contexto perdido, comum em Mac Retina sob pressão de GPU), NÃO derruba o app:
// mostra o logo estático no lugar. Sem isso, um erro do Canvas some com o site inteiro.
class WebGLBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(e) {
    console.warn('[Logo3D] WebGL falhou → fallback estático:', e?.message)
    this.props.onFail?.()
  }
  render() { return this.state.failed ? null : this.props.children }
}

// Anel pulsando enquanto o GLB carrega
function LoadingMesh() {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.y = clock.getElapsedTime() * 0.8
      ref.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.5) * 0.2
    }
  })
  return (
    <mesh ref={ref}>
      <torusGeometry args={[0.7, 0.04, 16, 80]} />
      <meshStandardMaterial color="#3A7BD5" roughness={0.2} metalness={0.8} />
    </mesh>
  )
}

// ── IBL local ─────────────────────────────────────────────────────
// Antes: <Environment preset="studio"> baixava studio_small_03_1k.hdr (1,68 MB!) de um CDN
// de terceiro (raw.githack) EM RUNTIME — e a chegada dele no meio da animação disparava
// decode na main thread + PMREM na GPU + recompilação do shader: o engasgo clássico.
// Agora é o MESMO HDRI, reamostrado pra 256x128 (128 KB) e servido daqui. Como o PMREM
// borra tudo de qualquer jeito, o reflexo no logo fica igual — e carrega dentro do
// Suspense, ou seja, antes do primeiro frame visível.
function StudioEnv() {
  const gl    = useThree(s => s.gl)
  const scene = useThree(s => s.scene)
  const tex   = useLoader(HDRLoader, '/imgs/studio_env.hdr')
  useLayoutEffect(() => {
    tex.mapping = THREE.EquirectangularReflectionMapping
    const pmrem = new THREE.PMREMGenerator(gl)
    const rt = pmrem.fromEquirectangular(tex)
    scene.environment = rt.texture
    return () => { rt.dispose(); pmrem.dispose(); scene.environment = null }
  }, [gl, scene, tex])
  return null
}

// Aquece os shaders (compile) e só avisa "pronto" depois de 2 frames REAIS desenhados —
// é o gatilho do cross-fade PNG → canvas e do cronômetro da intro.
function Ready({ onReady }) {
  const { gl, scene, camera } = useThree()
  const frames = useRef(0)
  useLayoutEffect(() => {
    try { gl.compile(scene, camera) } catch { /* compile é só otimização */ }
  }, [gl, scene, camera])
  useFrame(() => {
    frames.current += 1
    if (frames.current === 2) onReady?.()
  })
  return null
}

// ── Modelo 3D ─────────────────────────────────────────────────────
function Model({ mousePos, phaseRef }) {
  const { scene } = useGLTF('/imgs/logo3d.glb')
  const { gl } = useThree()
  const modelRef = useRef()
  const speedRef = useRef(0.003)
  const tiltX    = useRef(0)
  const tiltZ    = useRef(0)

  // Centro do canvas + tamanho da janela cacheados. getBoundingClientRect()/innerWidth todo
  // frame força reflow (layout thrashing); só mudam no resize.
  const viewRef = useRef({
    cx: window.innerWidth / 2, cy: window.innerHeight / 2,
    vw: window.innerWidth,     vh: window.innerHeight,
  })
  useEffect(() => {
    const update = () => {
      const r = gl.domElement.getBoundingClientRect()
      viewRef.current = {
        cx: r.left + r.width / 2, cy: r.top + r.height / 2,
        vw: window.innerWidth,    vh: window.innerHeight,
      }
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [gl])

  useEffect(() => {
    // Ajusta materiais para visual premium
    scene.traverse(child => {
      if (!child.isMesh) return
      if (child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material]
        mats.forEach(m => {
          if (m.isMeshStandardMaterial || m.isMeshPhysicalMaterial) {
            m.roughness = Math.min(m.roughness, 0.2)
            m.metalness = Math.max(m.metalness, 0.75)
            m.envMapIntensity = 1.6
          }
        })
      }
    })

    // Centraliza o modelo
    const box = new THREE.Box3().setFromObject(scene)
    const center = new THREE.Vector3()
    box.getCenter(center)
    scene.position.sub(center)
  }, [scene])

  useFrame((state, delta) => {
    if (!modelRef.current) return
    if (phaseRef.current === 'done') return

    const { cx, cy, vw, vh } = viewRef.current
    const dx = (mousePos.current.x ?? vw / 2) - cx
    const dy = (mousePos.current.y ?? vh / 2) - cy
    const dist = Math.sqrt(dx * dx + dy * dy)

    // Velocidade: 0px → 0.18 rad/s (suave) | 700px+ → 0.008 rad/s
    let targetSpeed
    if (phaseRef.current === 'revealing') {
      targetSpeed = 2.4
    } else {
      const t = Math.min(dist / 700, 1)
      targetSpeed = 0.18 * Math.pow(1 - t, 1.6) + 0.008
    }

    speedRef.current += (targetSpeed - speedRef.current) * 0.055
    modelRef.current.rotation.y += speedRef.current * delta * 60

    // Inclinação 3D seguindo o mouse
    const tx = (dy / (vh * 0.5)) * -0.22
    const tz = (dx / (vw * 0.5)) *  0.10
    tiltX.current += (tx - tiltX.current) * 0.05
    tiltZ.current += (tz - tiltZ.current) * 0.05
    modelRef.current.rotation.x = tiltX.current
    modelRef.current.rotation.z = tiltZ.current
  })

  return <primitive ref={modelRef} object={scene} scale={0.62} />
}

// Mobile/celular: menos pixels + sem antialias = init e render bem mais leves
const isMobile = typeof window !== 'undefined' &&
  (window.matchMedia?.('(pointer: coarse)').matches || window.innerWidth < 768)

// ── Canvas ────────────────────────────────────────────────────────
export default function Logo3D({ mousePos, phaseRef, size = 280, onReady }) {
  // WebGL indisponível/bloqueado (Brave com proteção, aceleração de hardware desligada, etc.)
  // → mostra o logo estático em vez de um buraco vazio.
  const [webglOk, setWebglOk] = useState(true)
  // Primeiro frame 3D desenhado → faz o cross-fade do PNG para o canvas.
  const [canvasUp, setCanvasUp] = useState(false)

  const readyRef = useRef(false)
  const signalReady = () => {
    if (readyRef.current) return
    readyRef.current = true
    onReady?.()
  }

  // Sem WebGL (ou contexto perdido): o PNG É a versão final — a intro pode seguir na hora.
  const fail = () => {
    setWebglOk(false)
    setCanvasUp(false)
    signalReady()
  }

  useEffect(() => {
    try {
      const c = document.createElement('canvas')
      const gl = c.getContext('webgl2') || c.getContext('webgl') || c.getContext('experimental-webgl')
      if (!gl || (gl.isContextLost && gl.isContextLost())) fail()
    } catch { fail() }
  }, [])

  return (
    <div style={{ position: 'relative', width: size, height: size }}>

      {/* Glow azul atrás */}
      <div style={{
        position: 'absolute',
        inset: '-30%',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(58,123,213,0.45) 0%, rgba(22,74,115,0.18) 50%, transparent 70%)',
        filter: 'blur(28px)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* Logo estático: aparece no PRIMEIRO frame da página (pré-carregado no index.html),
          sem depender do bundle/GLB/WebGL. Some em cross-fade quando o 3D desenha. */}
      <img
        src="/imgs/elixir_logo.png"
        alt="Elixir"
        style={{
          position: 'absolute', inset: '9%', width: '82%', height: '82%',
          objectFit: 'contain', zIndex: 1, pointerEvents: 'none',
          filter: 'drop-shadow(0 6px 24px rgba(58,123,213,0.55))',
          opacity: canvasUp ? 0 : 1,
          transition: 'opacity 260ms ease-out',
        }}
      />

      {webglOk && (
      <WebGLBoundary onFail={fail}>
      <Canvas
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 2,
          opacity: canvasUp ? 1 : 0,
          transition: 'opacity 260ms ease-out',
        }}
        dpr={isMobile ? [1, 1.25] : [1, 2]}
        camera={{ position: [0, 0, 9.5], fov: 32 }}
        gl={{
          alpha: true,
          antialias: !isMobile,
          premultipliedAlpha: false,
          powerPreference: 'high-performance',
        }}
        onCreated={({ gl, scene }) => {
          gl.setClearColor(0x000000, 0)
          gl.setClearAlpha(0)
          scene.background = null
          // Se o contexto cair depois (Brave/GPU) → troca pelo estático em vez de sumir
          gl.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); fail() }, { once: true })
        }}
      >
        {/* Luzes */}
        <ambientLight intensity={0.45} color="#d4e8ff" />
        <directionalLight position={[4, 6, 4]} intensity={1.3} color="#ffffff" />
        <pointLight position={[-5, 0, 3]} intensity={1.5} color="#3A7BD5" />
        <pointLight position={[3, -4, 2]} intensity={0.4} color="#7AA7FF" />

        <Suspense fallback={<LoadingMesh />}>
          {/* IBL antes do modelo: a env precisa existir quando o shader for compilado */}
          <StudioEnv />
          <Model mousePos={mousePos} phaseRef={phaseRef} />
          <Ready onReady={() => { setCanvasUp(true); signalReady() }} />
        </Suspense>
      </Canvas>
      </WebGLBoundary>
      )}
    </div>
  )
}

// Preload já feito no App.jsx + <link rel="preload"> no index.html — não duplicar
