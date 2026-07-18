type CacheEnv = {
  VITE_DEFAULT_QUERY_STALE_TIME_MS?: string
  VITE_USERS_ROUTE_STALE_TIME_MS?: string
}

const defaultCacheExpirationMs = {
  defaultQuery: 10_000,
  usersRouteLoader: 30_000,
} as const

function readPositiveMilliseconds(value: string | undefined, fallback: number) {
  if (!value) return fallback

  const parsed = Number(value)

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export function resolveCacheExpirationMs(env: CacheEnv) {
  return {
    defaultQuery: readPositiveMilliseconds(
      env.VITE_DEFAULT_QUERY_STALE_TIME_MS,
      defaultCacheExpirationMs.defaultQuery
    ),
    usersRouteLoader: readPositiveMilliseconds(
      env.VITE_USERS_ROUTE_STALE_TIME_MS,
      defaultCacheExpirationMs.usersRouteLoader
    ),
  }
}

export const cacheExpirationMs = resolveCacheExpirationMs(import.meta.env)
