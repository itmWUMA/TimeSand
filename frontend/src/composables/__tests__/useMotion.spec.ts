import { gsap } from 'gsap'
import { describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'

import { DISTANCE, DURATION, EASING, STAGGER } from '../motion'
import { useMotion } from '../useMotion'

describe('motion presets', () => {
  it('exports all easing presets', () => {
    expect(EASING.enter).toBe('power2.out')
    expect(EASING.exit).toBe('power2.in')
    expect(EASING.breath).toBe('sine.inOut')
    expect(EASING.flow).toBe('power1.inOut')
    expect(EASING.gentle).toBe('back.out(1.2)')
  })

  it('exports all duration presets', () => {
    expect(DURATION.fast).toBe(0.2)
    expect(DURATION.normal).toBe(0.4)
    expect(DURATION.slow).toBe(0.7)
    expect(DURATION.drift).toBe(1.2)
  })

  it('exports all distance presets', () => {
    expect(DISTANCE.sm).toBe(8)
    expect(DISTANCE.md).toBe(20)
    expect(DISTANCE.lg).toBe(40)
  })

  it('exports all stagger presets', () => {
    expect(STAGGER.tight).toBe(0.05)
    expect(STAGGER.normal).toBe(0.1)
    expect(STAGGER.relaxed).toBe(0.15)
  })
})

describe('useMotion', () => {
  const { fadeIn, fadeOut, slideUp, scaleIn, glowBreath, ribbonFlow, staggerIn, particleDrift } = useMotion()
  const el = document.createElement('div')

  it('fadeIn returns a GSAP tween', () => {
    const tween = fadeIn(el)
    expect(tween).toBeInstanceOf(gsap.core.Tween)
    tween.kill()
  })

  it('fadeOut returns a GSAP tween', () => {
    const tween = fadeOut(el)
    expect(tween).toBeInstanceOf(gsap.core.Tween)
    tween.kill()
  })

  it('slideUp returns a GSAP tween', () => {
    const tween = slideUp(el)
    expect(tween).toBeInstanceOf(gsap.core.Tween)
    tween.kill()
  })

  it('scaleIn returns a GSAP tween', () => {
    const tween = scaleIn(el)
    expect(tween).toBeInstanceOf(gsap.core.Tween)
    tween.kill()
  })

  it('glowBreath returns a GSAP tween', () => {
    const tween = glowBreath(el)
    expect(tween).toBeInstanceOf(gsap.core.Tween)
    tween.kill()
  })

  it('ribbonFlow returns a GSAP tween', () => {
    const tween = ribbonFlow(el)
    expect(tween).toBeInstanceOf(gsap.core.Tween)
    tween.kill()
  })

  it('staggerIn returns a GSAP tween', () => {
    const els = [document.createElement('div'), document.createElement('div')]
    const tween = staggerIn(els)
    expect(tween).toBeInstanceOf(gsap.core.Tween)
    tween.kill()
  })

  it('particleDrift returns a GSAP timeline', () => {
    const els = [document.createElement('div'), document.createElement('div')]
    const tl = particleDrift(els)
    expect(tl).toBeInstanceOf(gsap.core.Timeline)
    tl.kill()
  })

  it('fadeIn accepts custom opts', () => {
    const tween = fadeIn(el, { delay: 0.5, duration: 1.0, distance: 50 })
    expect(tween).toBeInstanceOf(gsap.core.Tween)
    tween.kill()
  })

  it('auto-kills animations on scope dispose', () => {
    const scope = effectScope()
    let tween: gsap.core.Tween

    scope.run(() => {
      const motion = useMotion()
      tween = motion.glowBreath(document.createElement('div'))
    })

    const killSpy = vi.spyOn(tween!, 'kill')
    scope.stop()
    expect(killSpy).toHaveBeenCalled()
  })
})
