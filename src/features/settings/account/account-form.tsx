import { useMemo } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { CaretSortIcon, CheckIcon } from '@radix-ui/react-icons'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { showSubmittedData } from '@/lib/show-submitted-data'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { DatePicker } from '@/components/date-picker'

const languages = [
  { labelKey: 'settingsPage.languages.english', value: 'en' },
  { labelKey: 'settingsPage.languages.french', value: 'fr' },
  { labelKey: 'settingsPage.languages.german', value: 'de' },
  { labelKey: 'settingsPage.languages.spanish', value: 'es' },
  { labelKey: 'settingsPage.languages.portuguese', value: 'pt' },
  { labelKey: 'settingsPage.languages.russian', value: 'ru' },
  { labelKey: 'settingsPage.languages.japanese', value: 'ja' },
  { labelKey: 'settingsPage.languages.korean', value: 'ko' },
  { labelKey: 'settingsPage.languages.chinese', value: 'zh' },
] as const

type TranslationFunction = (key: string) => string

function createAccountFormSchema(t: TranslationFunction) {
  return z.object({
    name: z
      .string()
      .min(1, t('settingsPage.account.validation.name'))
      .min(2, t('settingsPage.account.validation.nameMin'))
      .max(30, t('settingsPage.account.validation.nameMax')),
    dob: z.date(t('settingsPage.account.validation.dob')),
    language: z.string(t('settingsPage.account.validation.language')),
  })
}

type AccountFormValues = z.infer<ReturnType<typeof createAccountFormSchema>>

// This can come from your database or API.
const defaultValues: Partial<AccountFormValues> = {
  name: '',
}

export function AccountForm() {
  const { t } = useTranslation()
  const accountFormSchema = useMemo(() => createAccountFormSchema(t), [t])

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues,
  })

  function onSubmit(data: AccountFormValues) {
    showSubmittedData(data)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-8'>
        <FormField
          control={form.control}
          name='name'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('settingsPage.account.nameLabel')}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t('settingsPage.account.namePlaceholder')}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                {t('settingsPage.account.nameDescription')}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='dob'
          render={({ field }) => (
            <FormItem className='flex flex-col'>
              <FormLabel>{t('settingsPage.account.dateLabel')}</FormLabel>
              <DatePicker
                selected={field.value}
                onSelect={field.onChange}
                placeholder={t('settingsPage.account.pickDate')}
              />
              <FormDescription>
                {t('settingsPage.account.dateDescription')}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='language'
          render={({ field }) => {
            const selectedLanguage = languages.find(
              (language) => language.value === field.value
            )

            return (
              <FormItem className='flex flex-col'>
                <FormLabel>{t('settingsPage.account.languageLabel')}</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant='outline'
                        role='combobox'
                        className={cn(
                          'w-50 justify-between',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        {selectedLanguage
                          ? t(selectedLanguage.labelKey)
                          : t('settingsPage.account.languagePlaceholder')}
                        <CaretSortIcon className='ms-2 h-4 w-4 shrink-0 opacity-50' />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className='w-50 p-0'>
                    <Command>
                      <CommandInput
                        placeholder={t('settingsPage.account.languageSearch')}
                      />
                      <CommandEmpty>
                        {t('settingsPage.account.languageEmpty')}
                      </CommandEmpty>
                      <CommandGroup>
                        <CommandList>
                          {languages.map((language) => (
                            <CommandItem
                              value={t(language.labelKey)}
                              key={language.value}
                              onSelect={() => {
                                form.setValue('language', language.value)
                              }}
                            >
                              <CheckIcon
                                className={cn(
                                  'size-4',
                                  language.value === field.value
                                    ? 'opacity-100'
                                    : 'opacity-0'
                                )}
                              />
                              {t(language.labelKey)}
                            </CommandItem>
                          ))}
                        </CommandList>
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
                <FormDescription>
                  {t('settingsPage.account.languageDescription')}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )
          }}
        />
        <Button type='submit'>{t('settingsPage.account.submit')}</Button>
      </form>
    </Form>
  )
}
