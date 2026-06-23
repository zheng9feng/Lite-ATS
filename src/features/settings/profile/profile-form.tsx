import { useMemo } from 'react'
import { z } from 'zod'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from '@tanstack/react-router'
import { Trans, useTranslation } from 'react-i18next'
import { showSubmittedData } from '@/lib/show-submitted-data'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

type TranslationFunction = (key: string) => string

function createProfileFormSchema(t: TranslationFunction) {
  return z.object({
    username: z
      .string(t('settingsPage.profile.validation.username'))
      .min(2, t('settingsPage.profile.validation.usernameMin'))
      .max(30, t('settingsPage.profile.validation.usernameMax')),
    email: z.email({
      error: (iss) =>
        iss.input === undefined
          ? t('settingsPage.profile.validation.email')
          : undefined,
    }),
    bio: z
      .string()
      .max(160, t('settingsPage.profile.validation.bioMax'))
      .min(4, t('settingsPage.profile.validation.bioMin')),
    urls: z
      .array(
        z.object({
          value: z.url(t('settingsPage.profile.validation.url')),
        })
      )
      .optional(),
  })
}

type ProfileFormValues = z.infer<ReturnType<typeof createProfileFormSchema>>

export function ProfileForm() {
  const { t } = useTranslation()
  const profileFormSchema = useMemo(() => createProfileFormSchema(t), [t])
  const defaultValues = useMemo<Partial<ProfileFormValues>>(
    () => ({
      bio: t('settingsPage.profile.defaultBio'),
      urls: [
        { value: 'https://shadcn.com' },
        { value: 'http://twitter.com/shadcn' },
      ],
    }),
    [t]
  )

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues,
    mode: 'onChange',
  })

  const { fields, append } = useFieldArray({
    name: 'urls',
    control: form.control,
  })

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((data) => showSubmittedData(data))}
        className='space-y-8'
      >
        <FormField
          control={form.control}
          name='username'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('settingsPage.profile.usernameLabel')}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t('settingsPage.profile.usernamePlaceholder')}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                {t('settingsPage.profile.usernameDescription')}
              </FormDescription>
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
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t('settingsPage.profile.emailPlaceholder')}
                    />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value='m@example.com'>m@example.com</SelectItem>
                  <SelectItem value='m@google.com'>m@google.com</SelectItem>
                  <SelectItem value='m@support.com'>m@support.com</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                <Trans
                  i18nKey='settingsPage.profile.emailDescription'
                  components={{
                    link: <Link to='/' />,
                  }}
                />
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='bio'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('settingsPage.profile.bioLabel')}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={t('settingsPage.profile.bioPlaceholder')}
                  className='resize-none'
                  {...field}
                />
              </FormControl>
              <FormDescription>
                {t('settingsPage.profile.bioDescription')}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div>
          {fields.map((field, index) => (
            <FormField
              control={form.control}
              key={field.id}
              name={`urls.${index}.value`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={cn(index !== 0 && 'sr-only')}>
                    {t('settingsPage.profile.urlLabel')}
                  </FormLabel>
                  <FormDescription className={cn(index !== 0 && 'sr-only')}>
                    {t('settingsPage.profile.urlDescription')}
                  </FormDescription>
                  <FormControl className={cn(index !== 0 && 'mt-1.5')}>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='mt-2'
            onClick={() => append({ value: '' })}
          >
            {t('settingsPage.profile.urlSubmit')}
          </Button>
        </div>
        <Button type='submit'>{t('settingsPage.profile.submit')}</Button>
      </form>
    </Form>
  )
}
