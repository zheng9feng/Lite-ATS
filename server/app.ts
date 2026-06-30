import cors from 'cors'
import express, {
  type NextFunction,
  type Request,
  type Response,
} from 'express'
import multer from 'multer'
import {
  type AuthenticatedRequest,
  optionalAuth,
  parseBearerToken,
  requirePermission,
} from './auth/auth-middleware'
import { type Permission, type RoleName } from './auth/auth-types'
import { type createAuthService } from './auth/auth-service'
import { type createJobPositionService } from './job-positions/job-position-service'
import { createInlineContentDisposition } from './resumes/file-name'
import { type createResumeService } from './resumes/resume-service'

type AuthService = ReturnType<typeof createAuthService>
type JobPositionService = ReturnType<typeof createJobPositionService>
type ResumeService = ReturnType<typeof createResumeService>

type CreateServerAppOptions = {
  authService: AuthService
  jobPositionService: JobPositionService
  resumeService: ResumeService
}

const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  storage: multer.memoryStorage(),
})

function requirePdf(file?: Express.Multer.File) {
  if (!file) {
    throw new Error('Please upload a PDF resume.')
  }

  const isPdf =
    file.mimetype === 'application/pdf' ||
    file.originalname.toLowerCase().endsWith('.pdf')

  if (!isPdf) {
    throw new Error('Please upload a PDF file.')
  }

  return file
}

function setResumeFileHeaders(response: Response, resume: { fileName: string }) {
  response.setHeader('Content-Type', 'application/pdf')
  response.setHeader(
    'Content-Disposition',
    createInlineContentDisposition(resume.fileName)
  )
}

function sendError(response: Response, error: unknown) {
  const message =
    error instanceof Error ? error.message : 'Resume API request failed.'
  const status = message.includes('not found')
    ? 404
    : message.includes('expired')
      ? 410
      : 400

  response.status(status).json({ error: message })
}

function readString(value: unknown) {
  return String(value ?? '').trim()
}

function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : []
}

function requireAuthenticated(
  request: AuthenticatedRequest,
  response: Response
) {
  if (!request.auth) {
    response.status(401).json({ error: 'Authentication required.' })
    return false
  }

  return true
}

export function createServerApp({
  authService,
  jobPositionService,
  resumeService,
}: CreateServerAppOptions) {
  const app = express()

  app.use(cors())
  app.use(express.json())
  app.use(optionalAuth(authService))

  app.get('/api/health', (_request, response) => {
    response.json({ ok: true })
  })

  app.post('/api/auth/login', async (request, response) => {
    try {
      response.json(
        await authService.login({
          email: readString(request.body.email),
          password: String(request.body.password ?? ''),
        })
      )
    } catch (error) {
      sendError(response, error)
    }
  })

  app.post('/api/auth/logout', (request, response) => {
    authService.logout(parseBearerToken(request.headers.authorization))
    response.status(204).send()
  })

  app.get('/api/auth/me', (request: AuthenticatedRequest, response) => {
    if (!requireAuthenticated(request, response)) return

    response.json(request.auth)
  })

  app.get(
    '/api/users',
    requirePermission('users:manage'),
    (_request, response) => {
      response.json(authService.listUsers())
    }
  )

  app.post(
    '/api/users',
    requirePermission('users:manage'),
    async (request, response) => {
      try {
        response.status(201).json(
          await authService.createUser({
            email: readString(request.body.email),
            name: readString(request.body.name),
            password: String(request.body.password ?? ''),
            roleIds: readStringArray(request.body.roleIds),
            roles: readStringArray(request.body.roles) as RoleName[],
            status: request.body.status === 'inactive' ? 'inactive' : 'active',
          })
        )
      } catch (error) {
        sendError(response, error)
      }
    }
  )

  app.patch(
    '/api/users/:userId',
    requirePermission('users:manage'),
    async (request, response) => {
      try {
        response.json(
          await authService.updateUser(String(request.params.userId), {
            email: request.body.email
              ? readString(request.body.email)
              : undefined,
            name: request.body.name ? readString(request.body.name) : undefined,
            password: request.body.password
              ? String(request.body.password)
              : undefined,
            status:
              request.body.status === 'active' ||
              request.body.status === 'inactive'
                ? request.body.status
                : undefined,
          })
        )
      } catch (error) {
        sendError(response, error)
      }
    }
  )

  app.delete(
    '/api/users/:userId',
    requirePermission('users:manage'),
    (request, response) => {
      authService.deleteUser(String(request.params.userId))
      response.status(204).send()
    }
  )

  app.put(
    '/api/users/:userId/roles',
    requirePermission('rbac:manage'),
    (request, response) => {
      try {
        authService.setUserRoles(
          String(request.params.userId),
          readStringArray(request.body.roleIds)
        )
        response.status(204).send()
      } catch (error) {
        sendError(response, error)
      }
    }
  )

  app.get(
    '/api/roles',
    requirePermission('rbac:manage'),
    (_request, response) => {
      response.json(authService.listRoles())
    }
  )

  app.post(
    '/api/roles',
    requirePermission('rbac:manage'),
    (request, response) => {
      try {
        response.status(201).json(
          authService.createRole({
            description: readString(request.body.description),
            name: readString(request.body.name),
            permissions: readStringArray(
              request.body.permissions
            ) as Permission[],
          })
        )
      } catch (error) {
        sendError(response, error)
      }
    }
  )

  app.patch(
    '/api/roles/:roleId',
    requirePermission('rbac:manage'),
    (request, response) => {
      try {
        response.json(
          authService.updateRole(String(request.params.roleId), {
            description:
              request.body.description === undefined
                ? undefined
                : readString(request.body.description),
            name:
              request.body.name === undefined
                ? undefined
                : readString(request.body.name),
            permissions: Array.isArray(request.body.permissions)
              ? (readStringArray(request.body.permissions) as Permission[])
              : undefined,
          })
        )
      } catch (error) {
        sendError(response, error)
      }
    }
  )

  app.delete(
    '/api/roles/:roleId',
    requirePermission('rbac:manage'),
    (request, response) => {
      try {
        authService.deleteRole(String(request.params.roleId))
        response.status(204).send()
      } catch (error) {
        sendError(response, error)
      }
    }
  )

  app.get(
    '/api/permissions',
    requirePermission('rbac:manage'),
    (_request, response) => {
      response.json(authService.listPermissions())
    }
  )

  app.put(
    '/api/roles/:roleId/permissions',
    requirePermission('rbac:manage'),
    (request, response) => {
      try {
        authService.setRolePermissions(
          String(request.params.roleId),
          readStringArray(request.body.permissions) as Permission[]
        )
        response.status(204).send()
      } catch (error) {
        sendError(response, error)
      }
    }
  )

  app.get(
    '/api/job-positions',
    requirePermission('job-positions:read'),
    (_request, response) => {
      try {
        response.json(jobPositionService.listJobPositions())
      } catch (error) {
        sendError(response, error)
      }
    }
  )

  app.get(
    '/api/job-positions/active',
    requirePermission('job-positions:read'),
    (_request, response) => {
      try {
        response.json(jobPositionService.listActiveJobPositions())
      } catch (error) {
        sendError(response, error)
      }
    }
  )

  app.post(
    '/api/job-positions',
    requirePermission('job-positions:manage'),
    (request, response) => {
      try {
        response.status(201).json(
          jobPositionService.createJobPosition({
            department: readString(request.body.department),
            description: readString(request.body.description),
            location: readString(request.body.location),
            status:
              request.body.status === 'inactive' ? 'inactive' : 'active',
            title: readString(request.body.title),
          })
        )
      } catch (error) {
        sendError(response, error)
      }
    }
  )

  app.patch(
    '/api/job-positions/:jobPositionId',
    requirePermission('job-positions:manage'),
    (request, response) => {
      try {
        response.json(
          jobPositionService.updateJobPosition(
            String(request.params.jobPositionId),
            {
              department:
                request.body.department === undefined
                  ? undefined
                  : readString(request.body.department),
              description:
                request.body.description === undefined
                  ? undefined
                  : readString(request.body.description),
              location:
                request.body.location === undefined
                  ? undefined
                  : readString(request.body.location),
              status:
                request.body.status === 'active' ||
                request.body.status === 'inactive'
                  ? request.body.status
                  : undefined,
              title:
                request.body.title === undefined
                  ? undefined
                  : readString(request.body.title),
            }
          )
        )
      } catch (error) {
        sendError(response, error)
      }
    }
  )

  app.delete(
    '/api/job-positions/:jobPositionId',
    requirePermission('job-positions:manage'),
    (request, response) => {
      try {
        jobPositionService.deleteJobPosition(
          String(request.params.jobPositionId)
        )
        response.status(204).send()
      } catch (error) {
        sendError(response, error)
      }
    }
  )

  app.get(
    '/api/resumes',
    requirePermission('resumes:read'),
    (_request, response) => {
      try {
        response.json(resumeService.listResumes())
      } catch (error) {
        sendError(response, error)
      }
    }
  )

  app.get(
    '/api/resumes/summary',
    requirePermission('resumes:read'),
    (_request, response) => {
      try {
        response.json(resumeService.getResumeSummary())
      } catch (error) {
        sendError(response, error)
      }
    }
  )

  app.post(
    '/api/resumes',
    requirePermission('resumes:create'),
    upload.single('resume'),
    async (request: Request, response: Response) => {
      try {
        const file = requirePdf(request.file)
        const resume = await resumeService.addResume({
          applicant: {
            email: readString(request.body.email),
            name: readString(request.body.name),
            positionApplied: readString(request.body.positionApplied),
          },
          file: {
            buffer: file.buffer,
            mimetype: file.mimetype,
            originalname: file.originalname,
            size: file.size,
          },
          jobPositionId: readString(request.body.jobPositionId) || null,
        })

        response.status(201).json(resume)
      } catch (error) {
        sendError(response, error)
      }
    }
  )

  app.patch(
    '/api/resumes/:resumeId',
    requirePermission('resumes:update'),
    upload.single('resume'),
    async (request: Request, response: Response) => {
      try {
        const file = request.file ? requirePdf(request.file) : undefined
        const resume = await resumeService.updateResume(
          String(request.params.resumeId),
          {
            applicant: {
              email: readString(request.body.email),
              name: readString(request.body.name),
              positionApplied: readString(request.body.positionApplied),
            },
            file: file
              ? {
                  buffer: file.buffer,
                  mimetype: file.mimetype,
                  originalname: file.originalname,
                  size: file.size,
                }
              : undefined,
            jobPositionId:
              request.body.jobPositionId === undefined
                ? undefined
                : readString(request.body.jobPositionId) || null,
          }
        )

        response.json(resume)
      } catch (error) {
        sendError(response, error)
      }
    }
  )

  app.delete(
    '/api/resumes/:resumeId',
    requirePermission('resumes:delete'),
    async (request, response) => {
      try {
        await resumeService.deleteResume(String(request.params.resumeId))
        response.status(204).send()
      } catch (error) {
        sendError(response, error)
      }
    }
  )

  app.get(
    '/api/resumes/:resumeId/file',
    requirePermission('resumes:read'),
    async (request, response) => {
      try {
        const { resume, stream } = await resumeService.getResumeFile(
          String(request.params.resumeId)
        )

        setResumeFileHeaders(response, resume)
        stream.pipe(response)
      } catch (error) {
        sendError(response, error)
      }
    }
  )

  app.post(
    '/api/resumes/:resumeId/share',
    requirePermission('resumes:share'),
    (request, response) => {
      try {
        response.json(
          resumeService.createShareLink(String(request.params.resumeId))
        )
      } catch (error) {
        sendError(response, error)
      }
    }
  )

  app.get('/api/resume-shares/:token', async (request, response) => {
    try {
      const { resume, stream } = await resumeService.getSharedResumeFile(
        request.params.token
      )

      setResumeFileHeaders(response, resume)
      stream.pipe(response)
    } catch (error) {
      sendError(response, error)
    }
  })

  app.use(
    (
      error: unknown,
      _request: Request,
      response: Response,
      _next: NextFunction
    ) => {
      sendError(response, error)
    }
  )

  return app
}
