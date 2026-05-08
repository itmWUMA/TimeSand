import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { __resetToastForTests, useToast } from '../useToast'

describe('useToast', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    __resetToastForTests()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    __resetToastForTests()
  })

  it('showToast() adds toast to reactive list', () => {
    const { toasts, showToast } = useToast()
    const toastId = showToast('Saved', 'Changes applied', 'success')

    expect(toasts.value).toHaveLength(1)
    expect(toasts.value[0]).toMatchObject({
      id: toastId,
      title: 'Saved',
      description: 'Changes applied',
      variant: 'success',
    })
  })

  it('auto-dismisses toast after timeout', () => {
    const { toasts, showToast } = useToast()
    showToast('Auto hide')

    expect(toasts.value).toHaveLength(1)
    vi.advanceTimersByTime(5000)
    expect(toasts.value).toHaveLength(0)
  })

  it('dismissToast() removes a toast immediately', () => {
    const { toasts, showToast, dismissToast } = useToast()
    const toastId = showToast('Temporary')

    dismissToast(toastId)
    expect(toasts.value).toHaveLength(0)
  })
})
