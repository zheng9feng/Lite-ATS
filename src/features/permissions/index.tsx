import { useRouter } from '@tanstack/react-router'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { type PermissionResources } from './data/permissions-api'
import { PermissionsPage } from './permissions-page'

type PermissionsProps = {
  data: PermissionResources
}

export function Permissions({ data }: PermissionsProps) {
  const router = useRouter()

  return (
    <>
      <Header fixed>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <PermissionsPage
          initialData={data}
          onRefresh={() => router.invalidate()}
        />
      </Main>
    </>
  )
}
