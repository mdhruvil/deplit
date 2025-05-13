import { Error } from "@/components/error";
import { ProjectCard, ProjectCardSkeleton } from "@/components/project-card";
import { buttonVariants } from "@/components/ui/button";
import { trpc } from "@/router";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PlusIcon } from "lucide-react";

export const Route = createFileRoute("/_authed/dashboard/")({
  component: DashboardComponent,
  loader: async ({ context: { queryClient, trpc } }) => {
    await queryClient.ensureQueryData(trpc.project.getAll.queryOptions());
  },
  pendingComponent: () => {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-foreground text-2xl font-semibold">Projects</h3>
          <CreateNewProjectButton />
        </div>
        <div className="grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <ProjectCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  },
  errorComponent: ({ error }) => {
    return (
      <div>
        <Error message={error.message} />
      </div>
    );
  },
});

function DashboardComponent() {
  const { data } = useQuery(trpc.project.getAll.queryOptions());

  if (!data || !data.length) {
    return (
      <div className="space-y-4">
        <h3 className="text-foreground text-2xl font-semibold">Projects</h3>
        <div className="flex h-100 flex-col items-center justify-center space-y-4 rounded border-2 border-dashed px-4 text-center">
          <h3 className="text-foreground text-2xl font-semibold">
            No projects found
          </h3>
          <p className="text-muted-foreground max-w-md">
            Deploy your first project to get started.
          </p>
          <CreateNewProjectButton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-foreground text-2xl font-semibold">Projects</h3>
        <CreateNewProjectButton />
      </div>
      <div className="grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-2 lg:grid-cols-3">
        {data.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  );
}

function CreateNewProjectButton() {
  return (
    <Link to="/dashboard/new" className={buttonVariants()}>
      <PlusIcon className="size-4" />
      Deploy new project
    </Link>
  );
}
