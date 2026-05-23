import { beforeEach, describe, expect, it, vi } from 'vitest'

const postSpy = vi.hoisted(() => vi.fn())

vi.mock('../api', () => ({
  default: {
    post: postSpy,
  },
}))

const { uploadPhotos } = await import('../photo')

describe('photo service', () => {
  beforeEach(() => {
    postSpy.mockReset()
    postSpy.mockResolvedValue({ data: { photos: [] } })
  })

  it('forwards upload progress and abort signal to the photo upload request', async () => {
    const controller = new AbortController()

    const photos = await uploadPhotos(
      [new File(['image'], 'memory.heic', { type: 'image/heic' })],
      () => {},
      controller.signal,
    )

    expect(photos).toEqual([])
    expect(postSpy).toHaveBeenCalledWith('/photos/upload', expect.any(FormData), {
      onUploadProgress: expect.any(Function),
      signal: controller.signal,
    })
  })
})
