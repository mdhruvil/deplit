import { Link } from "@tanstack/react-router";
import { Badge } from "./ui/badge";
import { GithubIcon } from "./icons";
import { GitBranchIcon, GitCommitIcon } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { frameworksLogos } from "@/lib/frameworks";
import { Skeleton } from "./ui/skeleton";

type ProjectCardProps = {
  project: {
    id: string;
    name: string;
    slug: string;
    githubUrl: string;
    fullName: string;
    framework?: string | null;
    deployments: {
      gitCommitMessage: string;
      gitRef: string;
      createdAt: Date;
    }[];
    createdAt: Date;
  };
};

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link
      to="/dashboard/project/$projectId"
      params={{ projectId: project.id }}
      className="space-y-3 rounded-lg border p-4 shadow transition-all duration-200 ease-in-out hover:shadow-md"
    >
      <div className="flex items-center gap-3">
        <img
          src={frameworksLogos[project.framework ?? "other"]}
          alt={project.framework ?? "framework logo"}
          className="size-7"
        />

        <div className="leading-none">
          <p className="font-semibold">{project.name}</p>
          <a
            href={`https://${project.slug}.deplit.tech`}
            target="_blank"
            rel="noreferrer"
            className="text-muted-foreground text-sm hover:underline"
          >{`${project.slug}.deplit.tech`}</a>
        </div>
      </div>
      <Badge variant="secondary" className="px-2 py-1" asChild>
        <a
          href={project.githubUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2"
        >
          <GithubIcon className="size-5" />
          {project.fullName}
        </a>
      </Badge>

      {project.deployments.length > 0 ? (
        <div className="space-y-1">
          <p className="text-muted-foreground flex items-center gap-1 text-xs">
            <GitCommitIcon className="size-4" />
            {project.deployments[0]?.gitCommitMessage}
          </p>
          <p className="text-muted-foreground flex items-center gap-1 text-xs">
            <GitBranchIcon className="size-3.5" />
            {project.deployments[0]?.gitRef}
          </p>
          <p className="text-muted-foreground text-xs">
            {formatDate(project.deployments[0]?.createdAt ?? new Date())}
          </p>
        </div>
      ) : (
        <p className="text-muted-foreground text-xs">
          Created {formatDate(project.createdAt)}
        </p>
      )}
    </Link>
  );
}

export function ProjectCardSkeleton() {
  return (
    <div className="space-y-3 rounded-lg border p-4">
      {/* Header with logo and project name */}
      <div className="flex items-center gap-3">
        <Skeleton className="size-7 rounded-md" />
        <div className="space-y-1.5 leading-none">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-40" />
        </div>
      </div>

      {/* GitHub badge */}
      <Skeleton className="h-6 w-48" />

      {/* Deployment info */}
      <div className="space-y-1">
        <div className="flex items-center gap-1">
          <Skeleton className="size-4" />
          <Skeleton className="h-3 w-56" />
        </div>
        <div className="flex items-center gap-1">
          <Skeleton className="size-3.5" />
          <Skeleton className="h-3 w-28" />
        </div>
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}
