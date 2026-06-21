import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { FileUp } from 'lucide-react'
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

const formSchema = z.object({
  email: z
    .string()
    .trim()
    .email({ message: 'Please enter a valid email address.' }),
  file: z
    .instanceof(FileList)
    .refine((files) => files.length > 0, {
      message: 'Please upload a PDF resume.',
    })
    .refine((files) => isPdf(files[0]), {
      message: 'Please upload a PDF file.',
    }),
  name: z.string().trim().min(1, {
    message: 'Please enter the applicant name.',
  }),
  positionApplied: z.string().trim().min(1, {
    message: 'Please enter the position applied for.',
  }),
})

function isPdf(file?: File) {
  if (!file) return false

  return (
    file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  )
}

export function ResumeUploadPage() {
  const navigate = useNavigate()
  const addResume = useResumeStore((state) => state.addResume)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      file: undefined,
      name: '',
      positionApplied: '',
    },
  })
  const fileRef = form.register('file')

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
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
          : 'Unable to upload this resume. Please try again.'
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
          <h2 className='text-2xl font-bold tracking-tight'>Resume Upload</h2>
          <p className='text-muted-foreground'>
            Upload a PDF resume to preview it online.
          </p>
        </div>

        <Card className='max-w-2xl'>
          <CardHeader>
            <div className='flex items-center gap-3'>
              <div className='flex size-10 items-center justify-center rounded-md bg-muted'>
                <FileUp className='size-5' />
              </div>
              <div>
                <CardTitle>Upload PDF Resume</CardTitle>
                <CardDescription>
                  Choose a resume file from your device. The API stores the PDF
                  in MinIO for preview and limited-time sharing.
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
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input
                            autoComplete='name'
                            placeholder='Applicant name'
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
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            autoComplete='email'
                            placeholder='applicant@example.com'
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
                      <FormLabel>Position applied for</FormLabel>
                      <FormControl>
                        <Input placeholder='Frontend Engineer' {...field} />
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
                      <FormLabel>Resume PDF</FormLabel>
                      <FormControl>
                        <Input
                          type='file'
                          accept='application/pdf,.pdf'
                          {...fileRef}
                          className='cursor-pointer'
                        />
                      </FormControl>
                      <FormDescription>
                        Only PDF files are supported for online preview.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button disabled={isSubmitting} type='submit'>
                  {isSubmitting ? 'Uploading...' : 'Upload and preview'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </Main>
    </>
  )
}
