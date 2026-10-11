import type { Transition, Variants } from 'framer-motion'

// Curvas inspiradas em objetos físicos: papel assenta, tinta escorre, carimbo bate.
export const ink: [number, number, number, number] = [0.22, 0.8, 0.3, 1]
export const paper: Transition = { type: 'spring', stiffness: 260, damping: 26, mass: 0.9 }
export const stamp: Transition = { type: 'spring', stiffness: 460, damping: 19 }
export const pendulum: Transition = { type: 'spring', stiffness: 120, damping: 7, mass: 0.8 }

export type PageMotion = 'turn' | 'open' | 'tear' | 'kitchen'
export const pageVariants: Variants = {
  enter: (kind: PageMotion) => kind === 'open' ? { opacity: 0, y: 30, scale: 0.98 }
    : kind === 'kitchen' ? { opacity: 0, y: 46 }
    : { opacity: 0, x: 18, rotate: 0.25 },
  center: { opacity: 1, x: 0, y: 0, rotate: 0, scale: 1, transition: { duration: 0.38, ease: ink } },
  exit: (kind: PageMotion) => kind === 'tear' ? { opacity: 0, y: 80, rotate: -3.5, scale: 0.95, transition: { duration: 0.45, ease: [0.5, 0, 0.75, 0] } }
    : { opacity: 0, x: kind === 'turn' ? -14 : 0, transition: { duration: 0.18 } }
}

export const rise: Variants = { hidden: { opacity: 0, y: 22 }, shown: { opacity: 1, y: 0, transition: { duration: 0.5, ease: ink } } }
export const stack = (gap = 0.07): Variants => ({ hidden: {}, shown: { transition: { staggerChildren: gap } } })
export const inView = { initial: 'hidden', whileInView: 'shown', viewport: { once: true, margin: '-60px' } } as const

const tossAngles = [-5, 4, -3, 6]
// Fichas "distribuídas" sobre a mesa, uma depois da outra.
export const dealt: Variants = {
  hidden: (i: number) => ({ opacity: 0, y: -30, rotate: tossAngles[i % tossAngles.length] }),
  shown: (i: number) => ({ opacity: 1, y: 0, rotate: 0, transition: { ...paper, delay: Math.min(i, 8) * 0.055 } })
}
