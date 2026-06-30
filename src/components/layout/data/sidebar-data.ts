import {
  Construction,
  BriefcaseBusiness,
  LayoutDashboard,
  FileText,
  FileUp,
  KeyRound,
  Monitor,
  Bug,
  FileX,
  HelpCircle,
  Lock,
  Bell,
  Palette,
  ServerOff,
  Settings,
  Wrench,
  UserCog,
  UserX,
  Users,
  ShieldCheck,
  AudioWaveform,
  Command,
  GalleryVerticalEnd,
} from 'lucide-react'
import { hasEveryPermission, type AppPermission } from '@/lib/permissions'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  teams: [
    {
      name: 'Shadcn Admin',
      logo: Command,
      plan: 'Vite + ShadcnUI',
    },
    {
      name: 'Acme Inc',
      logo: GalleryVerticalEnd,
      plan: 'Enterprise',
    },
    {
      name: 'Acme Corp.',
      logo: AudioWaveform,
      plan: 'Startup',
    },
  ],
  navGroups: [
    {
      title: 'General',
      items: [
        {
          title: 'Dashboard',
          url: '/',
          icon: LayoutDashboard,
        },
        {
          title: 'Resume Upload',
          url: '/resumes/upload',
          icon: FileUp,
          requiredPermissions: ['resumes:create'],
        },
        {
          title: 'Resume Preview',
          url: '/resumes/preview',
          icon: FileText,
          requiredPermissions: ['resumes:read'],
        },
        {
          title: 'Job Positions',
          url: '/job-positions',
          icon: BriefcaseBusiness,
          requiredPermissions: ['job-positions:read'],
        },
        {
          title: 'Users',
          url: '/users',
          icon: Users,
          requiredPermissions: ['users:manage'],
        },
        {
          title: 'Permissions',
          url: '/permissions',
          icon: KeyRound,
          requiredPermissions: ['rbac:manage'],
        },
      ],
    },
    {
      title: 'Pages',
      items: [
        {
          title: 'Auth',
          icon: ShieldCheck,
          items: [
            {
              title: 'Sign In',
              url: '/sign-in',
            },
            {
              title: 'Sign In (2 Col)',
              url: '/sign-in-2',
            },
            {
              title: 'Sign Up',
              url: '/sign-up',
            },
            {
              title: 'Forgot Password',
              url: '/forgot-password',
            },
            {
              title: 'OTP',
              url: '/otp',
            },
          ],
        },
        {
          title: 'Errors',
          icon: Bug,
          items: [
            {
              title: 'Unauthorized',
              url: '/errors/unauthorized',
              icon: Lock,
            },
            {
              title: 'Forbidden',
              url: '/errors/forbidden',
              icon: UserX,
            },
            {
              title: 'Not Found',
              url: '/errors/not-found',
              icon: FileX,
            },
            {
              title: 'Internal Server Error',
              url: '/errors/internal-server-error',
              icon: ServerOff,
            },
            {
              title: 'Maintenance Error',
              url: '/errors/maintenance-error',
              icon: Construction,
            },
          ],
        },
      ],
    },
    {
      title: 'Other',
      items: [
        {
          title: 'Settings',
          icon: Settings,
          items: [
            {
              title: 'Profile',
              url: '/settings',
              icon: UserCog,
            },
            {
              title: 'Account',
              url: '/settings/account',
              icon: Wrench,
            },
            {
              title: 'Appearance',
              url: '/settings/appearance',
              icon: Palette,
            },
            {
              title: 'Notifications',
              url: '/settings/notifications',
              icon: Bell,
            },
            {
              title: 'Display',
              url: '/settings/display',
              icon: Monitor,
            },
          ],
        },
        {
          title: 'Help Center',
          url: '/help-center',
          icon: HelpCircle,
        },
      ],
    },
  ],
}

export function filterNavGroupsByPermissions(
  navGroups: SidebarData['navGroups'],
  permissions: string[]
): SidebarData['navGroups'] {
  return navGroups
    .map((group) => ({
      ...group,
      items: group.items
        .map((item) => {
          if (
            item.requiredPermissions &&
            !hasEveryPermission(permissions, item.requiredPermissions)
          ) {
            return undefined
          }

          if ('items' in item && item.items) {
            const filteredItems = item.items.filter(
              (subItem) =>
                !subItem.requiredPermissions ||
                hasEveryPermission(
                  permissions,
                  subItem.requiredPermissions as AppPermission[]
                )
            )

            return filteredItems.length
              ? {
                  ...item,
                  items: filteredItems,
                }
              : undefined
          }

          return item
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item)),
    }))
    .filter((group) => group.items.length > 0)
}
