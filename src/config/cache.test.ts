import { describe, expect, it } from 'vitest'
import { resolveCacheExpirationMs } from './cache'

describe('cache configuration', () => {
  it('reads stale times from Vite environment variables', () => {
    expect(
      resolveCacheExpirationMs({
        VITE_DEFAULT_QUERY_STALE_TIME_MS: '15000',
        VITE_USERS_ROUTE_STALE_TIME_MS: '45000',
      })
    ).toEqual({
      defaultQuery: 15_000,
      usersRouteLoader: 45_000,
    })
  })

  it.each([undefined, '', 'invalid', '0', '-1'])(
    'uses safe defaults for invalid value %s',
    (value) => {
      expect(
        resolveCacheExpirationMs({
          VITE_DEFAULT_QUERY_STALE_TIME_MS: value,
          VITE_USERS_ROUTE_STALE_TIME_MS: value,
        })
      ).toEqual({
        defaultQuery: 10_000,
        usersRouteLoader: 30_000,
      })
    }
  )
})
