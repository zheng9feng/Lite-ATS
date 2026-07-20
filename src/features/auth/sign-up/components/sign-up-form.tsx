import { useCallback, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { Loader2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/password-input'
import { registerWithPassword } from '../../data/auth-api'
import { TurnstileWidget } from './turnstile-widget'

const formSchema = z
  .object({
    confirmPassword: z.string().min(1, 'Please confirm your password.'),
    email: z
      .string()
      .trim()
      .max(254, 'Email must be at most 254 characters.')
      .pipe(z.email('Please enter a valid email address.')),
    name: z
      .string()
      .trim()
      .min(1, 'Please enter your full name.')
      .max(100, 'Full name must be at most 100 characters.'),
    password: z
      .string()
      .min(1, 'Please enter your password.')
      .min(8, 'Password must be at least 8 characters long.')
      .max(128, 'Password must be at most 128 characters long.')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter.')
      .regex(/\d/, 'Password must contain at least one number.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ['confirmPassword'],
  })

type SignUpFormProps = React.HTMLAttributes<HTMLFormElement> & {
  turnstileSiteKey?: string
}

export function SignUpForm({
  className,
  turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '',
  ...props
}: SignUpFormProps) {
  const [captchaResetKey, setCaptchaResetKey] = useState(0)
  const [captchaToken, setCaptchaToken] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const { auth } = useAuthStore()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      confirmPassword: '',
      email: '',
      name: '',
      password: '',
    },
  })

  const handleCaptchaTokenChange = useCallback((token: string) => {
    setCaptchaToken(token)
  }, [])

  const handleCaptchaError = useCallback(() => {
    setCaptchaToken('')
  }, [])

  async function onSubmit(data: z.infer<typeof formSchema>) {
    if (!captchaToken) return

    setIsLoading(true)

    const registration = registerWithPassword({
      captchaToken,
      email: data.email,
      name: data.name,
      password: data.password,
    })

    toast.promise(registration, {
      error: (error) =>
        error instanceof Error ? error.message : 'Unable to create account.',
      loading: 'Creating account...',
      success: `Account created for ${data.email}.`,
    })

    try {
      const authSnapshot = await registration
      auth.setAuthSnapshot(authSnapshot)
      await navigate({ to: '/', replace: true })
    } catch {
      setCaptchaToken('')
      setCaptchaResetKey((current) => current + 1)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('grid gap-3', className)}
        {...props}
      >
        <FormField
          control={form.control}
          name='name'
          render={({ field, fieldState }) => (
            <FormItem data-invalid={fieldState.invalid || undefined}>
              <FormLabel>Full name</FormLabel>
              <FormControl>
                <Input
                  autoComplete='name'
                  placeholder='Jane Doe'
                  aria-invalid={fieldState.invalid}
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
          render={({ field, fieldState }) => (
            <FormItem data-invalid={fieldState.invalid || undefined}>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  autoComplete='email'
                  placeholder='name@example.com'
                  type='email'
                  aria-invalid={fieldState.invalid}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='password'
          render={({ field, fieldState }) => (
            <FormItem data-invalid={fieldState.invalid || undefined}>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <PasswordInput
                  autoComplete='new-password'
                  placeholder='********'
                  aria-invalid={fieldState.invalid}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='confirmPassword'
          render={({ field, fieldState }) => (
            <FormItem data-invalid={fieldState.invalid || undefined}>
              <FormLabel>Confirm Password</FormLabel>
              <FormControl>
                <PasswordInput
                  autoComplete='new-password'
                  placeholder='********'
                  aria-invalid={fieldState.invalid}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <TurnstileWidget
          key={captchaResetKey}
          onError={handleCaptchaError}
          onTokenChange={handleCaptchaTokenChange}
          resetKey={captchaResetKey}
          siteKey={turnstileSiteKey}
        />

        <Button
          className='mt-2'
          disabled={isLoading || !captchaToken}
          type='submit'
        >
          {isLoading ? (
            <Loader2 data-icon='inline-start' className='animate-spin' />
          ) : (
            <UserPlus data-icon='inline-start' />
          )}
          Create Account
        </Button>
      </form>
    </Form>
  )
}
