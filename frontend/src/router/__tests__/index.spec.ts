import { describe, expect, it } from 'vitest'
import router from '../index'

describe('router', () => {
  it('registers onboarding debug route', () => {
    const route = router.getRoutes().find(item => item.name === 'onboarding-debug')

    expect(route).toBeDefined()
    expect(route?.path).toBe('/debug/onboarding')
  })
})
