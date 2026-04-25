import { getCurrentScope, onScopeDispose } from 'vue'
import { fadeIn, fadeOut, glowBreath, particleDrift, ribbonFlow, scaleIn, slideUp, staggerIn } from './motion'

interface Killable { kill: () => void }

function tracked<A extends any[], R extends Killable>(fn: (...args: A) => R, instances: Killable[]) {
  return (...args: A): R => {
    const anim = fn(...args)
    instances.push(anim)
    return anim
  }
}

export function useMotion() {
  const instances: Killable[] = []

  if (getCurrentScope()) {
    onScopeDispose(() => {
      instances.forEach(a => a.kill())
    })
  }

  return {
    fadeIn: tracked(fadeIn, instances),
    fadeOut: tracked(fadeOut, instances),
    slideUp: tracked(slideUp, instances),
    scaleIn: tracked(scaleIn, instances),
    glowBreath: tracked(glowBreath, instances),
    ribbonFlow: tracked(ribbonFlow, instances),
    staggerIn: tracked(staggerIn, instances),
    particleDrift: tracked(particleDrift, instances),
  }
}
