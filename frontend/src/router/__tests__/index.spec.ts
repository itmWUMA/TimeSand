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
    expect(routeByName('login')?.meta.shell).toBe(false)
    expect(routeByName('slideshow')?.meta.shell).toBe(false)
    expect(routeByName('slideshow-album')?.meta.shell).toBe(false)
  })

  it('registers login and marks application routes as protected', () => {
    expect(routeByName('login')?.path).toBe('/login')
    expect(routeByName('draw')?.meta.requiresAuth).toBe(true)
    expect(routeByName('albums')?.meta.requiresAuth).toBe(true)
    expect(routeByName('settings-section')?.meta.requiresAuth).toBe(true)
  })

  it('routes settings groups as standalone pages', () => {
    expect(routeByName('settings')?.path).toBe('/settings')
    expect(routeByName('settings')?.redirect).toBe('/settings/storage')
    expect(routeByName('settings-section')?.path).toBe('/settings/:section')
  })

  it('keeps /slideshow and /slideshow/:albumId compatibility routes', () => {
    expect(routeByName('slideshow')?.path).toBe('/slideshow')
    expect(routeByName('slideshow-album')?.path).toBe('/slideshow/:albumId')
  })

  it('renders /slideshow/:albumId directly for fullscreen album slideshows', () => {
    const route = routes.find(item => item.name === 'slideshow-album')

    expect(route).toBeDefined()
    expect(route?.redirect).toBeUndefined()
    expect(route?.component).toBeDefined()
  })
})
