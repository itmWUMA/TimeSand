import type { User } from '../types/auth'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import * as authService from '../services/auth'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const initialized = ref(false)
  const isLoading = ref(false)
  const isUninitialized = ref(false)

  const isAuthenticated = computed(() => user.value != null)
  const isAdmin = computed(() => user.value?.role === 'admin')

  function setUser(nextUser: User | null): void {
    user.value = nextUser
    isUninitialized.value = false
  }

  function clearAuth(): void {
    user.value = null
  }

  async function fetchMe(): Promise<User | null> {
    isLoading.value = true
    try {
      const currentUser = await authService.fetchMe()
      setUser(currentUser)
      return currentUser
    }
    catch (error) {
      const status = (error as { response?: { status?: number } }).response?.status
      clearAuth()
      isUninitialized.value = status === 503
      return null
    }
    finally {
      initialized.value = true
      isLoading.value = false
    }
  }

  async function login(payload: {
    username: string
    password: string
    remember_me: boolean
  }): Promise<User> {
    isLoading.value = true
    try {
      const response = await authService.login(payload)
      setUser(response.user)
      initialized.value = true
      return response.user
    }
    finally {
      isLoading.value = false
    }
  }

  async function updateDisplayName(displayName: string): Promise<User> {
    const updated = await authService.updateProfile({ display_name: displayName })
    setUser(updated)
    return updated
  }

  async function logout(): Promise<void> {
    try {
      await authService.logout()
    }
    finally {
      clearAuth()
    }
  }

  return {
    user,
    initialized,
    isLoading,
    isUninitialized,
    isAuthenticated,
    isAdmin,
    setUser,
    clearAuth,
    fetchMe,
    login,
    updateDisplayName,
    logout,
  }
})
