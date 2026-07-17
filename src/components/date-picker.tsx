import { useState } from 'react'
import { format } from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'
import { enUS, zhCN } from 'react-day-picker/locale'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

type DatePickerProps = {
  className?: string
  id?: string
  selected: Date | undefined
  onSelect: (date: Date | undefined) => void
  placeholder?: string
}

export function DatePicker({
  className,
  id,
  selected,
  onSelect,
  placeholder,
}: DatePickerProps) {
  const { i18n, t } = useTranslation()
  const [open, setOpen] = useState(false)
  const dateLocale = i18n.language === 'zh-CN' ? zhCN : enUS
  const placeholderText = placeholder ?? t('settingsPage.account.pickDate')

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant='outline'
          data-empty={!selected}
          className={cn(
            'w-60 justify-start text-start font-normal data-[empty=true]:text-muted-foreground',
            className
          )}
        >
          {selected ? (
            format(selected, 'PP', { locale: dateLocale })
          ) : (
            <span>{placeholderText}</span>
          )}
          <CalendarIcon className='ms-auto opacity-50' data-icon='inline-end' />
        </Button>
      </PopoverTrigger>
      <PopoverContent align='start' className='w-auto p-0'>
        <Calendar
          mode='single'
          captionLayout='dropdown'
          locale={dateLocale}
          selected={selected}
          onSelect={(date) => {
            onSelect(date)
            setOpen(false)
          }}
          disabled={(date: Date) =>
            date > new Date() || date < new Date('1900-01-01')
          }
        />
      </PopoverContent>
    </Popover>
  )
}
