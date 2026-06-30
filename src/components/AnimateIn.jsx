import { motion } from 'framer-motion'

const easeOut = [0.22, 1, 0.36, 1]

export default function AnimateIn({
  children,
  delay = 0,
  y = 28,
  duration = 0.65,
  className = '',
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration, delay, ease: easeOut }}
    >
      {children}
    </motion.div>
  )
}

// Para listas com stagger automático
export function AnimateList({ children, stagger = 0.1, baseDelay = 0 }) {
  return (
    <>
      {children.map((child, i) => (
        <AnimateIn key={i} delay={baseDelay + i * stagger}>
          {child}
        </AnimateIn>
      ))}
    </>
  )
}
