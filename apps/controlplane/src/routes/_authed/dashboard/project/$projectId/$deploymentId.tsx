import { Error } from "@/components/error";
import { LogViewer, LogViewerWithPolling } from "@/components/log-viewer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  cn,
  formatBytes,
  formatDateToDaysFromNow,
  formatMilliseconds,
} from "@/lib/utils";
import { trpc } from "@/router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowUpCircleIcon,
  ClockFadingIcon,
  ExternalLinkIcon,
  GitBranchIcon,
  GitCommitIcon,
  GlobeIcon,
  RotateCwIcon,
} from "lucide-react";
import { toast } from "sonner";

type RouteMetaData = {
  route: string;
  path: string;
  size: number;
};

export const Route = createFileRoute(
  "/_authed/dashboard/project/$projectId/$deploymentId",
)({
  component: RouteComponent,
  loader: ({ context: { queryClient, trpc }, params }) => {
    queryClient.prefetchQuery(
      trpc.deployment.getById.queryOptions({
        deploymentId: params.deploymentId,
        projectId: params.projectId,
      }),
    );
  },
  errorComponent: ({ error }) => {
    return <Error message={error.message} />;
  },
});

function RouteComponent() {
  const { projectId, deploymentId } = Route.useParams({
    select: (d) => ({
      projectId: d.projectId,
      deploymentId: d.deploymentId,
    }),
  });
  const { data, isLoading, error, isError, refetch } = useQuery(
    trpc.deployment.getById.queryOptions(
      {
        deploymentId,
        projectId,
      },
      {
        refetchInterval: (query) => {
          const isInQueue = query.state.data?.buildStatus === "IN_QUEUE";
          const isBuilding = query.state.data?.buildStatus === "BUILDING";
          return isInQueue || isBuilding ? 3000 : false;
        },
      },
    ),
  );
  const instantRollbackMutation = useMutation(
    trpc.project.instantRollback.mutationOptions({
      onSettled: () => {
        return refetch();
      },
      onError: (error) => {
        console.error("Error rolling back deployment:", error);
        toast.error(error.message ?? "Something went wrong");
      },
    }),
  );

  //TODO: add proper loading component
  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (isError || !data) {
    return <Error message={error?.message} />;
  }

  const htmlRoutes: Array<RouteMetaData> =
    data.metadata &&
    typeof data.metadata === "object" &&
    "htmlRoutes" in data.metadata
      ? (data.metadata.htmlRoutes as Array<RouteMetaData>)
      : [];

  const staticAssetRoutes: Array<RouteMetaData> =
    data.metadata &&
    typeof data.metadata === "object" &&
    "assetsRoutes" in data.metadata
      ? (data.metadata.assetsRoutes as Array<RouteMetaData>)
      : [];

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Deployments</h2>
        <div className="flex items-center gap-2">
          <a
            href={"https://" + data.alias}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants()}
          >
            Visit
            <ExternalLinkIcon className="size-4" />
          </a>
          {data.target === "PRODUCTION" && (
            <Button
              variant="outline"
              loading={instantRollbackMutation.isPending}
              disabled={
                data.activeState === "ACTIVE" || data.buildStatus !== "SUCCESS"
              }
              onClick={() => {
                instantRollbackMutation.mutate({
                  projectId: data.projectId,
                  deploymentId: data.id,
                });
              }}
            >
              <RotateCwIcon className="size-4" />
              Instant Rollback
            </Button>
          )}
        </div>
      </div>
      <div className="mt-10 space-y-10">
        <div className="grid grid-cols-1 gap-6 rounded-md border p-5 md:grid-cols-2 md:gap-4">
          {/* <DeploymentDetailCard
            title="Created"
            component={() => (
              <div className="flex items-center gap-1.5">
                <img
                  src={`https://github.com/${data.gitCommitAuthorName}.png`}
                  alt={`${data.gitCommitAuthorName}'s avatar`}
                  className="size-4 rounded-full"
                />
                <p className="text-sm">{data.gitCommitAuthorName}</p>
                <p className="text-muted-foreground text-sm">
                  {format(data.gitCommitTimestamp, "MMM dd")}
                </p>
              </div>
            )}
          /> */}
          <DeploymentDetailCard
            title="Status"
            component={() => {
              const buildStatusMsgMap: Record<typeof data.buildStatus, string> =
                {
                  IN_QUEUE: "In Queue",
                  BUILDING: "Building",
                  SUCCESS: "Ready",
                  FAILED: "Failed",
                };

              const statusColorMap: Record<typeof data.buildStatus, string> = {
                IN_QUEUE: "bg-yellow-500",
                BUILDING: "bg-yellow-500",
                SUCCESS: "bg-emerald-500",
                FAILED: "bg-red-500",
              };
              return (
                <div className="flex items-center gap-1">
                  <Badge variant="secondary" className="gap-1.5">
                    <span
                      className={`size-1.5 rounded-full ${statusColorMap[data.buildStatus]}`}
                      aria-hidden="true"
                    ></span>
                    {buildStatusMsgMap[data.buildStatus]}
                  </Badge>
                  {data.target === "PRODUCTION" &&
                    data.activeState === "ACTIVE" && (
                      <Badge variant="outline">Active</Badge>
                    )}
                </div>
              );
            }}
          />
          <DeploymentDetailCard
            title="Time to Ready"
            component={() => (
              <div className="flex items-center gap-2 text-sm">
                <ClockFadingIcon className="size-4" />
                {data.buildStatus === "SUCCESS" ? (
                  <>
                    <p>{formatMilliseconds(data.buildDurationMs ?? 0)} </p>
                    <p className="text-muted-foreground">
                      ({formatDateToDaysFromNow(data.createdAt)})
                    </p>
                  </>
                ) : (
                  <p>N/A</p>
                )}
              </div>
            )}
          />
          <DeploymentDetailCard
            title="Environment"
            component={() => (
              <div className="flex items-center gap-2 text-sm">
                <ArrowUpCircleIcon className="size-4" />
                <p>
                  {data.target === "PRODUCTION" ? "Production" : "Preview"}{" "}
                </p>
              </div>
            )}
          />
          <DeploymentDetailCard
            title="Domain"
            component={() => (
              <div className="flex items-center gap-2 text-sm">
                <GlobeIcon className="size-4" />
                {data.buildStatus === "SUCCESS" ? (
                  <a
                    href={"https://" + data.alias}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline"
                  >
                    {data.alias}
                  </a>
                ) : (
                  <p>Site is not deployed yet.</p>
                )}
              </div>
            )}
          />
          <DeploymentDetailCard
            title="Source"
            component={() => {
              const branchUrl = new URL(data.project.githubUrl);
              branchUrl.pathname += `/tree/${data.gitRef}`;

              const commitUrl = new URL(data.project.githubUrl);
              commitUrl.pathname += `/commit/${data.gitCommitHash}`;
              return (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <GitBranchIcon className="size-4" />
                    <a
                      href={branchUrl.toString()}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono hover:underline"
                    >
                      {data.gitRef}
                    </a>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <GitCommitIcon className="size-4" />
                    <a
                      href={commitUrl.toString()}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:underline"
                    >
                      <span className="mr-2 font-mono">
                        {data.gitCommitHash.slice(0, 7)}
                      </span>
                      {data.gitCommitMessage}
                    </a>
                  </div>
                </div>
              );
            }}
          />
        </div>
        <div>
          <div className="space-y-4">
            <Accordion type="single" collapsible className="w-full space-y-2">
              <AccordionItem
                value="build-logs"
                className="bg-background has-focus-visible:border-ring has-focus-visible:ring-ring/50 rounded-md border px-4 py-1 outline-none last:border-b has-focus-visible:ring-[3px]"
              >
                <AccordionTrigger className="justify-start gap-3 py-2 text-[15px] leading-6 hover:no-underline focus-visible:ring-0 [&>svg]:-order-1 [&>svg]:-rotate-90 [&[data-state=open]>svg]:rotate-0">
                  Build Logs
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground px-7 py-3">
                  {data.buildStatus === "BUILDING" ? (
                    <LogViewerWithPolling
                      deploymentId={deploymentId}
                      poll={data.buildStatus === "BUILDING"}
                    />
                  ) : (
                    <LogViewer deploymentId={deploymentId} />
                  )}
                </AccordionContent>
              </AccordionItem>
              <AccordionItem
                value="deployment-summary"
                className="bg-background has-focus-visible:border-ring has-focus-visible:ring-ring/50 rounded-md border px-4 py-1 outline-none last:border-b has-focus-visible:ring-[3px]"
              >
                <AccordionTrigger className="justify-start gap-3 py-2 text-[15px] leading-6 hover:no-underline focus-visible:ring-0 [&>svg]:-order-1 [&>svg]:-rotate-90 [&[data-state=open]>svg]:rotate-0">
                  Deployment Summary
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground py-2 ps-7">
                  {!data.metadata ? (
                    "No deployment summary found"
                  ) : (
                    <div>
                      <Tabs defaultValue="html" className="w-full">
                        <TabsList>
                          {htmlRoutes.length > 0 && (
                            <TabsTrigger value="html">HTML</TabsTrigger>
                          )}
                          {staticAssetRoutes.length > 0 && (
                            <TabsTrigger value="assets">
                              Static Assets
                            </TabsTrigger>
                          )}
                        </TabsList>
                        {htmlRoutes.length > 0 && (
                          <TabsContent value="html">
                            <RouteDisplay routes={htmlRoutes} />
                          </TabsContent>
                        )}
                        {staticAssetRoutes.length > 0 && (
                          <TabsContent value="assets">
                            <RouteDisplay routes={staticAssetRoutes} />
                          </TabsContent>
                        )}
                      </Tabs>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </div>
    </div>
  );
}

type DeploymentDetailCardProps = {
  title: string;
  component: () => React.ReactNode;
  className?: string;
};

function DeploymentDetailCard(props: DeploymentDetailCardProps) {
  return (
    <div className={cn("space-y-1", props.className)}>
      <p className="text-muted-foreground text-sm">{props.title}</p>
      <props.component />
    </div>
  );
}

function RouteDisplay({ routes }: { routes: Array<RouteMetaData> }) {
  if (routes.length === 0) {
    return <p>No routes found</p>;
  }
  return (
    <div className="space-y-1 p-3">
      {routes.map((route) => (
        <div
          key={route.route}
          className="flex items-center justify-between font-mono"
        >
          <p className="text-foreground">{route.path}</p>
          <p className="text-muted-foreground whitespace-pre-wrap">
            {formatBytes(route.size)}
          </p>
        </div>
      ))}
    </div>
  );
}
