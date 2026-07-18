/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEFAULT_QUERY_STALE_TIME_MS?: string
  readonly VITE_USERS_ROUTE_STALE_TIME_MS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
