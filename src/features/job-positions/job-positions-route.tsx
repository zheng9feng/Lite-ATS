import { getRouteApi } from '@tanstack/react-router'
import { JobPositions } from '.'

const route = getRouteApi('/_authenticated/job-positions')

export function JobPositionsRoute() {
  const data = route.useLoaderData()

  return <JobPositions data={data} />
}
