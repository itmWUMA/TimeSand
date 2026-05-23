import { describe, expect, it } from 'vitest'
import router, { routes } from '../index'

function routeByName(name: string) {
  return router.getRoutes().find(item => item.name === name)
}

describe('router', () => {
  it('registers onboarding debug route', () => {
    const route = routeByName('onboarding-debug')

    expect(route).toBeDefined()
    expect(route?.path).toBe('/debug/onboarding')
  })

  it('exposes /draw as the canonical card draw route', () => {
    const route = routeByName('draw')

    expect(route).toBeDefined()
    expect(route?.path).toBe('/draw')
  })

  it('keeps the landing and slideshow routes outside the app shell', () => {
    expect(routeByName('landing')?.meta.shell).toBe(false)
    expect(routeByName('slideshow')?.meta.shell).toBe(false)
  })

  it('keeps /slideshow and /slideshow/:albumId compatibility routes', () => {
    expect(routeByName('slideshow')?.path).toBe('/slideshow')
    expect(routeByName('slideshow-album')?.path).toBe('/slideshow/:albumId')
  })

  it('redirects /slideshow/:albumId to the existing query contract', () => {
    const route = routes.find(item => item.name === 'slideshow-album')

    expect(route).toBeDefined()
    expect(typeof route?.redirect).toBe('function')

    const redirect = route?.redirect
    if (typeof redirect !== 'function') {
      throw new TypeError('slideshow-album redirect is missing')
    }

    expect(redirect({ params: { albumId: '42' } } as never, {} as never)).toEqual({
      path: '/slideshow',
      query: { album_id: '42' },
    })
  })
})
