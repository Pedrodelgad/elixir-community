import { motion, useScroll, useSpring } from 'framer-motion'

// Fio de luz no topo da tela que enche conforme a página rola (só transform = leve).
export default function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 })
  return (
    <motion.div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 h-[2px] pointer-events-none"
      style={{
        zIndex: 60, scaleX, transformOrigin: '0 50%',
        background: 'linear-gradient(90deg, rgba(58,123,213,0.2), #5b98ff 60%, #b5d6ff)',
        boxShadow: '0 0 10px rgba(91,152,255,0.7)',
      }}
    />
  )
}
