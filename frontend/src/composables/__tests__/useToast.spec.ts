import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { __resetToastForTests, useToast } from '../useToast'

describe('useToast', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    __resetToastForTests()
  })

  afterEach(() => {
    __resetToastForTests()
  })

  it('showToast() adds toast to reactive list with duration', () => {
    const { toasts, showToast } = useToast()
    const toastId = showToast('Saved', 'Changes applied', 'success')

    expect(toasts.value).toHaveLength(1)
    expect(toasts.value[0]).toMatchObject({
      id: toastId,
      title: 'Saved',
      description: 'Changes applied',
      variant: 'success',
      durationMs: 5000,
    })
  })

  it('showToast() honors custom duration on the toast item', () => {
    const { toasts, showToast } = useToast()
    showToast('Long', undefined, 'default', 10000)

    expect(toasts.value[0]?.durationMs).toBe(10000)
  })

  it('showToast() clamps negative duration to zero', () => {
    const { toasts, showToast } = useToast()
    showToast('Bad', undefined, 'default', -100)

    expect(toasts.value[0]?.durationMs).toBe(0)
  })

  it('dismissToast() removes a toast immediately', () => {
    const { toasts, showToast, dismissToast } = useToast()
    const toastId = showToast('Temporary')

    dismissToast(toastId)
    expect(toasts.value).toHaveLength(0)
  })

  it('clearToasts() empties the list', () => {
    const { toasts, showToast, clearToasts } = useToast()
    showToast('A')
    showToast('B')

    clearToasts()
    expect(toasts.value).toHaveLength(0)
  })
})
