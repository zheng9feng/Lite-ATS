import * as React from 'react'
import { cn } from '@/lib/utils'
import { useFormField } from '@/components/ui/form'

type ResumeFileInputProps = Omit<React.ComponentProps<'input'>, 'type'> & {
  chooseLabel: string
  noFileLabel: string
  selectedFileLabel?: string
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
