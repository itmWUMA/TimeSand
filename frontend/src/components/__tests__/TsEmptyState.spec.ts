import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import TsEmptyState from '../TsEmptyState.vue'

const { routerPush, fadeIn } = vi.hoisted(() => ({
  routerPush: vi.fn(),
  fadeIn: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: routerPush }),
}))

vi.mock('../../composables/motion/transitions', () => ({
  fadeIn,
}))

describe('tsEmptyState', () => {
  beforeEach(() => {
    routerPush.mockReset()
    fadeIn.mockReset()
  })

  it('renders icon and title', () => {
    const wrapper = mount(TsEmptyState, {
      props: {
        title: 'No items',
      },
    })

    expect(wrapper.find('[data-testid="empty-state-icon"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('No items')
  })

  it('renders description when provided', () => {
    const wrapper = mount(TsEmptyState, {
      props: {
        title: 'No items',
        description: 'Add some items',
      },
    })

    expect(wrapper.text()).toContain('Add some items')
  })

  it('does not render description when not provided', () => {
    const wrapper = mount(TsEmptyState, {
      props: {
        title: 'No items',
      },
    })

    expect(wrapper.text()).not.toContain('Add some items')
    expect(wrapper.find('p').exists()).toBe(false)
  })

  it('renders action button when actionLabel and actionTo are provided', () => {
    const wrapper = mount(TsEmptyState, {
      props: {
        title: 'No items',
        actionLabel: 'Upload',
        actionTo: '/upload',
      },
    })

    expect(wrapper.find('button').exists()).toBe(true)
    expect(wrapper.find('button').text()).toContain('Upload')
  })

  it('navigates on action button click', async () => {
    const wrapper = mount(TsEmptyState, {
      props: {
        title: 'No items',
        actionLabel: 'Upload',
        actionTo: '/upload',
      },
    })

    await wrapper.find('button').trigger('click')
    expect(routerPush).toHaveBeenCalledWith('/upload')
  })

  it('emits action event on action button click', async () => {
    const wrapper = mount(TsEmptyState, {
      props: {
        title: 'No items',
        actionLabel: 'Upload',
        actionTo: '/upload',
      },
    })

    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('action')).toHaveLength(1)
  })

  it('does not render action button when action info is incomplete', () => {
    const withoutLabel = mount(TsEmptyState, {
      props: {
        title: 'No items',
        actionTo: '/upload',
      },
    })
    expect(withoutLabel.find('button').exists()).toBe(false)

    const withoutTarget = mount(TsEmptyState, {
      props: {
        title: 'No items',
        actionLabel: 'Upload',
      },
    })
    expect(withoutTarget.find('button').exists()).toBe(false)
  })

  it('runs fadeIn on mount', () => {
    mount(TsEmptyState, {
      props: {
        title: 'No items',
      },
    })

    expect(fadeIn).toHaveBeenCalledTimes(1)
    expect(fadeIn.mock.calls[0]?.[1]).toEqual({ distance: 12, duration: 0.4 })
  })
})
