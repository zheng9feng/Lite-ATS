import cors from 'cors'
import express, {
  type NextFunction,
  type Request,
  type Response,
} from 'express'
import multer from 'multer'
import { loadServerEnv, resolveServerConfig } from './config'
import { createInlineContentDisposition } from './resumes/file-name'
import { createMinioStorage } from './resumes/minio-storage'
import { createResumeService } from './resumes/resume-service'
import { migrateResumeDatabase } from './resumes/sqlite-resume-migrations'
import { createSqliteResumeRepository } from './resumes/sqlite-resume-repository'

loadServerEnv()

const {
  bucketName,
  databasePath,
  minio,
  publicApiUrl,
  resumeApiPort,
  shareTtlMinutes,
} = resolveServerConfig()

const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  storage: multer.memoryStorage(),
})

const app = express()
app.use(cors())

await migrateResumeDatabase({ databasePath })

const resumeService = createResumeService({
  bucketName,
  publicApiUrl,
  repository: createSqliteResumeRepository({ databasePath }),
  shareTtlMs: shareTtlMinutes * 60 * 1000,
  storage: createMinioStorage(minio),
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

app.get('/api/health', (_request, response) => {
  response.json({ ok: true })
})

app.get('/api/resumes', (_request, response) => {
  try {
    response.json(resumeService.listResumes())
  } catch (error) {
    sendError(response, error)
  }
})

app.post(
  '/api/resumes',
  upload.single('resume'),
  async (request: Request, response: Response) => {
    try {
      const file = requirePdf(request.file)
      const resume = await resumeService.addResume({
        applicant: {
          email: String(request.body.email ?? '').trim(),
          name: String(request.body.name ?? '').trim(),
          positionApplied: String(request.body.positionApplied ?? '').trim(),
        },
        file: {
          buffer: file.buffer,
          mimetype: file.mimetype,
          originalname: file.originalname,
          size: file.size,
        },
      })

      response.status(201).json(resume)
    } catch (error) {
      sendError(response, error)
    }
  }
)

app.get('/api/resumes/:resumeId/file', async (request, response) => {
  try {
    const { resume, stream } = await resumeService.getResumeFile(
      request.params.resumeId
    )

    setResumeFileHeaders(response, resume)
    stream.pipe(response)
  } catch (error) {
    sendError(response, error)
  }
})

app.post('/api/resumes/:resumeId/share', (request, response) => {
  try {
    response.json(resumeService.createShareLink(request.params.resumeId))
  } catch (error) {
    sendError(response, error)
  }
})

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

app.listen(resumeApiPort, () => {
  process.stdout.write(
    `Resume API listening on http://localhost:${resumeApiPort}\n`
  )
})
