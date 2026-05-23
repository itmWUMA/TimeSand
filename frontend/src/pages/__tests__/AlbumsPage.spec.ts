import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { mountWithI18n } from '../../test-utils'
import AlbumsPage from '../AlbumsPage.vue'

vi.mock('../../services/album', () => ({
  createAlbum: vi.fn(),
  listAlbums: vi.fn(),
}))

const albumApi = await import('../../services/album')

describe('albumsPage', () => {
  function createTestRouter() {
    return createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/upload', component: { template: '<div />' } },
      ],
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(albumApi.listAlbums).mockResolvedValue({
      items: [],
      total: 0,
    })
  })

  it('shows validation error when creating album with empty name', async () => {
    const router = createTestRouter()
    await router.push('/upload')
    await router.isReady()

    const wrapper = mountWithI18n(AlbumsPage, {
      global: {
        plugins: [router],
        stubs: {
          RouterLink: true,
        },
      },
    })
    await flushPromises()

    await wrapper.get('form').trigger('submit.prevent')
    await wrapper.vm.$nextTick()

    expect(vi.mocked(albumApi.createAlbum)).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Album name is required')
  })
})
