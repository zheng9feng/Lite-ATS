import * as React from 'react'
import { Upload } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useFormField } from '@/components/ui/form'

type ResumeFileInputProps = Omit<React.ComponentProps<'input'>, 'type'> & {
  chooseLabel: string
  dropActiveLabel?: string
  dropHint?: string
  noFileLabel: string
  onFilesDrop?: (files: FileList) => void
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
  dropActiveLabel,
  dropHint,
  noFileLabel,
  onFilesDrop,
  ref,
  selectedFileLabel,
  variant = 'default',
  ...props
}: ResumeFileInputProps) {
  const inputRef = React.useRef<HTMLInputElement | null>(null)
  const dragDepthRef = React.useRef(0)
  const [isDragging, setIsDragging] = React.useState(false)
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
    const isFileDrag = (event: React.DragEvent<HTMLDivElement>) => {
      const types = Array.from(event.dataTransfer.types)

      return (
        event.dataTransfer.files.length > 0 ||
        types.length === 0 ||
        types.includes('Files')
      )
    }

    const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
      if (disabled || !isFileDrag(event)) return

      event.preventDefault()
      dragDepthRef.current += 1
      setIsDragging(true)
    }

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
      if (disabled || !isFileDrag(event)) return

      event.preventDefault()
      event.dataTransfer.dropEffect = 'copy'
    }

    const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
      if (disabled) return

      event.preventDefault()
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
      if (dragDepthRef.current === 0) setIsDragging(false)
    }

    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
      if (disabled) return

      event.preventDefault()
      dragDepthRef.current = 0
      setIsDragging(false)

      const files = event.dataTransfer.files
      if (files.length === 0) return

      if (onFilesDrop) {
        onFilesDrop(files)
        return
      }

      const inputElement = inputRef.current
      if (!inputElement) return

      inputElement.files = files
      inputElement.dispatchEvent(new Event('change', { bubbles: true }))
    }

    return (
      <div
        data-slot='resume-file-dropzone'
        data-dragging={isDragging}
        data-invalid={!!error}
        className={cn(
          'flex min-h-28 flex-col items-stretch justify-between gap-4 rounded-xl border border-dashed border-input bg-muted/20 p-4 transition-[color,box-shadow] sm:flex-row sm:items-center',
          'focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50',
          'data-[invalid=true]:border-destructive data-[invalid=true]:ring-destructive/20',
          'data-[dragging=true]:border-primary data-[dragging=true]:bg-primary/10 data-[dragging=true]:ring-[3px] data-[dragging=true]:ring-primary/20',
          disabled && 'cursor-not-allowed opacity-50'
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {input}
        <div className='min-w-0 space-y-1'>
          <p
            className='truncate text-sm font-medium text-foreground'
            aria-live='polite'
          >
            {isDragging
              ? (dropActiveLabel ?? dropHint ?? noFileLabel)
              : (selectedFileLabel ?? noFileLabel)}
          </p>
          {dropHint ? (
            <p className='text-sm text-muted-foreground'>{dropHint}</p>
          ) : null}
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
