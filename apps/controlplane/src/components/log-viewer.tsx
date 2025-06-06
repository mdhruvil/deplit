import { cn } from "@/lib/utils";
import { trpc } from "@/router";
import { useQuery } from "@tanstack/react-query";
import { Error } from "./error";
import { ScrollArea, ScrollBar } from "./ui/scroll-area";

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
    return <LogViewerLoading />;
  }

  if (error || !data) {
    return <Error message={error?.message} />;
  }
  return (
    <ScrollArea className="h-150 font-mono leading-normal">
      {data.length === 0 && (
        <div className="flex h-full items-center justify-center">
          <p className="text-gray-500">No logs available</p>
        </div>
      )}
      <div className="py-2">
        {data.map((log, index) => (
          <LogLine key={index} log={log} />
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
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
    return <LogViewerLoading />;
  }

  if (error || !data) {
    return <Error message={error?.message} />;
  }
  return (
    <ScrollArea className="h-150 font-mono leading-normal">
      {data.length === 0 && (
        <div className="flex h-full items-center justify-center">
          <p className="text-gray-500">No logs available</p>
        </div>
      )}
      <div className="py-2">
        {data.map((log, index) => (
          <LogLine key={index} log={log} />
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}

function LogViewerLoading() {
  return (
    <div className="flex h-100 items-center justify-center font-mono">
      <p className="text-gray-500">Loading logs...</p>
    </div>
  );
}

function LogLine({
  log,
}: {
  log: { message: string; timestamp: Date | string; level: string };
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-5",
        log.level === "error" && "text-destructive",
      )}
    >
      <p className="select-none">{new Date(log.timestamp).toISOString()}</p>
      <pre>{log.message}</pre>
    </div>
  );
}
