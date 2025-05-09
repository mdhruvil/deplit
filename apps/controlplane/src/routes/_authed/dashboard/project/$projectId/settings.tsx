import { Button } from "@/components/ui/button";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_authed/dashboard/project/$projectId/settings",
)({
  component: RouteComponent,
});

function RouteComponent() {
  return <Button loading>Hello</Button>;
}
