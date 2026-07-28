import { useRef, Suspense, useEffect, useState, Component } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF, Environment } from '@react-three/drei'
import * as THREE from 'three'

// Se o WebGL cair (contexto perdido, comum em Mac Retina sob pressão de GPU), NÃO derruba o app:
// mostra o logo estático no lugar. Sem isso, um erro do Canvas some com o site inteiro.
class WebGLBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(e) { console.warn('[Logo3D] WebGL falhou → fallback estático:', e?.message) }
  render() { return this.state.failed ? this.props.fallback : this.props.children }
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

// Garante canvas transparente todo frame (Environment sobrescreve scene.background)
function ClearBg() {
  const { scene, gl } = useThree()
  useFrame(() => {
    scene.background = null
    gl.setClearAlpha(0)
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

  // Centro do canvas cacheado. getBoundingClientRect() todo frame força reflow (layout thrashing);
  // a posição só muda no resize, então calcula uma vez + em resize.
  const centerRef = useRef({ cx: window.innerWidth / 2, cy: window.innerHeight / 2 })
  useEffect(() => {
    const update = () => {
      const r = gl.domElement.getBoundingClientRect()
      centerRef.current = { cx: r.left + r.width / 2, cy: r.top + r.height / 2 }
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

    const { cx, cy } = centerRef.current
    const dx = (mousePos.current.x ?? window.innerWidth  / 2) - cx
    const dy = (mousePos.current.y ?? window.innerHeight / 2) - cy
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
    const tx = (dy / (window.innerHeight * 0.5)) * -0.22
    const tz = (dx / (window.innerWidth  * 0.5)) *  0.10
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
export default function Logo3D({ mousePos, phaseRef, size = 280 }) {
  // WebGL indisponível/bloqueado (Brave com proteção, aceleração de hardware desligada, etc.)
  // → mostra o logo estático em vez de um buraco vazio.
  const [webglOk, setWebglOk] = useState(true)
  useEffect(() => {
    try {
      const c = document.createElement('canvas')
      const gl = c.getContext('webgl2') || c.getContext('webgl') || c.getContext('experimental-webgl')
      if (!gl || (gl.isContextLost && gl.isContextLost())) setWebglOk(false)
    } catch { setWebglOk(false) }
  }, [])

  const staticLogo = (
    <img src="/imgs/logo3d.png" alt="Elixir" style={{ position: 'relative', width: '100%', height: '100%', objectFit: 'contain', zIndex: 1, filter: 'drop-shadow(0 6px 24px rgba(58,123,213,0.55))' }} />
  )

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

      {/* Sem WebGL → logo estático. Com WebGL → o Canvas (com boundary de segurança). */}
      {!webglOk ? staticLogo : (
      <WebGLBoundary fallback={staticLogo}>
      <Canvas
        style={{ position: 'relative', width: '100%', height: '100%', zIndex: 1 }}
        dpr={[1, 1]}
        camera={{ position: [0, 0, 9.5], fov: 32 }}
        gl={{
          alpha: true,
          antialias: !isMobile,
          premultipliedAlpha: false,
          powerPreference: 'default',
        }}
        onCreated={({ gl, scene }) => {
          gl.setClearColor(0x000000, 0)
          scene.background = null
          // Se o contexto cair depois (Brave/GPU) → troca pelo estático em vez de sumir
          gl.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); setWebglOk(false) }, { once: true })
        }}
      >
        {/* IBL — suspend={false} para não bloquear o render inicial */}
        <Environment preset="studio" background={false} suspend={false} resolution={128} />

        {/* Luzes */}
        <ambientLight intensity={0.45} color="#d4e8ff" />
        <directionalLight position={[4, 6, 4]} intensity={1.3} color="#ffffff" />
        <pointLight position={[-5, 0, 3]} intensity={1.5} color="#3A7BD5" />
        <pointLight position={[3, -4, 2]} intensity={0.4} color="#7AA7FF" />

        {/* Força transparência todo frame */}
        <ClearBg />

        <Suspense fallback={<LoadingMesh />}>
          <Model mousePos={mousePos} phaseRef={phaseRef} />
        </Suspense>
      </Canvas>
      </WebGLBoundary>
      )}
    </div>
  )
}

// Preload já feito no App.jsx — não duplicar
