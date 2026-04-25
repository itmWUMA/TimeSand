export const EASING = {
  enter: 'power2.out',
  exit: 'power2.in',
  breath: 'sine.inOut',
  flow: 'power1.inOut',
  gentle: 'back.out(1.2)',
} as const

export const DURATION = {
  fast: 0.2,
  normal: 0.4,
  slow: 0.7,
  drift: 1.2,
} as const

export const DISTANCE = {
  sm: 8,
  md: 20,
  lg: 40,
} as const

export const STAGGER = {
  tight: 0.05,
  normal: 0.1,
  relaxed: 0.15,
} as const

export interface MotionOpts {
  delay?: number
  duration?: number
  distance?: number
}
