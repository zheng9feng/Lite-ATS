import { loadServerEnv, resolveServerConfig } from './config'
import { createServerApp } from './app'
import { createAuthService } from './auth/auth-service'
import { hashPassword } from './auth/password'
import { createSqliteAuthRepository } from './auth/sqlite-auth-repository'
import { createMinioStorage } from './resumes/minio-storage'
import { createResumeService } from './resumes/resume-service'
import { migrateResumeDatabase } from './resumes/sqlite-resume-migrations'
import { createSqliteResumeRepository } from './resumes/sqlite-resume-repository'

loadServerEnv()

const {
  bucketName,
  databasePath,
  localAdmin,
  minio,
  publicApiUrl,
  resumeApiPort,
  shareTtlMinutes,
} = resolveServerConfig()

await migrateResumeDatabase({ databasePath })

const authRepository = createSqliteAuthRepository({ databasePath })
const authService = createAuthService({ repository: authRepository })

if (localAdmin.email && localAdmin.password) {
  const existingAdmin = authRepository.findUserByEmail(localAdmin.email)
  const adminRole = authRepository.findRoleByName('admin')

  if (!existingAdmin && adminRole) {
    const admin = authRepository.createUser({
      email: localAdmin.email,
      name: localAdmin.name,
      passwordHash: await hashPassword(localAdmin.password),
      status: 'active',
    })
    authRepository.setUserRoles(admin.id, [adminRole.id])
  }
}

const app = createServerApp({
  authService,
  resumeService: createResumeService({
    bucketName,
    publicApiUrl,
    repository: createSqliteResumeRepository({ databasePath }),
    shareTtlMs: shareTtlMinutes * 60 * 1000,
    storage: createMinioStorage(minio),
  }),
})

app.listen(resumeApiPort, () => {
  process.stdout.write(
    `Resume API listening on http://localhost:${resumeApiPort}\n`
  )
})
