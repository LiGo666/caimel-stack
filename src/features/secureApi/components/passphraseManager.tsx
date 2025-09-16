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
  Check,
  ChevronDown,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import {
  Button,
  Checkbox,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
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
  createPathAction,
  deletePathAction,
  getAllPathsAction,
  updatePathAction,
} from "../actions/pathPassphraseActions";

interface PathEntry {
  id: number;
  path: string;
  passphrases: string[];
}

// Editable cell components to avoid React hooks issues
function EditablePathCell({
  path,
  loading,
  toggleEditing,
  handleEditPath,
}: {
  path: PathEntry;
  loading: boolean;
  toggleEditing: (id: number, isEditing: boolean) => void;
  handleEditPath: (
    id: number,
    newPath: string,
    newPassphrases: string
  ) => Promise<void>;
}) {
  const [pathValue, setPathValue] = useState(path.path);

  useEffect(() => {
    setPathValue(path.path);
  }, [path.path]);

  return (
    <Input
      autoFocus
      className="w-full"
      disabled={loading}
      onBlur={() => {
        // Only update if value changed
        if (pathValue !== path.path) {
          const passphrasesStr = path.passphrases.join(", ");
          handleEditPath(path.id, pathValue, passphrasesStr);
        } else {
          toggleEditing(path.id, false);
        }
      }}
      onChange={(e) => setPathValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && pathValue) {
          const passphrasesStr = path.passphrases.join(", ");
          handleEditPath(path.id, pathValue, passphrasesStr);
        } else if (e.key === "Escape") {
          setPathValue(path.path);
          toggleEditing(path.id, false);
        }
      }}
      placeholder="Path"
      value={pathValue}
    />
  );
}

function EditablePassphrasesCell({
  path,
  loading,
  toggleEditing,
  handleEditPath,
}: {
  path: PathEntry;
  loading: boolean;
  toggleEditing: (id: number, isEditing: boolean) => void;
  handleEditPath: (
    id: number,
    newPath: string,
    newPassphrases: string
  ) => Promise<void>;
}) {
  const [passphrasesValue, setPassphrasesValue] = useState(
    path.passphrases.join(", ")
  );

  useEffect(() => {
    setPassphrasesValue(path.passphrases.join(", "));
  }, [path.passphrases]);

  return (
    <Input
      className="w-full"
      disabled={loading}
      onBlur={() => {
        // Only update if value changed
        if (passphrasesValue !== path.passphrases.join(", ")) {
          handleEditPath(path.id, path.path, passphrasesValue);
        } else {
          toggleEditing(path.id, false);
        }
      }}
      onChange={(e) => setPassphrasesValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && passphrasesValue) {
          handleEditPath(path.id, path.path, passphrasesValue);
        } else if (e.key === "Escape") {
          setPassphrasesValue(path.passphrases.join(", "));
          toggleEditing(path.id, false);
        }
      }}
      placeholder="Comma-separated passphrases"
      value={passphrasesValue}
    />
  );
}

export function PassphraseManager() {
  const [paths, setPaths] = useState<PathEntry[]>([]);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newPath, setNewPath] = useState("");
  const [newPassphrases, setNewPassphrases] = useState("");
  const [editingPaths, setEditingPaths] = useState<Record<number, boolean>>({}); // Track which rows are being edited
  const [loading, setLoading] = useState(false);

  // Table state
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});

  useEffect(() => {
    fetchPaths();
  }, []);

  const fetchPaths = async () => {
    setLoading(true);
    try {
      const response = await getAllPathsAction();
      if (response.success && response.data) {
        setPaths(
          Array.isArray(response.data) ? (response.data as PathEntry[]) : []
        );
      } else {
        toastify(response);
      }
    } catch (error) {
      toastify({
        toastTitle: "Sorry",
        toastDescription: "An unexpected error occurred",
        toastType: "error" as ToastType,
        errorCode: "ERROR-123457",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddPath = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!(newPath && newPassphrases)) return;

    setLoading(true);
    try {
      const passphrases = newPassphrases.split(",").map((p) => p.trim());
      const response = await createPathAction({ path: newPath, passphrases });

      if (response.success && response.data) {
        setPaths([...paths, response.data as PathEntry]);
        setNewPath("");
        setNewPassphrases("");
        setIsAddingNew(false);
      } else {
        toastify(response);
      }
    } catch (error) {
      toastify({
        toastTitle: "Sorry",
        toastDescription: "An unexpected error occurred",
        toastType: "error" as ToastType,
        errorCode: "ERROR-123457",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditPath = async (
    id: number,
    newPath: string,
    newPassphrases: string
  ) => {
    setLoading(true);
    try {
      const passphrasesArray = newPassphrases
        .split(",")
        .map((p) => p.trim())
        .filter((p) => p);

      const response = await updatePathAction({
        id,
        path: newPath,
        passphrases: passphrasesArray,
      });

      if (response.success) {
        setPaths(
          paths.map((p) =>
            p.id === id
              ? { ...p, path: newPath, passphrases: passphrasesArray }
              : p
          )
        );
        toggleEditing(id, false);
      } else {
        toastify(response);
      }
    } catch (error) {
      toastify({
        toastTitle: "Sorry",
        toastDescription: "An unexpected error occurred",
        toastType: "error" as ToastType,
        errorCode: "ERROR-123456",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePath = async (id: number) => {
    setLoading(true);
    try {
      const response = await deletePathAction({ id });
      if (response.success) {
        setPaths(paths.filter((p) => p.id !== id));
      } else {
        toastify(response);
      }
    } catch (error) {
      toastify({
        toastTitle: "Sorry",
        toastDescription: "An unexpected error occurred",
        toastType: "error" as ToastType,
        errorCode: "ERROR-123457",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleEditing = (id: number, isEditing: boolean) => {
    setEditingPaths((prev) => ({ ...prev, [id]: isEditing }));
  };

  // Define columns for the data table
  const columns: ColumnDef<PathEntry>[] = [
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
      accessorKey: "path",
      header: ({ column }) => (
        <Button
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          variant="ghost"
        >
          Path
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const path = row.original;
        const isEditing = editingPaths[path.id];

        if (isEditing) {
          return (
            <EditablePathCell
              handleEditPath={handleEditPath}
              loading={loading}
              path={path}
              toggleEditing={toggleEditing}
            />
          );
        }

        return (
          <div className="group flex items-center gap-2 font-medium">
            <span className="flex-grow">{row.getValue("path")}</span>
            <Button
              className="h-6 w-6 p-0 opacity-0 transition-opacity group-hover:opacity-100"
              onClick={() => toggleEditing(path.id, true)}
              size="sm"
              variant="ghost"
            >
              <Pencil className="h-3 w-3" />
            </Button>
          </div>
        );
      },
    },
    {
      accessorKey: "passphrases",
      header: "Passphrases",
      cell: ({ row }) => {
        const path = row.original;
        const isEditing = editingPaths[path.id];

        if (isEditing) {
          return (
            <EditablePassphrasesCell
              handleEditPath={handleEditPath}
              loading={loading}
              path={path}
              toggleEditing={toggleEditing}
            />
          );
        }

        return (
          <div className="group flex items-center gap-2">
            <span className="flex-grow">{path.passphrases.join(", ")}</span>
            <Button
              className="h-6 w-6 p-0 opacity-0 transition-opacity group-hover:opacity-100"
              onClick={() => toggleEditing(path.id, true)}
              size="sm"
              variant="ghost"
            >
              <Pencil className="h-3 w-3" />
            </Button>
          </div>
        );
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const path = row.original;
        const isEditing = editingPaths[path.id];

        if (isEditing) {
          return (
            <div className="flex justify-center space-x-1">
              <Button
                className="h-8 w-8 p-0"
                disabled={loading}
                onClick={() => toggleEditing(path.id, false)}
                size="sm"
                variant="ghost"
              >
                <X className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          );
        }

        return (
          <div className="flex justify-center">
            <Button
              className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive/90"
              disabled={loading}
              onClick={() => handleDeletePath(path.id)}
              size="sm"
              variant="ghost"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  // Initialize the table
  const table = useReactTable({
    data: paths,
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
    <div className="mx-auto max-w-4xl space-y-6 rounded-lg bg-background p-6 shadow-xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-bold text-2xl">Passphrase Manager</h1>
      </div>

      {/* Paths Data Table */}
      {loading ? (
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
                table.getColumn("path")?.setFilterValue(event.target.value)
              }
              placeholder="Filter paths..."
              value={
                (table.getColumn("path")?.getFilterValue() as string) ?? ""
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
                      No paths found.
                    </TableCell>
                  </TableRow>
                )}

                {/* Add New Row */}
                {isAddingNew && (
                  <TableRow>
                    <TableCell />
                    {/* Empty cell for checkbox */}
                    <TableCell>
                      <Input
                        className="w-full"
                        disabled={loading}
                        onChange={(e) => setNewPath(e.target.value)}
                        placeholder="New path"
                        value={newPath}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        className="w-full"
                        disabled={loading}
                        onChange={(e) => setNewPassphrases(e.target.value)}
                        placeholder="Comma-separated passphrases"
                        value={newPassphrases}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-1">
                        <Button
                          className="h-8 w-8 p-0"
                          disabled={loading || !newPath || !newPassphrases}
                          onClick={handleAddPath}
                          size="sm"
                          variant="ghost"
                        >
                          <Check className="h-4 w-4 text-green-500" />
                        </Button>
                        <Button
                          className="h-8 w-8 p-0"
                          disabled={loading}
                          onClick={() => {
                            setIsAddingNew(false);
                            setNewPath("");
                            setNewPassphrases("");
                          }}
                          size="sm"
                          variant="ghost"
                        >
                          <X className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
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
              {!isAddingNew && (
                <Button
                  disabled={loading}
                  onClick={() => setIsAddingNew(true)}
                  size="sm"
                  variant="outline"
                >
                  <Plus className="mr-2 h-4 w-4" /> Add New Path
                </Button>
              )}
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
