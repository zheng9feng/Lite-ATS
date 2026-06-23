import { useMemo, useState } from 'react'
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
import { ThemeSwitch } from '@/components/theme-switch'
import { uploadResume } from '../data/resume-api'
import { useResumeStore } from '../data/resume-store'
import { ResumeFileInput } from './resume-file-input'

function createResumeUploadFormSchema(t: TFunction) {
  return z.object({
    email: z
      .string()
      .trim()
      .email({ message: t('resumes.form.validation.email') }),
    file: z
      .instanceof(FileList)
      .refine((files) => files.length > 0, {
        message: t('resumes.form.validation.pdfResume'),
      })
      .refine((files) => isPdf(files[0]), {
        message: t('resumes.form.validation.pdfFile'),
      }),
    name: z
      .string()
      .trim()
      .min(1, {
        message: t('resumes.form.validation.applicantName'),
      }),
    positionApplied: z
      .string()
      .trim()
      .min(1, {
        message: t('resumes.form.validation.positionApplied'),
      }),
  })
}

type ResumeUploadForm = z.infer<ReturnType<typeof createResumeUploadFormSchema>>

function isPdf(file?: File) {
  if (!file) return false

  return (
    file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  )
}

export function ResumeUploadPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const addResume = useResumeStore((state) => state.addResume)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const formSchema = useMemo(() => createResumeUploadFormSchema(t), [t])
  const form = useForm<ResumeUploadForm>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      file: undefined,
      name: '',
      positionApplied: '',
    },
  })
  const fileRef = form.register('file')
  const selectedFiles = useWatch({ control: form.control, name: 'file' })
  const selectedFileName = selectedFiles?.[0]?.name

  const onSubmit = async (values: ResumeUploadForm) => {
    setSubmitError(null)

    try {
      const resume = await uploadResume({
        applicant: {
          email: values.email.trim(),
          name: values.name.trim(),
          positionApplied: values.positionApplied.trim(),
        },
        file: values.file[0],
      })

      addResume(resume)
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

        <Card className='max-w-2xl'>
          <CardHeader>
            <div className='flex items-center gap-3'>
              <div className='flex size-10 items-center justify-center rounded-md bg-muted'>
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
          <CardContent>
            <Form {...form}>
              <form
                className='space-y-4'
                onSubmit={form.handleSubmit(onSubmit)}
              >
                {submitError ? (
                  <Alert variant='destructive'>
                    <AlertDescription>{submitError}</AlertDescription>
                  </Alert>
                ) : null}
                <div className='grid gap-4 sm:grid-cols-2'>
                  <FormField
                    control={form.control}
                    name='name'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('resumes.form.applicantName')}</FormLabel>
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
                  name='positionApplied'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('resumes.form.positionApplied')}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('resumes.form.positionPlaceholder')}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='file'
                  render={() => (
                    <FormItem>
                      <FormLabel>{t('resumes.form.resumePdf')}</FormLabel>
                      <ResumeFileInput
                        accept='application/pdf,.pdf'
                        chooseLabel={t('resumes.form.chooseFile')}
                        noFileLabel={t('resumes.form.noFileChosen')}
                        selectedFileName={selectedFileName}
                        {...fileRef}
                      />
                      <FormDescription>
                        {t('resumes.upload.fileDescription')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button disabled={isSubmitting} type='submit'>
                  {isSubmitting
                    ? t('resumes.upload.submitting')
                    : t('resumes.upload.submit')}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </Main>
    </>
  )
}
