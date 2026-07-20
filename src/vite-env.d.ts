/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEFAULT_QUERY_STALE_TIME_MS?: string
  readonly VITE_RESUME_API_BASE_URL?: string
  readonly VITE_TURNSTILE_SITE_KEY?: string
  readonly VITE_USERS_ROUTE_STALE_TIME_MS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
