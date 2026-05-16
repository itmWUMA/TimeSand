import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountWithI18n } from '../../test-utils'
import AlbumDetailPage from '../AlbumDetailPage.vue'

vi.mock('vue-router', () => ({
  useRoute: () => ({
    params: { id: '1' },
  }),
}))

vi.mock('../../services/album', () => ({
  addPhotosToAlbum: vi.fn(),
  getAlbum: vi.fn(),
  removePhotoFromAlbum: vi.fn(),
  updateAlbum: vi.fn(),
}))

vi.mock('../../services/photo', () => ({
  listPhotos: vi.fn(),
}))

vi.mock('../../services/tag', () => ({
  addTagsToPhoto: vi.fn(),
  createTag: vi.fn(),
  listPhotoTags: vi.fn(),
  listTags: vi.fn(),
  removeTagFromPhoto: vi.fn(),
}))

const albumApi = await import('../../services/album')
const photoApi = await import('../../services/photo')
const tagApi = await import('../../services/tag')

function buildPhoto(id: number) {
  return {
    id,
    filename: `photo-${id}.jpg`,
    file_path: `${id}.jpg`,
    thumbnail_path: `${id}_thumb.jpg`,
    file_size: 1024,
    width: 640,
    height: 480,
    taken_at: null,
    latitude: null,
    longitude: null,
    uploaded_at: '2026-05-10T00:00:00Z',
    mime_type: 'image/jpeg',
  }
}

function mountPage() {
  return mountWithI18n(AlbumDetailPage, {
    global: {
      stubs: {
        RouterLink: true,
        TagManager: true,
        TsLightbox: true,
      },
    },
  })
}

describe('albumDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(albumApi.getAlbum).mockResolvedValue({
      id: 1,
      name: 'Summer Album',
      description: null,
      cover_photo_id: null,
      cover_photo: null,
      photo_count: 0,
      created_at: '2026-05-10T00:00:00Z',
      updated_at: '2026-05-10T00:00:00Z',
    })
    vi.mocked(albumApi.addPhotosToAlbum).mockResolvedValue(undefined)
    vi.mocked(albumApi.removePhotoFromAlbum).mockResolvedValue(undefined)
    vi.mocked(albumApi.updateAlbum).mockImplementation(async (_albumId, payload) => ({
      id: 1,
      name: payload.name,
      description: payload.description,
      cover_photo_id: payload.cover_photo_id,
      cover_photo: null,
      photo_count: 0,
      created_at: '2026-05-10T00:00:00Z',
      updated_at: '2026-05-10T00:00:00Z',
    }))
    vi.mocked(tagApi.listTags).mockResolvedValue({ items: [] })
    vi.mocked(tagApi.listPhotoTags).mockResolvedValue({ items: [] })
    vi.mocked(tagApi.addTagsToPhoto).mockResolvedValue(undefined)
    vi.mocked(tagApi.removeTagFromPhoto).mockResolvedValue(undefined)
    vi.mocked(tagApi.createTag).mockResolvedValue({ id: 1, name: 'travel' })
  })

  it('renders add-photos options as unique ids', async () => {
    vi.mocked(photoApi.listPhotos)
      .mockResolvedValueOnce({
        items: [],
        total: 0,
        page: 1,
        page_size: 100,
      })
      .mockResolvedValueOnce({
        items: [buildPhoto(1), buildPhoto(1), buildPhoto(2)],
        total: 3,
        page: 1,
        page_size: 100,
      })

    const wrapper = mountPage()
    await flushPromises()
    await flushPromises()

    const selects = wrapper.findAll('select')
    const addPhotoSelect = selects[1]
    const photoOptionValues = addPhotoSelect
      .findAll('option')
      .map(option => Number(option.attributes('value')))
      .filter(value => value > 0)

    expect(photoOptionValues).toEqual([1, 2])
  })

  it('loads additional photo pages when total exceeds first page size', async () => {
    vi.mocked(photoApi.listPhotos).mockImplementation(async (page = 1, pageSize = 20, filters = {}) => {
      if (filters.albumId === 1) {
        return {
          items: [],
          total: 0,
          page,
          page_size: pageSize,
        }
      }

      if (page === 1) {
        return {
          items: Array.from({ length: 100 }, (_, index) => buildPhoto(index + 1)),
          total: 150,
          page,
          page_size: pageSize,
        }
      }

      return {
        items: Array.from({ length: 50 }, (_, index) => buildPhoto(index + 101)),
        total: 150,
        page,
        page_size: pageSize,
      }
    })

    const wrapper = mountPage()
    await flushPromises()
    await flushPromises()

    const calledPageTwo = vi.mocked(photoApi.listPhotos).mock.calls.some(
      ([page, pageSize, filters]) => page === 2 && pageSize === 100 && !filters?.albumId,
    )
    const selects = wrapper.findAll('select')
    const addPhotoSelect = selects[1]
    const optionCount = addPhotoSelect.findAll('option').length

    expect(calledPageTwo).toBe(true)
    expect(optionCount).toBe(151)
  })
})
