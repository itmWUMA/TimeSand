import type { AxiosError, AxiosResponse } from 'axios'
import axios from 'axios'

import { useToast } from '../composables/useToast'
import i18n from '../i18n'

interface ErrorResponsePayload {
  message?: string
}

function resolveErrorMessage(error: AxiosError<ErrorResponsePayload>): string {
  const { t } = i18n.global
  if (!error.response)
    return t('error.network')

  if (error.response.status === 401 || error.response.status === 403)
    return t('error.permissionDenied')

  if (error.response.status === 404)
    return t('error.notFound')

  if (error.response.status === 413)
    return t('error.fileTooLarge')

  if (error.response.status >= 500)
    return t('error.server')

  const responseMessage = error.response.data?.message
  if (typeof responseMessage === 'string' && responseMessage.trim())
    return responseMessage

  return t('error.unknown')
}

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError<ErrorResponsePayload>) => {
    if (error.response?.status === 401) {
      void import('../stores/auth').then(({ useAuthStore }) => {
        const auth = useAuthStore()
        auth.clearAuth()
      })
      void import('../router').then(({ default: router }) => {
        if (router.currentRoute.value.path !== '/login') {
          void router.push({
            path: '/login',
            query: { redirect: router.currentRoute.value.fullPath },
          })
        }
      })
    }

    const { showToast } = useToast()
    showToast(resolveErrorMessage(error), undefined, 'error')
    return Promise.reject(error)
  },
)

export default api
