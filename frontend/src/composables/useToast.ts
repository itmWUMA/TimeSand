import { defineStore, storeToRefs } from 'pinia'

export type ToastVariant = 'default' | 'success' | 'error'

export interface ToastItem {
  id: string
  title: string
  description?: string
  variant: ToastVariant
}

const DEFAULT_TOAST_DURATION_MS = 5000
const toastTimers = new Map<string, ReturnType<typeof setTimeout>>()

function createToastId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
    return crypto.randomUUID()

  return `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function clearToastTimer(toastId: string): void {
  const timer = toastTimers.get(toastId)
  if (timer) {
    clearTimeout(timer)
    toastTimers.delete(toastId)
  }
}

export const useToastStore = defineStore('toast', {
  state: () => ({
    toasts: [] as ToastItem[],
  }),
  actions: {
    showToast(
      title: string,
      description?: string,
      variant: ToastVariant = 'default',
      durationMs: number = DEFAULT_TOAST_DURATION_MS,
    ): string {
      const toastId = createToastId()
      this.toasts.push({
        id: toastId,
        title,
        description,
        variant,
      })

      const timeout = setTimeout(() => {
        this.dismissToast(toastId)
      }, Math.max(0, durationMs))
      toastTimers.set(toastId, timeout)

      return toastId
    },
    dismissToast(toastId: string): void {
      clearToastTimer(toastId)
      this.toasts = this.toasts.filter(toast => toast.id !== toastId)
    },
    clearToasts(): void {
      for (const toast of this.toasts)
        clearToastTimer(toast.id)
      this.toasts = []
    },
  },
})

export function useToast() {
  const toastStore = useToastStore()
  const { toasts } = storeToRefs(toastStore)

  return {
    toasts,
    showToast: toastStore.showToast,
    dismissToast: toastStore.dismissToast,
    clearToasts: toastStore.clearToasts,
  }
}

export function __resetToastForTests(): void {
  const toastStore = useToastStore()
  toastStore.clearToasts()
  toastTimers.clear()
}
