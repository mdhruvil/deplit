import { cn } from "@/lib/utils";
import { trpc } from "@/router";
import { useQuery } from "@tanstack/react-query";

export function LogViewerWithPolling({
  deploymentId,
  poll,
}: {
  deploymentId: string;
  poll?: boolean;
}) {
  const { data, isLoading, error } = useQuery(
    trpc.deployment.pollLogs.queryOptions(
      { deploymentId },
      { refetchInterval: poll ? 1000 : false },
    ),
  );

  if (isLoading) {
    return <div>Loading logs...</div>;
  }

  if (error || !data) {
    return <div>Error loading logs: {error?.message}</div>;
  }
  return (
    <div className="h-100 overflow-auto font-mono">
      {data.length === 0 && (
        <div className="flex h-full items-center justify-center">
          <p className="text-gray-500">No logs available</p>
        </div>
      )}
      {data.map((log, index) => (
        <div
          key={index}
          className={cn(
            "flex items-start gap-10",
            log.level === "error" && "text-destructive",
          )}
        >
          <p>{new Date(log.timestamp).toISOString()}</p>
          <p>{log.message}</p>
        </div>
      ))}
    </div>
  );
}

export function LogViewer({
  deploymentId,
}: {
  deploymentId: string;
  poll?: boolean;
}) {
  const { data, isLoading, error } = useQuery(
    trpc.deployment.getLogs.queryOptions({ deploymentId }),
  );

  if (isLoading) {
    return <div>Loading logs...</div>;
  }

  if (error || !data) {
    return <div>Error loading logs: {error?.message}</div>;
  }
  return (
    <div className="h-100 overflow-auto font-mono">
      {data.length === 0 && (
        <div className="flex h-full items-center justify-center">
          <p className="text-gray-500">No logs available</p>
        </div>
      )}
      {data.map((log, index) => (
        <div
          key={index}
          className={cn(
            "flex items-start gap-10",
            log.level === "error" && "text-destructive",
          )}
        >
          <p>{new Date(log.timestamp).toISOString()}</p>
          <p>{log.message}</p>
        </div>
      ))}
    </div>
  );
}
