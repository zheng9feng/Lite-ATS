import { useTranslation } from 'react-i18next'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { type ResumeFile } from '@/features/resumes/data/resume-store'

type RecentSalesProps = {
  resumes: ResumeFile[]
}

function getInitials(name: string) {
  const [first = '', second = ''] = name.trim().split(/\s+/)
  return `${first[0] ?? ''}${second[0] ?? ''}`.toUpperCase() || 'CV'
}

export function RecentSales({ resumes }: RecentSalesProps) {
  const { t } = useTranslation()

  return (
    <div className='space-y-6'>
      {resumes.map((resume) => (
        <div key={resume.id} className='flex items-center gap-4'>
          <Avatar className='h-9 w-9'>
            <AvatarFallback>{getInitials(resume.applicant.name)}</AvatarFallback>
          </Avatar>
          <div className='min-w-0 flex-1'>
            <p className='truncate text-sm leading-none font-medium'>
              {resume.applicant.name}
            </p>
            <p className='truncate text-sm text-muted-foreground'>
              {resume.applicant.email}
            </p>
          </div>
          <div className='max-w-32 truncate text-end text-sm font-medium'>
            {resume.applicant.positionApplied}
          </div>
        </div>
      ))}
      {resumes.length === 0 ? (
        <p className='text-sm text-muted-foreground'>
          {t('dashboard.overview.noRecentUploads')}
        </p>
      ) : null}
    </div>
  )
}
