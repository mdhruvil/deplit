import { Error } from "@/components/error";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/router";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, GlobeIcon, LockIcon, SearchIcon } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_authed/dashboard/new")({
  component: CreateNewProjectComponent,
  loader: ({ context: { queryClient, trpc } }) => {
    queryClient.prefetchQuery(trpc.github.getRepos.queryOptions());
  },
  pendingComponent: () => {
    return <NewPageSkeleton />;
  },
  errorComponent: ({ error }) => {
    return <Error message={error.message} />;
  },
});

function CreateNewProjectComponent() {
  const githubAppLink = import.meta.env.VITE_GITHUB_APP_LINK;
  const { data, isLoading, isError, error } = useQuery(
    trpc.github.getRepos.queryOptions(),
  );
  const [search, setSearch] = useState("");

  if (isLoading) {
    return <NewPageSkeleton />;
  }

  if (isError || !data) {
    return <Error message={error?.message} />;
  }

  const filteredRepos =
    data?.filter((repo) => {
      return repo.full_name.toLowerCase().includes(search.toLowerCase());
    }) ?? [];

  return (
    <div>
      <Card className="mx-auto max-w-xl">
        <CardHeader>
          <CardTitle>Create a project</CardTitle>
          <CardDescription>Import a new project from GitHub</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative flex-1">
            <SearchIcon className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              className="pl-9"
              placeholder="Search..."
              onChange={(e) => setSearch(e.target.value)}
              disabled={data.length === 0}
            />
          </div>
          {data?.length === 0 ? (
            <div className="space-y-4">
              <div>
                <p>No repositories found.</p>
                <p className="text-muted-foreground text-sm">
                  Connect your GitHub account to import and deploy your
                  repositories.
                </p>
              </div>
              <a href={githubAppLink} className={buttonVariants()}>
                Install Github App
                <ArrowRight className="-rotate-45" />
              </a>
            </div>
          ) : null}
          {filteredRepos.length === 0 ? (
            <div className="text-muted-foreground">
              No repositories found for &quot;{search}&quot;
              <a
                href={githubAppLink}
                className={buttonVariants({ variant: "link" })}
              >
                Reconfigure GitHub
                <ArrowRight className="-rotate-45" />
              </a>
            </div>
          ) : null}
          {filteredRepos.length !== 0 && data.length !== 0 ? (
            <div className="space-y-2">
              <div className="max-h-100 divide-y overflow-auto rounded-lg border">
                {filteredRepos.map((repo) => (
                  <RepoCard key={repo.id} repo={repo} />
                ))}
              </div>
              <div className="text-muted-foreground w-fit">
                Don&apos;t see a repository?
                <a
                  href={githubAppLink}
                  className={buttonVariants({ variant: "link" })}
                >
                  Reconfigure GitHub
                  <ArrowRight className="-rotate-45" />
                </a>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

type RepoCardProps = {
  repo:
    | {
        name: string;
        full_name: string;
        owner: {
          login: string;
          avatar_url: string;
        };
        visibility: string | undefined;
        default_branch: string;
      }
    | "loading";
};

function RepoCard({ repo }: RepoCardProps) {
  if (repo === "loading") {
    return (
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-full" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-30" />
          </div>
        </div>
        <Skeleton className="h-8 w-24" />
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between p-4">
      <div className="flex items-center gap-3">
        <img
          src={repo.owner.avatar_url}
          alt={repo.owner.login}
          className="size-8 rounded-full"
        />
        <div className="flex items-center gap-2">
          {repo.visibility?.toLowerCase() !== "public" ? (
            <LockIcon className="text-muted-foreground size-4" />
          ) : (
            <GlobeIcon className="text-muted-foreground size-4" />
          )}
          <span className="hidden md:block">{repo.full_name}</span>
          <span className="max-w-[16ch] truncate md:hidden">{repo.name}</span>
        </div>
      </div>

      <Link
        className={buttonVariants({ size: "sm" })}
        to="/dashboard/deploy"
        search={{
          owner: repo.full_name.split("/")[0] ?? "",
          repo: repo.full_name.split("/")[1] ?? "",
          defaultBranch: repo.default_branch,
        }}
      >
        Deploy
      </Link>
    </div>
  );
}

function NewPageSkeleton() {
  return (
    <div>
      <Card className="mx-auto max-w-xl">
        <CardHeader>
          <CardTitle>Create a project</CardTitle>
          <CardDescription>Import a new project from GitHub</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative flex-1">
            <SearchIcon className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input className="pl-9" placeholder="Search..." disabled={true} />
          </div>

          <div className="space-y-2">
            {/* <div className="divide-y overflow-auto rounded-lg border"> */}
            <div>
              <ScrollArea className="h-fit max-h-100 rounded-lg border [&>[data-slot='scroll-area-viewport']>div]:divide-y">
                {Array.from({ length: 6 }).map((_, index) => (
                  <RepoCard key={index} repo="loading" />
                ))}
              </ScrollArea>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
