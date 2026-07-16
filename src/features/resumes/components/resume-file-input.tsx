import * as React from 'react'
import { Upload } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useFormField } from '@/components/ui/form'

type ResumeFileInputProps = Omit<React.ComponentProps<'input'>, 'type'> & {
  chooseLabel: string
  noFileLabel: string
  selectedFileLabel?: string
  variant?: 'default' | 'dropzone'
}

function assignRef<T>(ref: React.Ref<T> | undefined, value: T | null) {
  if (!ref) return

  if (typeof ref === 'function') {
    ref(value)
    return
  }

  ;(ref as React.MutableRefObject<T | null>).current = value
}

export function ResumeFileInput({
  chooseLabel,
  className,
  disabled,
  noFileLabel,
  ref,
  selectedFileLabel,
  variant = 'default',
  ...props
}: ResumeFileInputProps) {
  const inputRef = React.useRef<HTMLInputElement | null>(null)
  const { error, formDescriptionId, formItemId, formMessageId } = useFormField()
  const describedBy = error
    ? `${formDescriptionId} ${formMessageId}`
    : formDescriptionId

  const setInputRef = React.useCallback(
    (node: HTMLInputElement | null) => {
      inputRef.current = node
      assignRef(ref, node)
    },
    [ref]
  )

  const input = (
    <input
      {...props}
      ref={setInputRef}
      id={formItemId}
      type='file'
      aria-describedby={describedBy}
      aria-invalid={!!error}
      className={cn('sr-only', className)}
      disabled={disabled}
    />
  )

  if (variant === 'dropzone') {
    return (
      <div
        data-invalid={!!error}
        className={cn(
          'flex min-h-28 flex-col items-stretch justify-between gap-4 rounded-xl border border-dashed border-input bg-muted/20 p-4 transition-[color,box-shadow] sm:flex-row sm:items-center',
          'focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50',
          'data-[invalid=true]:border-destructive data-[invalid=true]:ring-destructive/20',
          disabled && 'cursor-not-allowed opacity-50'
        )}
      >
        {input}
        <div className='min-w-0'>
          <p
            className='truncate text-sm font-medium text-foreground'
            aria-live='polite'
          >
            {selectedFileLabel ?? noFileLabel}
          </p>
        </div>
        <Button
          className='w-full sm:w-auto'
          disabled={disabled}
          type='button'
          variant='outline'
          onClick={() => inputRef.current?.click()}
        >
          <Upload data-icon='inline-start' />
          {chooseLabel}
        </Button>
      </div>
    )
  }

  return (
    <div
      data-invalid={!!error}
      className={cn(
        'flex h-9 w-full min-w-0 overflow-hidden rounded-md border border-input bg-transparent text-base shadow-xs transition-[color,box-shadow] md:text-sm dark:bg-input/30',
        'focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50',
        'data-[invalid=true]:border-destructive data-[invalid=true]:ring-destructive/20 dark:data-[invalid=true]:ring-destructive/40',
        disabled && 'cursor-not-allowed opacity-50'
      )}
    >
      {input}
      <button
        type='button'
        className='inline-flex h-full shrink-0 items-center border-e border-input px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:pointer-events-none'
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        {chooseLabel}
      </button>
      <span
        className='flex min-w-0 flex-1 items-center truncate px-3 text-muted-foreground'
        aria-live='polite'
      >
        {selectedFileLabel ?? noFileLabel}
      </span>
    </div>
  )
}
