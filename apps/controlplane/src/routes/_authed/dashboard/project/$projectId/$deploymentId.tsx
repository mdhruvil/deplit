import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/_authed/dashboard/project/$projectId/$deploymentId',
)({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_authed/dashboard/project/$projectId/$deploymentId"!</div>
}
