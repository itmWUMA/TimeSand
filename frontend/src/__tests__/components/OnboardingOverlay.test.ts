import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createI18n } from 'vue-i18n'

import OnboardingOverlay from '../../components/OnboardingOverlay.vue'

function createImmediateTween() {
  const tween = {
    eventCallback: (_event: string, callback?: () => void) => {
      callback?.()
      return tween
    },
  }
  return tween
}

vi.mock('../../composables/motion/transitions', () => ({
  fadeIn: vi.fn(() => createImmediateTween()),
  fadeOut: vi.fn(() => createImmediateTween()),
  scaleIn: vi.fn(() => createImmediateTween()),
}))

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: {
    en: {
      onboarding: {
        step1Title: 'Welcome to TimeSand',
        step1Content: 'Your private time hourglass.',
        step2Title: 'Draw a Memory',
        step2Content: 'Click the deck.',
        step3Title: 'Immersive Playback',
        step3Content: 'Open slideshow with music.',
        step4Title: 'Begin Your Journey',
        step4Content: 'Upload your photos and music.',
        next: 'Next',
        skip: 'Skip',
        done: 'Begin',
      },
    },
  },
})

async function mountOverlay() {
  const wrapper = mount(OnboardingOverlay, {
    global: {
      plugins: [i18n],
    },
  })

  await wrapper.vm.$nextTick()
  return wrapper
}

async function waitForTransition(wrapper: Awaited<ReturnType<typeof mountOverlay>>) {
  await Promise.resolve()
  await wrapper.vm.$nextTick()
}

describe('onboardingOverlay', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders when onboarding completion flag is absent', async () => {
    const wrapper = await mountOverlay()

    expect(wrapper.find('[data-testid="onboarding-overlay"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Welcome to TimeSand')
  })

  it('does not render when onboarding completion flag is true', async () => {
    localStorage.setItem('ts-onboarding-complete', 'true')
    const wrapper = await mountOverlay()

    expect(wrapper.find('[data-testid="onboarding-overlay"]').exists()).toBe(false)
  })

  it('advances through all steps with next button', async () => {
    const wrapper = await mountOverlay()

    await wrapper.get('[data-testid="onboarding-next"]').trigger('click')
    await waitForTransition(wrapper)
    expect(wrapper.text()).toContain('Draw a Memory')

    await wrapper.get('[data-testid="onboarding-next"]').trigger('click')
    await waitForTransition(wrapper)
    expect(wrapper.text()).toContain('Immersive Playback')

    await wrapper.get('[data-testid="onboarding-next"]').trigger('click')
    await waitForTransition(wrapper)
    expect(wrapper.text()).toContain('Begin Your Journey')
  })

  it('sets completion flag when skip is clicked', async () => {
    const wrapper = await mountOverlay()
    await wrapper.get('[data-testid="onboarding-skip"]').trigger('click')

    expect(localStorage.getItem('ts-onboarding-complete')).toBe('true')
    expect(wrapper.find('[data-testid="onboarding-overlay"]').exists()).toBe(false)
  })

  it('sets completion flag when done is clicked on last step', async () => {
    vi.useFakeTimers()
    const wrapper = await mountOverlay()

    await wrapper.get('[data-testid="onboarding-next"]').trigger('click')
    await waitForTransition(wrapper)
    await wrapper.get('[data-testid="onboarding-next"]').trigger('click')
    await waitForTransition(wrapper)
    await wrapper.get('[data-testid="onboarding-next"]').trigger('click')
    await waitForTransition(wrapper)
    await wrapper.get('[data-testid="onboarding-done"]').trigger('click')
    vi.runAllTimers()
    await wrapper.vm.$nextTick()

    expect(localStorage.getItem('ts-onboarding-complete')).toBe('true')
    expect(wrapper.find('[data-testid="onboarding-overlay"]').exists()).toBe(false)
    vi.useRealTimers()
  })
})
