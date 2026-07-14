import { loadEnvFile } from 'node:process'

type ServerEnv = NodeJS.ProcessEnv | Record<string, string | undefined>

function readNumber(value: string | undefined, fallback: number) {
  if (!value) return fallback

  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : fallback
}

export function loadServerEnv() {
  try {
    loadEnvFile()
  } catch (error) {
    if (
      error instanceof Error &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      return
    }

    throw error
  }
}

export function resolveServerConfig(env: ServerEnv = process.env) {
  const apiPort = readNumber(env.RESUME_API_PORT, 3001)

  return {
    appStaticDirectory: env.APP_STATIC_DIRECTORY ?? '',
    bucketName: env.MINIO_BUCKET ?? 'resumes',
    databasePath: env.RESUME_DATABASE_PATH ?? 'server/.data/resumes.sqlite',
    localAdmin: {
      email: env.LOCAL_ADMIN_EMAIL ?? '',
      name: env.LOCAL_ADMIN_NAME ?? 'Local Admin',
      password: env.LOCAL_ADMIN_PASSWORD ?? '',
    },
    minio: resolveMinioConfig(env),
    publicApiUrl:
      env.RESUME_API_PUBLIC_URL ?? `http://localhost:${apiPort}`,
    resumeApiHost: env.RESUME_API_HOST ?? '127.0.0.1',
    resumeApiPort: apiPort,
    shareTtlMinutes: readNumber(env.RESUME_SHARE_TTL_MINUTES, 60),
  }
}

export function resolveMinioConfig(env: ServerEnv = process.env) {
  return {
    accessKey:
      env.MINIO_ACCESS_KEY ?? env.MINIO_ROOT_USER ?? 'minioadmin',
    endPoint: env.MINIO_ENDPOINT ?? 'localhost',
    port: readNumber(env.MINIO_PORT, 9000),
    secretKey:
      env.MINIO_SECRET_KEY ?? env.MINIO_ROOT_PASSWORD ?? 'minioadmin',
    useSSL: env.MINIO_USE_SSL === 'true',
  }
}
