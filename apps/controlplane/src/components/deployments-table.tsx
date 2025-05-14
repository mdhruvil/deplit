import {
  deploymentTargetToText,
  formatDateToDaysFromNow,
  formatMilliseconds,
} from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import {
  ColumnDef,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { formatDate } from "date-fns";
import { GitBranchIcon, GitCommitIcon } from "lucide-react";
import { Badge } from "./ui/badge";
import { Table, TableBody, TableCell, TableRow } from "./ui/table";

type Deployment = {
  id: string;
  projectId: string;
  gitCommitHash: string;
  gitRef: string;
  gitCommitMessage: string;
  gitCommitAuthorName: string;
  gitCommitTimestamp: Date;
  buildStatus: "IN_QUEUE" | "BUILDING" | "SUCCESS" | "FAILED";
  buildDurationMs: number | null;
  target: "PRODUCTION" | "PREVIEW";
  activeState: "ACTIVE" | "INACTIVE" | "NA";
  alias: string;
  createdAt: Date;
  updatedAt: Date;
};

const columnHelper = createColumnHelper<Deployment>();

const columns: ColumnDef<Deployment>[] = [
  columnHelper.display({
    id: "deployment-id-and-target",
    cell: ({ row }) => {
      const { gitCommitHash, target, projectId } = row.original;
      return (
        <Link
          to="/dashboard/project/$projectId/$deploymentId"
          params={{ deploymentId: row.original.id, projectId }}
        >
          <div className="py-2 pl-3">
            <p className="font-semibold">{gitCommitHash.slice(0, 7)}</p>
            <p className="text-muted-foreground text-sm">
              {deploymentTargetToText(target)}
            </p>
          </div>
        </Link>
      );
    },
  }),

  columnHelper.display({
    id: "build-status-and-duration",
    cell: ({ row }) => {
      const { buildStatus, buildDurationMs, createdAt, projectId } =
        row.original;

      const buildStatusMsgMap: Record<typeof buildStatus, string> = {
        IN_QUEUE: "In Queue",
        BUILDING: "Building",
        SUCCESS: "Ready",
        FAILED: "Failed",
      };

      const statusColorMap: Record<typeof buildStatus, string> = {
        IN_QUEUE: "bg-yellow-500",
        BUILDING: "bg-yellow-500",
        SUCCESS: "bg-emerald-500",
        FAILED: "bg-red-500",
      };
      return (
        <Link
          to="/dashboard/project/$projectId/$deploymentId"
          params={{ deploymentId: row.original.id, projectId }}
        >
          <div className="space-y-1 py-2 text-sm">
            <Badge variant="secondary" className="gap-1.5">
              <span
                className={`size-1.5 rounded-full ${statusColorMap[buildStatus]}`}
                aria-hidden="true"
              ></span>
              {buildStatusMsgMap[buildStatus]}
            </Badge>
            <p className="text-muted-foreground text-xs">
              {formatMilliseconds(buildDurationMs ?? 0)} (
              {formatDateToDaysFromNow(createdAt)})
            </p>
          </div>
        </Link>
      );
    },
  }),

  columnHelper.display({
    id: "git-commit-data",
    cell: ({ row }) => {
      const { gitRef, gitCommitMessage, projectId } = row.original;
      return (
        <Link
          to="/dashboard/project/$projectId/$deploymentId"
          params={{ deploymentId: row.original.id, projectId }}
        >
          <div className="max-w-fit space-y-1 py-2 text-sm text-wrap">
            <p className="flex items-center gap-1 font-mono">
              <GitBranchIcon className="size-3" />
              {gitRef}
            </p>
            <p className="flex items-center gap-1">
              <GitCommitIcon className="size-3.5" />
              {gitCommitMessage}
            </p>
          </div>
        </Link>
      );
    },
  }),

  columnHelper.display({
    id: "git-commit-author-and-time",
    cell: ({ row }) => {
      const { gitCommitTimestamp, projectId } = row.original;
      return (
        <Link
          to="/dashboard/project/$projectId/$deploymentId"
          params={{ deploymentId: row.original.id, projectId }}
          className="w-full"
        >
          <div className="text-muted-foreground py-2 pr-3 text-end text-sm">
            {formatDate(gitCommitTimestamp, "MMM dd")}
          </div>
        </Link>
      );
    },
  }),
];

export function DeploymentTable({
  data,
}: {
  data: Deployment[];
  projectId: string;
}) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="rounded-md border">
      <Table className="">
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
                className="max-sm:grid max-sm:grid-cols-2 max-sm:items-center max-sm:gap-2"
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
