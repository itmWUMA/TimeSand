import { flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { mountWithI18n } from '../../test-utils'
import HomePage from '../HomePage.vue'

const {
  collectScatterMock,
  drawNextCardMock,
  openScatterMock,
  reshuffleMock,
  stateRefs,
  undoLastCardMock,
} = vi.hoisted(() => ({
  collectScatterMock: vi.fn(),
  drawNextCardMock: vi.fn(),
  openScatterMock: vi.fn(),
  reshuffleMock: vi.fn(),
  stateRefs: {} as { isScatterOpen?: { value: boolean } },
  undoLastCardMock: vi.fn(),
}))

vi.mock('gsap', () => ({
  gsap: {
    killTweensOf: vi.fn(),
    fromTo: vi.fn((_target, _fromVars, toVars) => {
      toVars?.onComplete?.()
      return {
        kill: vi.fn(),
        pause: vi.fn(),
        resume: vi.fn(),
      }
    }),
    set: vi.fn(),
    to: vi.fn((_target, vars) => {
      vars?.onComplete?.()
      return {}
    }),
  },
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({
    name: 'draw',
  }),
}))

vi.mock('../../composables/motion/sequences', () => ({
  particleDrift: vi.fn(() => ({
    kill: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
  })),
}))

vi.mock('../../composables/useCardDraw', async () => {
  const vue = await vi.importActual<typeof import('vue')>('vue')

  return {
    useCardDraw: () => {
      const isScatterOpen = vue.ref(false)
      stateRefs.isScatterOpen = isScatterOpen

      return {
        activeCard: vue.ref(null),
        ceremonyState: vue.ref('IDLE'),
        collectScatter: collectScatterMock,
        drawNextCard: drawNextCardMock,
        drawnCards: vue.ref([]),
        errorMessage: vue.ref(null),
        hasDrawnCards: vue.ref(true),
        isDrawing: vue.ref(false),
        isScatterOpen,
        killCeremony: vi.fn(),
        lastWeightReason: vue.ref('4_years_ago_today'),
        openScatter: openScatterMock,
        pileCards: vue.ref([]),
        poolEmpty: vue.ref(false),
        reshuffle: reshuffleMock,
        undoLastCard: undoLastCardMock,
      }
    },
  }
})

vi.mock('../../composables/useMusicPlayer', () => ({
  useMusicPlayer: () => ({
    playlistId: ref(null),
    setContext: vi.fn(),
    tracks: ref([]),
  }),
}))

vi.mock('../../services/album', () => ({
  listAlbums: vi.fn(),
}))

vi.mock('../../services/photo', () => ({
  listPhotos: vi.fn(),
}))

const albumApi = await import('../../services/album')
const photoApi = await import('../../services/photo')

describe('homePage draw surface', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    stateRefs.isScatterOpen = undefined

    vi.mocked(albumApi.listAlbums).mockResolvedValue({
      items: [
        {
          id: 5,
          name: 'Qinghai',
          description: null,
          cover_photo_id: null,
          cover_photo: null,
          photo_count: 8,
          created_at: '2026-05-01T00:00:00Z',
          updated_at: '2026-05-01T00:00:00Z',
        },
      ],
      total: 1,
    })

    vi.mocked(photoApi.listPhotos).mockResolvedValue({
      items: [],
      page: 1,
      page_size: 1,
      total: 1248,
    })
  })

  it('renders the exported draw stage with album picker, arena metadata, and desktop keyboard hints', async () => {
    const wrapper = mountWithI18n(HomePage)
    await flushPromises()

    expect(wrapper.find('[data-draw-stage]').exists()).toBe(true)
    expect(wrapper.find('[data-draw-arena]').exists()).toBe(true)
    expect(wrapper.get('[data-draw-album-picker]').text()).toContain('All photos')
    expect(wrapper.get('[data-draw-album-picker]').text()).toContain('1,248')
    expect(wrapper.get('[data-draw-today-panel]').text()).toContain('4 years ago today')
    expect(wrapper.get('[data-draw-keyboard-hints]').text()).toContain('Space')
    expect(wrapper.get('[data-draw-mobile-gesture-hint]').text()).toContain('Swipe left')

    wrapper.unmount()
  })

  it('maps desktop keyboard actions to draw, history, and scatter controls', async () => {
    const wrapper = mountWithI18n(HomePage)
    await flushPromises()

    await window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }))
    expect(drawNextCardMock).toHaveBeenCalledTimes(1)

    await window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowLeft' }))
    expect(undoLastCardMock).toHaveBeenCalledTimes(1)

    await window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight' }))
    expect(drawNextCardMock).toHaveBeenCalledTimes(2)

    stateRefs.isScatterOpen!.value = true
    await window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape' }))
    expect(collectScatterMock).toHaveBeenCalledTimes(1)

    wrapper.unmount()
  })
})
