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
const routerLinkStub = { template: '<a><slot /></a>' }

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
      items: [
        {
          id: 1,
          name: 'Summer Album',
          description: 'Lake days',
          cover_photo_id: null,
          cover_photo: null,
          photo_count: 12,
          created_at: '2026-05-10T00:00:00Z',
          updated_at: '2026-05-11T00:00:00Z',
        },
      ],
      total: 1,
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
          RouterLink: routerLinkStub,
        },
      },
    })
    await flushPromises()

    await wrapper.get('form').trigger('submit.prevent')
    await wrapper.vm.$nextTick()

    expect(vi.mocked(albumApi.createAlbum)).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Album name is required')
  })

  it('renders exported album toolbar and add album surface with real album cards', async () => {
    const router = createTestRouter()
    await router.push('/upload')
    await router.isReady()

    const wrapper = mountWithI18n(AlbumsPage, {
      global: {
        plugins: [router],
        stubs: {
          RouterLink: routerLinkStub,
        },
      },
    })
    await flushPromises()

    expect(wrapper.find('[data-testid="albums-toolbar"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="album-add-card"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Summer Album')
    expect(wrapper.text()).toContain('12 photos')
  })
})
