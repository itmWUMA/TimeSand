import type { MotionOpts } from './presets'
import { gsap } from 'gsap'
import { DISTANCE, DURATION, EASING } from './presets'

export function fadeIn(el: gsap.TweenTarget, opts?: MotionOpts): gsap.core.Tween {
  const distance = opts?.distance ?? DISTANCE.md
  return gsap.fromTo(el, { opacity: 0, y: distance }, {
    opacity: 1,
    y: 0,
    duration: opts?.duration ?? DURATION.normal,
    delay: opts?.delay ?? 0,
    ease: EASING.enter,
  })
}

export function fadeOut(el: gsap.TweenTarget, opts?: MotionOpts): gsap.core.Tween {
  const distance = opts?.distance ?? DISTANCE.sm
  return gsap.to(el, {
    opacity: 0,
    y: distance,
    duration: opts?.duration ?? DURATION.normal,
    delay: opts?.delay ?? 0,
    ease: EASING.exit,
  })
}

export function slideUp(el: gsap.TweenTarget, opts?: MotionOpts): gsap.core.Tween {
  const distance = opts?.distance ?? DISTANCE.lg
  return gsap.fromTo(el, { opacity: 0, y: distance }, {
    opacity: 1,
    y: 0,
    duration: opts?.duration ?? DURATION.normal,
    delay: opts?.delay ?? 0,
    ease: EASING.enter,
  })
}

export function scaleIn(el: gsap.TweenTarget, opts?: MotionOpts): gsap.core.Tween {
  return gsap.fromTo(el, { opacity: 0, scale: 0.85 }, {
    opacity: 1,
    scale: 1,
    duration: opts?.duration ?? DURATION.normal,
    delay: opts?.delay ?? 0,
    ease: EASING.gentle,
  })
}

export function glowBreath(el: gsap.TweenTarget): gsap.core.Tween {
  return gsap.fromTo(
    el,
    { scale: 1, filter: 'drop-shadow(0 0 8px rgba(212, 168, 67, 0.2))' },
    {
      scale: 1.03,
      filter: 'drop-shadow(0 0 22px rgba(212, 168, 67, 0.55))',
      duration: DURATION.drift,
      ease: EASING.breath,
      repeat: -1,
      yoyo: true,
    },
  )
}

export function ribbonFlow(el: gsap.TweenTarget): gsap.core.Tween {
  return gsap.fromTo(el, { x: '-100%', opacity: 0 }, {
    x: '100%',
    opacity: 1,
    duration: DURATION.drift * 2,
    ease: EASING.flow,
    repeat: -1,
    keyframes: [
      { x: '-100%', opacity: 0, duration: 0 },
      { x: '-30%', opacity: 1, duration: DURATION.drift * 0.6 },
      { x: '30%', opacity: 1, duration: DURATION.drift * 0.8 },
      { x: '100%', opacity: 0, duration: DURATION.drift * 0.6 },
    ],
  })
}
