import { fadeIn, fadeOut, glowBreath, particleDrift, ribbonFlow, scaleIn, slideUp, staggerIn } from './motion'

export function useMotion() {
  return {
    fadeIn,
    fadeOut,
    slideUp,
    scaleIn,
    glowBreath,
    ribbonFlow,
    staggerIn,
    particleDrift,
  }
}
