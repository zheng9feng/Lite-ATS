import { useEffect, useMemo, useState } from 'react'
import { z } from 'zod'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { type TFunction } from 'i18next'
import { FileUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { SelectDropdown } from '@/components/select-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import {
  listActiveJobPositions,
  type JobPosition,
} from '@/features/job-positions/data/job-positions-api'
import { uploadResume, uploadResumeBatch } from '../data/resume-api'
import { useResumeStore } from '../data/resume-store'
import { ResumeFileInput } from './resume-file-input'

function createResumeUploadFormSchema(t: TFunction) {
  return z
    .object({
      email: z.string().trim().optional().default(''),
      file: z.instanceof(FileList).refine((files) => files.length > 0, {
        message: t('resumes.form.validation.resumeFiles'),
      }),
      jobPositionId: z.string().trim().optional().default(''),
      name: z.string().trim().optional().default(''),
      positionApplied: z.string().trim().optional().default(''),
    })
    .superRefine((values, context) => {
      const files = fileListToArray(values.file)
      const isBulkUpload = files.length > 0 && !isSinglePdfUpload(files)

      if (files.length > 20) {
        context.addIssue({
          code: 'custom',
          message: t('resumes.form.validation.maxFiles'),
          path: ['file'],
        })
      }

      if (!isValidResumeFileSelection(files)) {
        context.addIssue({
          code: 'custom',
          message: t('resumes.form.validation.fileSelection'),
          path: ['file'],
        })
      }

      if (isBulkUpload) {
        return
      }

      if (!values.jobPositionId.trim()) {
        context.addIssue({
          code: 'custom',
          message: t('resumes.form.validation.positionApplied'),
          path: ['jobPositionId'],
        })
      }

      if (!values.name.trim()) {
        context.addIssue({
          code: 'custom',
          message: t('resumes.form.validation.applicantName'),
          path: ['name'],
        })
      }

      if (!z.string().email().safeParse(values.email.trim()).success) {
        context.addIssue({
          code: 'custom',
          message: t('resumes.form.validation.email'),
          path: ['email'],
        })
      }
    })
}

type ResumeUploadFormInput = z.input<
  ReturnType<typeof createResumeUploadFormSchema>
>
type ResumeUploadForm = z.output<
  ReturnType<typeof createResumeUploadFormSchema>
>

function isPdf(file?: File) {
  if (!file) return false

  return (
    file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  )
}

function isZip(file?: File) {
  if (!file) return false

  return (
    file.type === 'application/zip' ||
    file.type === 'application/x-zip-compressed' ||
    file.name.toLowerCase().endsWith('.zip')
  )
}

function fileListToArray(files?: FileList) {
  return Array.from(files ?? [])
}

function isSinglePdfUpload(files: File[]) {
  return files.length === 1 && isPdf(files[0])
}

function isValidResumeFileSelection(files: File[]) {
  const zipCount = files.filter((file) => isZip(file)).length

  if (zipCount > 0) {
    return files.length === 1 && zipCount === 1
  }

  return files.every((file) => isPdf(file))
}

export function ResumeUploadPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const addResume = useResumeStore((state) => state.addResume)
  const addResumes = useResumeStore((state) => state.addResumes)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const formSchema = useMemo(() => createResumeUploadFormSchema(t), [t])
  const form = useForm<ResumeUploadFormInput, unknown, ResumeUploadForm>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      file: undefined,
      jobPositionId: '',
      name: '',
      positionApplied: '',
    },
  })
  const [jobPositions, setJobPositions] = useState<JobPosition[]>([])
  const [isLoadingJobPositions, setIsLoadingJobPositions] = useState(true)
  const fileRef = form.register('file')
  const selectedFiles = useWatch({ control: form.control, name: 'file' })
  const selectedFileArray = fileListToArray(selectedFiles)
  const selectedFileLabel =
    selectedFileArray.length > 1
      ? t('resumes.form.selectedFileCount', {
          count: selectedFileArray.length,
        })
      : selectedFileArray[0]?.name
  const isBulkUpload =
    selectedFileArray.length > 0 && !isSinglePdfUpload(selectedFileArray)

  useEffect(() => {
    let isCurrent = true

    listActiveJobPositions()
      .then((positions) => {
        if (isCurrent) {
          setJobPositions(positions)
        }
      })
      .catch((error) => {
        if (isCurrent) {
          setIsLoadingJobPositions(false)
          setSubmitError(
            error instanceof Error
              ? error.message
              : t('jobPositionsPage.api.failed')
          )
        }
      })
      .then(() => {
        if (isCurrent) setIsLoadingJobPositions(false)
      })

    return () => {
      isCurrent = false
    }
  }, [t])

  const onSubmit = async (values: ResumeUploadForm) => {
    setSubmitError(null)

    try {
      const files = fileListToArray(values.file)

      if (isSinglePdfUpload(files)) {
        const jobPosition = jobPositions.find(
          (position) => position.id === values.jobPositionId
        )

        if (!jobPosition) {
          throw new Error(t('resumes.form.validation.positionApplied'))
        }

        const resume = await uploadResume({
          applicant: {
            email: values.email.trim(),
            name: values.name.trim(),
            positionApplied: jobPosition.title,
          },
          file: files[0],
          jobPositionId: jobPosition.id,
        })

        addResume(resume)
      } else {
        const jobPosition = values.jobPositionId
          ? jobPositions.find(
              (position) => position.id === values.jobPositionId
            )
          : undefined

        if (values.jobPositionId && !jobPosition) {
          throw new Error(t('resumes.form.validation.positionApplied'))
        }

        const positionApplied = values.positionApplied.trim()
        const payload = {
          files,
          ...(jobPosition ? { jobPositionId: jobPosition.id } : {}),
          ...(positionApplied ? { positionApplied } : {}),
        }
        const resumes = await uploadResumeBatch(payload)

        addResumes(resumes)
      }

      navigate({ to: '/resumes/preview' })
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : t('resumes.upload.errors.submit')
      )
    }
  }

  const isSubmitting = form.formState.isSubmitting

  return (
    <>
      <Header fixed>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div>
          <h2 className='text-2xl font-bold tracking-tight'>
            {t('resumes.upload.title')}
          </h2>
          <p className='text-muted-foreground'>
            {t('resumes.upload.subtitle')}
          </p>
        </div>

        <Card className='max-w-3xl overflow-hidden py-0'>
          <CardHeader className='border-b bg-muted/30 py-5'>
            <div className='flex items-center gap-3'>
              <div className='flex size-10 items-center justify-center rounded-lg border bg-background shadow-xs'>
                <FileUp className='size-5' />
              </div>
              <div>
                <CardTitle>{t('resumes.upload.cardTitle')}</CardTitle>
                <CardDescription>
                  {t('resumes.upload.cardDescription')}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className='flex flex-col gap-6 py-6'>
                {submitError ? (
                  <Alert variant='destructive'>
                    <AlertDescription>{submitError}</AlertDescription>
                  </Alert>
                ) : null}
                <FormField
                  control={form.control}
                  name='file'
                  render={() => (
                    <FormItem>
                      <FormLabel>{t('resumes.form.resumeFiles')}</FormLabel>
                      <ResumeFileInput
                        accept='application/pdf,.pdf,application/zip,.zip'
                        chooseLabel={t('resumes.form.chooseFile')}
                        dropActiveLabel={t('resumes.form.dropActive')}
                        dropHint={t('resumes.form.dropHint')}
                        multiple
                        noFileLabel={t('resumes.form.noFileChosen')}
                        onFilesDrop={(files) =>
                          form.setValue('file', files, {
                            shouldDirty: true,
                            shouldTouch: true,
                          })
                        }
                        selectedFileLabel={selectedFileLabel}
                        variant='dropzone'
                        {...fileRef}
                      />
                      <FormDescription>
                        {t('resumes.upload.fileDescription')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {isBulkUpload ? (
                  <FormField
                    control={form.control}
                    name='positionApplied'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t('resumes.form.positionApplied')}
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t('resumes.form.positionPlaceholder')}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          {t('resumes.form.positionOptionalDescription')}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <>
                    <div className='grid gap-5 sm:grid-cols-2'>
                      <FormField
                        control={form.control}
                        name='name'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {t('resumes.form.applicantName')}
                            </FormLabel>
                            <FormControl>
                              <Input
                                autoComplete='name'
                                placeholder={t(
                                  'resumes.form.applicantNamePlaceholder'
                                )}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name='email'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('resumes.form.email')}</FormLabel>
                            <FormControl>
                              <Input
                                autoComplete='email'
                                placeholder={t('resumes.form.emailPlaceholder')}
                                type='email'
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name='jobPositionId'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {t('resumes.form.positionApplied')}
                          </FormLabel>
                          <SelectDropdown
                            className='w-full'
                            defaultValue={field.value}
                            disabled={isLoadingJobPositions}
                            isControlled
                            isPending={isLoadingJobPositions}
                            items={jobPositions.map((position) => ({
                              label: position.title,
                              value: position.id,
                            }))}
                            onValueChange={field.onChange}
                            placeholder={t('resumes.form.positionPlaceholder')}
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </CardContent>
              <CardFooter className='justify-end border-t bg-muted/20 py-4'>
                <Button disabled={isSubmitting} type='submit'>
                  <FileUp data-icon='inline-start' />
                  {isSubmitting
                    ? t('resumes.upload.submitting')
                    : t('resumes.upload.submit')}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      </Main>
    </>
  )
}
