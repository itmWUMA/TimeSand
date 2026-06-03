import { flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createRouter, createWebHistory } from 'vue-router'

import { login } from '../../services/auth'
import { mountWithI18n } from '../../test-utils'
import LoginPage from '../LoginPage.vue'

vi.mock('../../services/auth', () => ({
  fetchMe: vi.fn().mockRejectedValue({ response: { status: 401 } }),
  login: vi.fn(),
  logout: vi.fn(),
}))

describe('loginPage', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  function mountPage() {
    const router = createRouter({
      history: createWebHistory(),
      routes: [
        { path: '/', component: { template: '<div>landing</div>' } },
        { path: '/login', component: LoginPage },
        { path: '/draw', component: { template: '<div>draw</div>' } },
      ],
    })

    return mountWithI18n(LoginPage, {
      global: {
        plugins: [createPinia(), router],
      },
      attachTo: document.body,
    })
  }

  it('renders the TimeSand login form from the static design reference', () => {
    const wrapper = mountPage()

    expect(wrapper.find('[data-testid="login-page"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('TimeSand')
    expect(wrapper.text()).toContain('Draw Memories Back')
    expect(wrapper.find('input[autocomplete="username"]').exists()).toBe(true)
    expect(wrapper.find('input[autocomplete="current-password"]').exists()).toBe(true)
    expect(wrapper.get('button[type="submit"]').text()).toContain('Sign In')

    wrapper.unmount()
  })

  it('submits username, password, and remember me through the auth store', async () => {
    vi.mocked(login).mockResolvedValue({
      user: {
        id: 1,
        username: 'admin',
        display_name: 'Admin',
        role: 'admin',
        is_active: true,
      },
    })
    const wrapper = mountPage()

    await wrapper.get('input[autocomplete="username"]').setValue('admin')
    await wrapper.get('input[autocomplete="current-password"]').setValue('timesand123')
    await wrapper.get('input[type="checkbox"]').setValue(true)
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(login).toHaveBeenCalledWith({
      username: 'admin',
      password: 'timesand123',
      remember_me: true,
    })

    wrapper.unmount()
  })

  it('replaces the form with an uninitialized system notice after a 503', async () => {
    vi.mocked(login).mockRejectedValue({ response: { status: 503 } })
    const wrapper = mountPage()

    await wrapper.get('input[autocomplete="username"]').setValue('admin')
    await wrapper.get('input[autocomplete="current-password"]').setValue('timesand123')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('System Not Initialized')
    expect(wrapper.text()).toContain('TIMESAND_ADMIN_PASSWORD')
    expect(wrapper.find('form').exists()).toBe(false)

    wrapper.unmount()
  })
})
