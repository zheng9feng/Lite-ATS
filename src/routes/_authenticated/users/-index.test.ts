import { cacheExpirationMs } from '@/config/cache'
import { describe, expect, it } from 'vitest'
import { Route } from './index'

describe('users route loader', () => {
  it('keeps loaded and preloaded data fresh long enough to prevent request loops', () => {
    expect(Route.options.staleTime).toBe(cacheExpirationMs.usersRouteLoader)
    expect(Route.options.preloadStaleTime).toBe(
      cacheExpirationMs.usersRouteLoader
    )
  })
})
