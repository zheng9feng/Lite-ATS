import { useTranslation } from 'react-i18next'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { type ResumeDashboardSummary } from '../data/dashboard-api'
import { AnalyticsChart } from './analytics-chart'

type AnalyticsProps = {
  summary: ResumeDashboardSummary
  totalFileSize: string
}

export function Analytics({ summary, totalFileSize }: AnalyticsProps) {
  const { t } = useTranslation()

  return (
    <div className='space-y-4'>
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.analytics.monthlyUploads')}</CardTitle>
          <CardDescription>
            {t('dashboard.analytics.monthlyUploadsDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className='px-6'>
          <AnalyticsChart uploadsByMonth={summary.uploadsByMonth} />
        </CardContent>
      </Card>
      <div className='grid gap-4 md:grid-cols-3'>
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.analytics.totalStorage')}</CardTitle>
            <CardDescription>
              {t('dashboard.analytics.totalStorageDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{totalFileSize}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.analytics.averageFileSize')}</CardTitle>
            <CardDescription>
              {t('dashboard.analytics.averageFileSizeDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {summary.totalResumes === 0
                ? '0 B'
                : totalFileSizeForAverage(
                    summary.totalFileSize,
                    summary.totalResumes
                  )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.analytics.trackedPositions')}</CardTitle>
            <CardDescription>
              {t('dashboard.analytics.trackedPositionsDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {summary.uniquePositionCount}
            </div>
          </CardContent>
        </Card>
      </div>
      <div className='grid grid-cols-1 gap-4 lg:grid-cols-7'>
        <Card className='col-span-1 lg:col-span-4'>
          <CardHeader>
            <CardTitle>{t('dashboard.analytics.topPositions')}</CardTitle>
            <CardDescription>
              {t('dashboard.analytics.topPositionsDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleBarList
              items={summary.topPositions}
              labelKey='position'
              barClass='bg-primary'
              valueFormatter={(count) =>
                t('dashboard.analytics.resumeCount', { count })
              }
            />
          </CardContent>
        </Card>
        <Card className='col-span-1 lg:col-span-3'>
          <CardHeader>
            <CardTitle>{t('dashboard.analytics.monthlyUploads')}</CardTitle>
            <CardDescription>
              {t('dashboard.analytics.monthlyUploadsListDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleBarList
              items={summary.uploadsByMonth}
              labelKey='month'
              barClass='bg-muted-foreground'
              valueFormatter={(count) =>
                t('dashboard.analytics.resumeCount', { count })
              }
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function totalFileSizeForAverage(totalFileSize: number, totalResumes: number) {
  const average = totalFileSize / totalResumes
  if (average === 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB']
  const unitIndex = Math.min(
    Math.floor(Math.log(average) / Math.log(1024)),
    units.length - 1
  )
  const value = average / 1024 ** unitIndex

  return `${new Intl.NumberFormat('en', {
    maximumFractionDigits: value >= 10 ? 0 : 1,
  }).format(value)} ${units[unitIndex]}`
}

function SimpleBarList<T extends { count: number }>({
  items,
  valueFormatter,
  barClass,
  labelKey,
}: {
  items: T[]
  valueFormatter: (count: number) => string
  barClass: string
  labelKey: keyof T
}) {
  const max = Math.max(...items.map((item) => item.count), 1)
  return (
    <ul className='space-y-3'>
      {items.map((item) => {
        const width = `${Math.round((item.count / max) * 100)}%`
        const label = String(item[labelKey])
        return (
          <li key={label} className='flex items-center justify-between gap-3'>
            <div className='min-w-0 flex-1'>
              <div className='mb-1 truncate text-xs text-muted-foreground'>
                {label}
              </div>
              <div className='h-2.5 w-full rounded-full bg-muted'>
                <div
                  className={`h-2.5 rounded-full ${barClass}`}
                  style={{ width }}
                />
              </div>
            </div>
            <div className='ps-2 text-xs font-medium tabular-nums'>
              {valueFormatter(item.count)}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
