import type { Music } from '../../types/music'
import { mount } from '@vue/test-utils'

import { describe, expect, it } from 'vitest'
import PlaylistEditor from '../PlaylistEditor.vue'

const tracks: Music[] = [
  {
    id: 1,
    title: 'Track One',
    artist: 'Artist A',
    filename: 'one.wav',
    file_path: 'one.wav',
    file_size: 1024,
    duration: 60,
    mime_type: 'audio/wav',
    uploaded_at: '2026-04-06T12:00:00Z',
  },
  {
    id: 2,
    title: 'Track Two',
    artist: 'Artist B',
    filename: 'two.wav',
    file_path: 'two.wav',
    file_size: 2048,
    duration: 90,
    mime_type: 'audio/wav',
    uploaded_at: '2026-04-06T12:01:00Z',
  },
]

describe('playlistEditor', () => {
  it('renders track list and allows removal', async () => {
    const wrapper = mount(PlaylistEditor, {
      props: {
        tracks,
      },
    })

    expect(wrapper.text()).toContain('Track One')
    expect(wrapper.text()).toContain('Track Two')

    await wrapper.get('[data-testid="remove-track-1"]').trigger('click')
    expect(wrapper.emitted('removeTrack')?.[0]).toEqual([1])
  })
})
