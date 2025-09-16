"use client";
import {
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  ChevronDown,
  FileText,
  RefreshCw,
  Trash2,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import {
  Badge,
  Button,
  Checkbox,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  Input,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/features/shadcn/index.client";
import { toastify } from "@/features/toast/components/toast";
import type { ToastType } from "@/features/toast/types/toast";
import {
  deleteUploadSessionAction,
  getAllUploadSessionsAction,
  retryJobAction,
} from "../actions/fileUploadManagerActions";
import {
  FileStatus,
  JobStatus,
  JobType,
  ProcessingJob,
  parseObjectKey,
  type UploadSession,
} from "../types/database";

// Helper function to format date
const formatDate = (date: Date | null | undefined) => {
  if (!date) return "—";
  return new Date(date).toLocaleString();
};

// Helper function to get status badge color
const getStatusBadge = (status: FileStatus) => {
  switch (status) {
    case FileStatus.PENDING_UPLOAD:
      return <Badge variant="outline">Pending Upload</Badge>;
    case FileStatus.UPLOADING:
      return <Badge variant="secondary">Uploading</Badge>;
    case FileStatus.UPLOADED:
      return <Badge variant="secondary">Uploaded</Badge>;
    case FileStatus.PROCESSING:
      return (
        <Badge
          className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
          variant="outline"
        >
          Processing
        </Badge>
      );
    case FileStatus.COMPLETED:
      return (
        <Badge
          className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
          variant="outline"
        >
          Completed
        </Badge>
      );
    case FileStatus.FAILED:
      return <Badge variant="destructive">Failed</Badge>;
    case FileStatus.DELETED:
      return (
        <Badge className="text-muted-foreground" variant="outline">
          Deleted
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

// Helper function to get job status badge color
const getJobStatusBadge = (status: JobStatus) => {
  switch (status) {
    case JobStatus.PENDING:
      return <Badge variant="outline">Pending</Badge>;
    case JobStatus.RUNNING:
      return <Badge variant="secondary">Running</Badge>;
    case JobStatus.COMPLETED:
      return (
        <Badge
          className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
          variant="outline"
        >
          Completed
        </Badge>
      );
    case JobStatus.FAILED:
      return <Badge variant="destructive">Failed</Badge>;
    case JobStatus.CANCELLED:
      return (
        <Badge className="text-muted-foreground" variant="outline">
          Cancelled
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export function FileUploadManager() {
  const [uploadSessions, setUploadSessions] = useState<UploadSession[]>([]);
  const [loading, setLoading] = useState(false);

  // Table state
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});

  useEffect(() => {
    fetchUploadSessions();
  }, []);

  const fetchUploadSessions = async () => {
    setLoading(true);
    try {
      console.log("Client: Fetching upload sessions...");
      const response = await getAllUploadSessionsAction();
      console.log("Client: Response received:", response);

      if (response.success && response.data) {
        const sessionsArray = Array.isArray(response.data)
          ? (response.data as UploadSession[])
          : [];
        console.log(`Client: Found ${sessionsArray.length} sessions`);
        setUploadSessions(sessionsArray);
      } else {
        console.log("Client: No data in response or request failed");
        toastify(response);
      }
    } catch (error) {
      console.error("Client: Error fetching sessions:", error);
      toastify({
        toastTitle: "Sorry",
        toastDescription: "An unexpected error occurred",
        toastType: "error" as ToastType,
        errorCode: "UPLOAD-ERR-001",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = async (id: string) => {
    setLoading(true);
    try {
      const response = await deleteUploadSessionAction({ id });
      if (response.success) {
        // Update the local state to reflect the deletion
        setUploadSessions(
          uploadSessions.map((session) =>
            session.id === id
              ? { ...session, status: FileStatus.DELETED }
              : session
          )
        );
        toastify(response);
      } else {
        toastify(response);
      }
    } catch (error) {
      toastify({
        toastTitle: "Sorry",
        toastDescription: "An unexpected error occurred",
        toastType: "error" as ToastType,
        errorCode: "UPLOAD-ERR-002",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRetryJob = async (jobId: string) => {
    setLoading(true);
    try {
      const response = await retryJobAction({ jobId });
      if (response.success) {
        // Refresh the data to show updated job status
        await fetchUploadSessions();
        toastify(response);
      } else {
        toastify(response);
      }
    } catch (error) {
      toastify({
        toastTitle: "Sorry",
        toastDescription: "An unexpected error occurred",
        toastType: "error" as ToastType,
        errorCode: "UPLOAD-ERR-003",
      });
    } finally {
      setLoading(false);
    }
  };

  // Define columns for the data table
  const columns: ColumnDef<UploadSession>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          aria-label="Select all"
          checked={
            table.getIsAllPageRowsSelected()
              ? true
              : table.getIsSomePageRowsSelected()
                ? "indeterminate"
                : false
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          aria-label="Select row"
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "objectKey",
      header: ({ column }) => (
        <Button
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          variant="ghost"
        >
          File
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const objectKey = row.getValue("objectKey") as string;
        const { fileName } = parseObjectKey(objectKey);
        return (
          <div className="flex items-center gap-2 font-medium">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="max-w-[200px] truncate" title={fileName}>
              {fileName}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as FileStatus;
        return getStatusBadge(status);
      },
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <Button
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          variant="ghost"
        >
          Created
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        return formatDate(row.original.createdAt);
      },
    },
    {
      accessorKey: "uploadedAt",
      header: "Uploaded",
      cell: ({ row }) => {
        return formatDate(row.original.uploadedAt);
      },
    },
    {
      id: "jobs",
      header: "Jobs",
      cell: ({ row }) => {
        const jobs = row.original.jobs || [];
        if (jobs.length === 0) return "—";

        return (
          <div className="space-y-1">
            {jobs.map((job) => (
              <div
                className="flex items-center justify-between text-xs"
                key={job.id}
              >
                <span className="mr-2">{job.type}</span>
                {getJobStatusBadge(job.status)}
                {job.status === JobStatus.FAILED && (
                  <Button
                    className="h-6 w-6 p-0"
                    disabled={loading}
                    onClick={() => handleRetryJob(job.id)}
                    size="sm"
                    variant="ghost"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        );
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const session = row.original;
        const canDelete = session.status !== FileStatus.DELETED;

        return (
          <div className="flex justify-center">
            {canDelete && (
              <Button
                className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive/90"
                disabled={loading}
                onClick={() => handleDeleteSession(session.id)}
                size="sm"
                variant="ghost"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  // Initialize the table
  const table = useReactTable({
    data: uploadSessions,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: { sorting, columnFilters, columnVisibility, rowSelection },
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6 rounded-lg bg-background p-6 shadow-xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-bold text-2xl">File Upload Manager</h1>
        <Button
          disabled={loading}
          onClick={fetchUploadSessions}
          size="sm"
          variant="outline"
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Upload Sessions Data Table */}
      {loading && uploadSessions.length === 0 ? (
        <div className="space-y-4">
          <div className="flex items-center py-4">
            <Skeleton className="h-10 w-[250px]" />
            <Skeleton className="ml-auto h-10 w-[100px]" />
          </div>
          <div className="rounded-md border">
            <div className="flex h-24 items-center justify-center">
              <Skeleton className="h-8 w-[250px]" />
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full">
          <div className="flex items-center py-4">
            <Input
              className="max-w-sm"
              onChange={(event) =>
                table.getColumn("objectKey")?.setFilterValue(event.target.value)
              }
              placeholder="Filter files..."
              value={
                (table.getColumn("objectKey")?.getFilterValue() as string) ?? ""
              }
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="ml-auto" variant="outline">
                  Columns <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {table
                  .getAllColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => {
                    return (
                      <DropdownMenuCheckboxItem
                        checked={column.getIsVisible()}
                        className="capitalize"
                        key={column.id}
                        onCheckedChange={(value) =>
                          column.toggleVisibility(!!value)
                        }
                      >
                        {column.id}
                      </DropdownMenuCheckboxItem>
                    );
                  })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="border">
            <Table>
              <TableHeader className="bg-muted">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      data-state={row.getIsSelected() && "selected"}
                      key={row.id}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      className="h-24 text-center"
                      colSpan={columns.length}
                    >
                      No upload sessions found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between space-x-2 py-4">
            <div className="flex-1 text-muted-foreground text-sm">
              {table.getFilteredSelectedRowModel().rows.length} of{" "}
              {table.getFilteredRowModel().rows.length} row(s) selected.
            </div>

            <div className="flex items-center space-x-2">
              <Button
                disabled={!table.getCanPreviousPage() || loading}
                onClick={() => table.previousPage()}
                size="sm"
                variant="outline"
              >
                Previous
              </Button>
              <Button
                disabled={!table.getCanNextPage() || loading}
                onClick={() => table.nextPage()}
                size="sm"
                variant="outline"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
