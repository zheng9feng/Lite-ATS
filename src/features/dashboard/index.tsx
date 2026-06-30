import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  BriefcaseBusiness,
  CalendarClock,
  FileText,
  HardDrive,
  ShieldAlert,
  Upload,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '@/context/language-provider'
import { useCan } from '@/hooks/use-permission'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { TopNav } from '@/components/layout/top-nav'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Analytics } from './components/analytics'
import { Overview } from './components/overview'
import { RecentSales } from './components/recent-sales'
import {
  getResumeDashboardSummary,
  type ResumeDashboardSummary,
} from './data/dashboard-api'

function formatFileSize(bytes: number) {
  if (bytes === 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB']
  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  )
  const value = bytes / 1024 ** unitIndex

  return `${new Intl.NumberFormat('en', {
    maximumFractionDigits: value >= 10 ? 0 : 1,
  }).format(value)} ${units[unitIndex]}`
}

function formatDate(value: string | null, locale: string, fallback: string) {
  if (!value) return fallback

  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

export function Dashboard() {
  const { t } = useTranslation()
  const { locale } = useLanguage()
  const canReadResumes = useCan(['resumes:read'])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [summary, setSummary] = useState<ResumeDashboardSummary | null>(null)
  const topNav = useMemo(
    () => [
      {
        title: t('navigation.overview'),
        href: '/',
        isActive: true,
        disabled: false,
      },
      {
        title: t('navigation.resumePreview'),
        href: '/resumes/preview',
        isActive: false,
        disabled: false,
      },
      {
        title: t('navigation.resumeUpload'),
        href: '/resumes/upload',
        isActive: false,
        disabled: false,
      },
      {
        title: t('navigation.settings'),
        href: '/settings',
        isActive: false,
        disabled: false,
      },
    ],
    [t]
  )

  useEffect(() => {
    if (!canReadResumes) {
      return
    }

    let isActive = true

    async function loadSummary() {
      try {
        const dashboardSummary = await getResumeDashboardSummary()

        if (isActive) {
          setSummary(dashboardSummary)
        }
      } catch (loadError) {
        if (isActive) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : t('dashboard.api.failed')
          )
        }
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    void loadSummary()

    return () => {
      isActive = false
    }
  }, [canReadResumes, t])

  const latestUpload = formatDate(
    summary?.latestUploadAt ?? null,
    locale,
    t('dashboard.overview.noUploads')
  )
  const totalFileSize = formatFileSize(summary?.totalFileSize ?? 0)

  return (
    <>
      <Header>
        <TopNav links={topNav} className='me-auto' />
        <Search />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main>
        <div className='mb-4 flex flex-wrap items-end justify-between gap-3'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>
              {t('navigation.dashboard')}
            </h1>
            <p className='text-muted-foreground'>{t('dashboard.subtitle')}</p>
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <Button asChild variant='outline'>
              <Link to='/resumes/preview'>
                <FileText />
                {t('dashboard.actions.viewResumes')}
              </Link>
            </Button>
            <Button asChild>
              <Link to='/resumes/upload'>
                <Upload />
                {t('dashboard.actions.uploadResume')}
              </Link>
            </Button>
          </div>
        </div>

        {!canReadResumes ? (
          <Card className='max-w-2xl'>
            <CardHeader>
              <div className='flex items-center gap-3'>
                <div className='flex size-10 items-center justify-center rounded-md bg-muted'>
                  <ShieldAlert className='size-5' />
                </div>
                <div>
                  <CardTitle>{t('dashboard.permission.title')}</CardTitle>
                  <CardDescription>
                    {t('dashboard.permission.description')}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        ) : isLoading ? (
          <Card className='max-w-2xl'>
            <CardHeader>
              <CardTitle>{t('dashboard.loading.title')}</CardTitle>
              <CardDescription>
                {t('dashboard.loading.description')}
              </CardDescription>
            </CardHeader>
          </Card>
        ) : error ? (
          <Card className='max-w-2xl'>
            <CardHeader>
              <CardTitle>{t('dashboard.error.title')}</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
          </Card>
        ) : summary && summary.totalResumes === 0 ? (
          <Card className='max-w-2xl'>
            <CardHeader>
              <div className='flex items-center gap-3'>
                <div className='flex size-10 items-center justify-center rounded-md bg-muted'>
                  <FileText className='size-5' />
                </div>
                <div>
                  <CardTitle>{t('dashboard.empty.title')}</CardTitle>
                  <CardDescription>
                    {t('dashboard.empty.description')}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link to='/resumes/upload'>{t('dashboard.empty.action')}</Link>
              </Button>
            </CardContent>
          </Card>
        ) : summary ? (
          <Tabs
            orientation='vertical'
            defaultValue='overview'
            className='space-y-4'
          >
            <div className='w-full overflow-x-auto pb-2'>
              <TabsList>
                <TabsTrigger value='overview'>
                  {t('dashboard.tabs.overview')}
                </TabsTrigger>
                <TabsTrigger value='analytics'>
                  {t('dashboard.tabs.analytics')}
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value='overview' className='space-y-4'>
              <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
                <SummaryCard
                  description={t('dashboard.overview.totalResumesDescription')}
                  icon={<FileText className='size-4 text-muted-foreground' />}
                  title={t('dashboard.overview.totalResumes')}
                  value={String(summary.totalResumes)}
                />
                <SummaryCard
                  description={t('dashboard.overview.storageDescription')}
                  icon={<HardDrive className='size-4 text-muted-foreground' />}
                  title={t('dashboard.overview.storageUsed')}
                  value={totalFileSize}
                />
                <SummaryCard
                  description={t('dashboard.overview.positionsDescription')}
                  icon={
                    <BriefcaseBusiness className='size-4 text-muted-foreground' />
                  }
                  title={t('dashboard.overview.positions')}
                  value={String(summary.uniquePositionCount)}
                />
                <SummaryCard
                  description={t('dashboard.overview.latestDescription')}
                  icon={
                    <CalendarClock className='size-4 text-muted-foreground' />
                  }
                  title={t('dashboard.overview.latestUpload')}
                  value={latestUpload}
                />
              </div>
              <div className='grid grid-cols-1 gap-4 lg:grid-cols-7'>
                <Card className='col-span-1 lg:col-span-4'>
                  <CardHeader>
                    <CardTitle>{t('dashboard.overview.uploadTrend')}</CardTitle>
                    <CardDescription>
                      {t('dashboard.overview.uploadTrendDescription')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className='ps-2'>
                    <Overview uploadsByMonth={summary.uploadsByMonth} />
                  </CardContent>
                </Card>
                <Card className='col-span-1 lg:col-span-3'>
                  <CardHeader>
                    <CardTitle>
                      {t('dashboard.overview.recentUploads')}
                    </CardTitle>
                    <CardDescription>
                      {t('dashboard.overview.recentUploadsDescription')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <RecentSales resumes={summary.recentResumes} />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            <TabsContent value='analytics' className='space-y-4'>
              <Analytics summary={summary} totalFileSize={totalFileSize} />
            </TabsContent>
          </Tabs>
        ) : null}
      </Main>
    </>
  )
}

function SummaryCard({
  description,
  icon,
  title,
  value,
}: {
  description: string
  icon: ReactNode
  title: string
  value: string
}) {
  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
        <CardTitle className='text-sm font-medium'>{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className='text-2xl font-bold'>{value}</div>
        <p className='text-xs text-muted-foreground'>{description}</p>
      </CardContent>
    </Card>
  )
}
