import { DeploymentTable } from "@/components/deployments-table";
import { Error } from "@/components/error";
import { GithubIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/router";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { RefreshCwIcon } from "lucide-react";

export const Route = createFileRoute("/_authed/dashboard/project/$projectId/")({
  component: ProjectComponent,
  loader: async ({ context: { queryClient, trpc }, params }) => {
    await queryClient.ensureQueryData(
      trpc.project.getById.queryOptions({ projectId: params.projectId }),
    );
  },
  errorComponent: ({ error }) => {
    return (
      <div>
        <Error message={error.message} />
      </div>
    );
  },
  pendingComponent: () => {
    return <ProjectComponentSkeleton />;
  },
});

function ProjectComponent() {
  const projectId = Route.useParams({ select: (d) => d.projectId });
  const { data, isLoading, error, isError, refetch, isFetching } = useQuery(
    trpc.project.getById.queryOptions({ projectId }),
  );

  if (isLoading || isFetching) {
    return <ProjectComponentSkeleton />;
  }

  if (isError || !data) {
    return (
      <div>
        <Error message={error?.message} />
      </div>
    );
  }

  if (!data.deployments || !data.deployments.length) {
    return (
      <div className="space-y-4">
        <h3 className="text-2xl font-semibold">Deployments</h3>
        <div className="flex h-100 flex-col items-center justify-center space-y-4 rounded border-2 border-dashed px-4 text-center">
          <h3 className="text-2xl font-semibold">No deployments found</h3>
          <p className="text-muted-foreground">Please check back later.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">Deployments</h2>
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            <RefreshCwIcon className="size-4" />
            Continuously generated from{" "}
            <a
              href={data.githubUrl}
              target="_blank"
              rel="noreferrer"
              className="text-foreground flex items-center gap-1 font-mono hover:underline"
            >
              <GithubIcon className="size-4" /> {data.fullName}
            </a>
          </p>
        </div>
        <div>
          <Button
            variant="outline"
            onClick={() => refetch()}
            loading={isFetching || isLoading}
          >
            <RefreshCwIcon className="size-4" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="mt-10">
        <DeploymentTable data={data.deployments} projectId={projectId} />
      </div>
    </div>
  );
}

function ProjectComponentSkeleton() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">Deployments</h2>
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            <RefreshCwIcon className="size-4" />
            Continuously generated from <Skeleton className="h-4 w-32" />
          </p>
        </div>
        <div>
          <Button variant="outline" loading={true}>
            <RefreshCwIcon className="size-4" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="mt-10">
        <div>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-20 w-full rounded-none border first:rounded-t-lg last:rounded-b-lg"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
