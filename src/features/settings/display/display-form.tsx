import { useMemo } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { showSubmittedData } from '@/lib/show-submitted-data'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

const items = [
  {
    id: 'recents',
    labelKey: 'settingsPage.display.items.recents',
  },
  {
    id: 'home',
    labelKey: 'settingsPage.display.items.home',
  },
  {
    id: 'applications',
    labelKey: 'settingsPage.display.items.applications',
  },
  {
    id: 'desktop',
    labelKey: 'settingsPage.display.items.desktop',
  },
  {
    id: 'downloads',
    labelKey: 'settingsPage.display.items.downloads',
  },
  {
    id: 'documents',
    labelKey: 'settingsPage.display.items.documents',
  },
] as const

type TranslationFunction = (key: string) => string

function createDisplayFormSchema(t: TranslationFunction) {
  return z.object({
    items: z.array(z.string()).refine((value) => value.some((item) => item), {
      message: t('settingsPage.display.validation.items'),
    }),
  })
}

type DisplayFormValues = z.infer<ReturnType<typeof createDisplayFormSchema>>

// This can come from your database or API.
const defaultValues: Partial<DisplayFormValues> = {
  items: ['recents', 'home'],
}

export function DisplayForm() {
  const { t } = useTranslation()
  const displayFormSchema = useMemo(() => createDisplayFormSchema(t), [t])

  const form = useForm<DisplayFormValues>({
    resolver: zodResolver(displayFormSchema),
    defaultValues,
  })

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((data) => showSubmittedData(data))}
        className='space-y-8'
      >
        <FormField
          control={form.control}
          name='items'
          render={() => (
            <FormItem>
              <div className='mb-4'>
                <FormLabel className='text-base'>
                  {t('settingsPage.display.sidebarLabel')}
                </FormLabel>
                <FormDescription>
                  {t('settingsPage.display.sidebarDescription')}
                </FormDescription>
              </div>
              {items.map((item) => (
                <FormField
                  key={item.id}
                  control={form.control}
                  name='items'
                  render={({ field }) => {
                    return (
                      <FormItem
                        key={item.id}
                        className='flex flex-row items-start'
                      >
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(item.id)}
                            onCheckedChange={(checked) => {
                              return checked
                                ? field.onChange([...field.value, item.id])
                                : field.onChange(
                                    field.value?.filter(
                                      (value) => value !== item.id
                                    )
                                  )
                            }}
                          />
                        </FormControl>
                        <FormLabel className='font-normal'>
                          {t(item.labelKey)}
                        </FormLabel>
                      </FormItem>
                    )
                  }}
                />
              ))}
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type='submit'>{t('settingsPage.display.submit')}</Button>
      </form>
    </Form>
  )
}
