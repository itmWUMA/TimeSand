import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { AxiosError } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { showToastSpy, translateSpy } = vi.hoisted(() => ({
  showToastSpy: vi.fn(),
  translateSpy: vi.fn((key: string) => `translated:${key}`),
}))

vi.mock('../../composables/useToast', () => ({
  useToast: () => ({
    showToast: showToastSpy,
  }),
}))

vi.mock('../../i18n', () => ({
  default: {
    global: {
      t: translateSpy,
    },
  },
}))

const { default: api } = await import('../api')

function buildHttpErrorAdapter(status: number, data?: unknown) {
  return async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
    throw new AxiosError(
      'Request failed',
      'ERR_BAD_RESPONSE',
      config,
      undefined,
      {
        config,
        data,
        headers: {},
        status,
        statusText: 'Error',
      },
    )
  }
}

describe('api error interceptor', () => {
  beforeEach(() => {
    showToastSpy.mockClear()
    translateSpy.mockClear()
  })

  it('shows toast for 500 response errors', async () => {
    await expect(
      api.get('/albums', {
        adapter: buildHttpErrorAdapter(500, { message: 'backend message' }),
      }),
    ).rejects.toBeInstanceOf(AxiosError)

    expect(showToastSpy).toHaveBeenCalledWith('translated:error.server', undefined, 'error')
  })

  it('shows toast for network errors without response', async () => {
    await expect(
      api.get('/albums', {
        adapter: async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
          throw new AxiosError('Network Error', 'ERR_NETWORK', config)
        },
      }),
    ).rejects.toBeInstanceOf(AxiosError)

    expect(showToastSpy).toHaveBeenCalledWith('translated:error.network', undefined, 'error')
  })
})
