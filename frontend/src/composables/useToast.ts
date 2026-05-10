import { defineStore, storeToRefs } from 'pinia'

export type ToastVariant = 'default' | 'success' | 'error'

export interface ToastItem {
  id: string
  title: string
  description?: string
  variant: ToastVariant
  durationMs: number
}

const DEFAULT_TOAST_DURATION_MS = 5000

function createToastId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
    return crypto.randomUUID()

  return `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`
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
        durationMs: Math.max(0, durationMs),
      })

      return toastId
    },
    dismissToast(toastId: string): void {
      this.toasts = this.toasts.filter(toast => toast.id !== toastId)
    },
    clearToasts(): void {
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
}
