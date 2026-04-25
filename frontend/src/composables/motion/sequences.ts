import type { MotionOpts } from './presets'
import { gsap } from 'gsap'
import { DISTANCE, DURATION, EASING, STAGGER } from './presets'

export function staggerIn(
  els: gsap.TweenTarget,
  opts?: MotionOpts & { stagger?: number },
): gsap.core.Tween {
  const distance = opts?.distance ?? DISTANCE.md
  return gsap.fromTo(els, { opacity: 0, y: distance }, {
    opacity: 1,
    y: 0,
    duration: opts?.duration ?? DURATION.normal,
    delay: opts?.delay ?? 0,
    ease: EASING.enter,
    stagger: opts?.stagger ?? STAGGER.normal,
  })
}

export function particleDrift(els: gsap.TweenTarget): gsap.core.Timeline {
  const tl = gsap.timeline({ repeat: -1 })
  tl.to(els, {
    y: '-=12',
    x: '+=6',
    opacity: 0.6,
    duration: DURATION.drift * 2,
    ease: EASING.flow,
    stagger: STAGGER.relaxed,
  })
  tl.to(els, {
    y: '+=12',
    x: '-=6',
    opacity: 0.3,
    duration: DURATION.drift * 2,
    ease: EASING.flow,
    stagger: STAGGER.relaxed,
  })
  return tl
}
