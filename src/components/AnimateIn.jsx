import { motion, useReducedMotion } from 'framer-motion'

// Curva "expo-out": arranca rápido e assenta devagar — entrada mais cinematográfica
const easeOut = [0.16, 1, 0.3, 1]

// Entrada ao rolar (uma vez por elemento): sobe, aparece e cresce de leve.
// Só opacity/transform (leve até em celular). Quem pede menos animação no sistema vê tudo parado.
export default function AnimateIn({
  children,
  delay = 0,
  y = 44,
  duration = 0.95,
  className = '',
}) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y, scale: 0.975 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '0px 0px -12% 0px' }}
      transition={{ duration, delay, ease: easeOut }}
    >
      {children}
    </motion.div>
  )
}
