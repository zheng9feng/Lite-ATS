import { getRouteApi } from '@tanstack/react-router'
import { Permissions } from '.'

const route = getRouteApi('/_authenticated/permissions')

export function PermissionsRoute() {
  const data = route.useLoaderData()
  const routeKey = [
    ...data.roles.map((role) => [
      role.id,
      role.name,
      role.userCount,
      role.permissions.join(','),
    ]),
    ...data.users.map((user) => [
      user.id,
      user.roles.map((role) => role.id).join(','),
      user.permissions.join(','),
    ]),
  ]
    .flat()
    .join('|')

  return <Permissions key={routeKey} data={data} />
}
