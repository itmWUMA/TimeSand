import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import App from '../src/App.vue'

const routes = [
  { path: '/', component: { template: '<div>Home</div>' } },
  { path: '/albums', component: { template: '<div>Albums</div>' } },
  { path: '/albums/:id', component: { template: '<div>Album Detail</div>' } },
  { path: '/upload', component: { template: '<div>Upload</div>' } },
  { path: '/music', component: { template: '<div>Music</div>' } },
  { path: '/slideshow', component: { template: '<div>Slideshow</div>' } },
  { path: '/settings', component: { template: '<div>Settings</div>' } },
]

describe('app', () => {
  it('renders default layout container', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes,
    })

    await router.push('/')
    await router.isReady()

    const wrapper = mount(App, {
      global: {
        plugins: [router],
      },
    })

    expect(wrapper.find('[data-testid=\'default-layout\']').exists()).toBe(true)
  })
})
