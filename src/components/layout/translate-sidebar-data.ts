import { type TFunction } from 'i18next'
import {
  type NavCollapsible,
  type NavGroup,
  type NavItem,
  type NavLink,
} from './types'

const NAV_TITLE_KEYS: Record<string, string> = {
  Account: 'navigation.account',
  Appearance: 'navigation.appearance',
  Auth: 'navigation.auth',
  Dashboard: 'navigation.dashboard',
  Display: 'navigation.display',
  Errors: 'navigation.errors',
  Forbidden: 'navigation.forbidden',
  'Forgot Password': 'navigation.forgotPassword',
  General: 'navigation.groups.general',
  'Help Center': 'navigation.helpCenter',
  'Internal Server Error': 'navigation.internalServerError',
  'Maintenance Error': 'navigation.maintenanceError',
  'Not Found': 'navigation.notFound',
  Notifications: 'navigation.notifications',
  OTP: 'navigation.otp',
  Other: 'navigation.groups.other',
  Pages: 'navigation.groups.pages',
  Profile: 'navigation.profile',
  'Resume Preview': 'navigation.resumePreview',
  'Resume Upload': 'navigation.resumeUpload',
  'Secured by Clerk': 'navigation.securedByClerk',
  Settings: 'navigation.settings',
  'Sign In': 'navigation.signIn',
  'Sign In (2 Col)': 'navigation.signInTwoColumn',
  'Sign Up': 'navigation.signUp',
  Unauthorized: 'navigation.unauthorized',
  'User Management': 'navigation.userManagement',
  Users: 'navigation.users',
}

function translateTitle(title: string, t: TFunction) {
  const key = NAV_TITLE_KEYS[title]
  return key ? t(key) : title
}

function translateItem(item: NavItem, t: TFunction): NavItem {
  if ('items' in item && item.items) {
    return {
      ...item,
      title: translateTitle(item.title, t),
      items: item.items.map(
        (subItem) =>
          ({
            ...subItem,
            title: translateTitle(subItem.title, t),
          }) satisfies NavCollapsible['items'][number]
      ),
    } satisfies NavCollapsible
  }

  return {
    ...item,
    title: translateTitle(item.title, t),
  } satisfies NavLink
}

export function translateSidebarData(navGroups: NavGroup[], t: TFunction) {
  return navGroups.map((group) => ({
    ...group,
    title: translateTitle(group.title, t),
    items: group.items.map((item) => translateItem(item, t)),
  }))
}
