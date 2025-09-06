"use client"
import React, { useState, useEffect } from "react"
import { Button } from "@/features/shadcn/components/ui/button"
import { Input } from "@/features/shadcn/components/ui/input"
import { Trash2, Plus, Check, X, ArrowUpDown, ChevronDown, Pencil } from "lucide-react"
import { toastify } from "@/features/toast/components/toast"
import { getAllPathsAction, createPathAction, updatePathAction, deletePathAction } from "../actions/pathPassphraseActions"
import { ToastType } from "@/features/toast/types/toast"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/features/shadcn/components/ui/table"
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
   DropdownMenuLabel,
   DropdownMenuSeparator,
   DropdownMenuCheckboxItem,
} from "@/features/shadcn/components/ui/dropdown-menu"
import { Checkbox } from "@/features/shadcn/components/ui/checkbox"
import { Skeleton } from "@/features/shadcn/components/ui/skeleton"
import {
   ColumnDef,
   ColumnFiltersState,
   flexRender,
   getCoreRowModel,
   getFilteredRowModel,
   getPaginationRowModel,
   getSortedRowModel,
   SortingState,
   useReactTable,
   VisibilityState,
} from "@tanstack/react-table"

interface PathEntry {
   id: number
   path: string
   passphrases: string[]
}

// Editable cell components to avoid React hooks issues
function EditablePathCell({
   path,
   loading,
   toggleEditing,
   handleEditPath,
}: {
   path: PathEntry
   loading: boolean
   toggleEditing: (id: number, isEditing: boolean) => void
   handleEditPath: (id: number, newPath: string, newPassphrases: string) => Promise<void>
}) {
   const [pathValue, setPathValue] = useState(path.path)

   useEffect(() => {
      setPathValue(path.path)
   }, [path.path])

   return (
      <Input
         value={pathValue}
         onChange={(e) => setPathValue(e.target.value)}
         className="w-full"
         disabled={loading}
         placeholder="Path"
         onBlur={() => {
            // Only update if value changed
            if (pathValue !== path.path) {
               const passphrasesStr = path.passphrases.join(", ")
               handleEditPath(path.id, pathValue, passphrasesStr)
            } else {
               toggleEditing(path.id, false)
            }
         }}
         onKeyDown={(e) => {
            if (e.key === "Enter" && pathValue) {
               const passphrasesStr = path.passphrases.join(", ")
               handleEditPath(path.id, pathValue, passphrasesStr)
            } else if (e.key === "Escape") {
               setPathValue(path.path)
               toggleEditing(path.id, false)
            }
         }}
         autoFocus
      />
   )
}

function EditablePassphrasesCell({
   path,
   loading,
   toggleEditing,
   handleEditPath,
}: {
   path: PathEntry
   loading: boolean
   toggleEditing: (id: number, isEditing: boolean) => void
   handleEditPath: (id: number, newPath: string, newPassphrases: string) => Promise<void>
}) {
   const [passphrasesValue, setPassphrasesValue] = useState(path.passphrases.join(", "))

   useEffect(() => {
      setPassphrasesValue(path.passphrases.join(", "))
   }, [path.passphrases])

   return (
      <Input
         value={passphrasesValue}
         onChange={(e) => setPassphrasesValue(e.target.value)}
         className="w-full"
         disabled={loading}
         placeholder="Comma-separated passphrases"
         onBlur={() => {
            // Only update if value changed
            if (passphrasesValue !== path.passphrases.join(", ")) {
               handleEditPath(path.id, path.path, passphrasesValue)
            } else {
               toggleEditing(path.id, false)
            }
         }}
         onKeyDown={(e) => {
            if (e.key === "Enter" && passphrasesValue) {
               handleEditPath(path.id, path.path, passphrasesValue)
            } else if (e.key === "Escape") {
               setPassphrasesValue(path.passphrases.join(", "))
               toggleEditing(path.id, false)
            }
         }}
      />
   )
}

export function PassphraseManager() {
   const [paths, setPaths] = useState<PathEntry[]>([])
   const [isAddingNew, setIsAddingNew] = useState(false)
   const [newPath, setNewPath] = useState("")
   const [newPassphrases, setNewPassphrases] = useState("")
   const [editingPaths, setEditingPaths] = useState<Record<number, boolean>>({}) // Track which rows are being edited
   const [loading, setLoading] = useState(false)

   // Table state
   const [sorting, setSorting] = useState<SortingState>([])
   const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
   const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
   const [rowSelection, setRowSelection] = useState({})

   useEffect(() => {
      fetchPaths()
   }, [])

   const fetchPaths = async () => {
      setLoading(true)
      try {
         const response = await getAllPathsAction()
         if (response.success && response.data) {
            setPaths(Array.isArray(response.data) ? (response.data as PathEntry[]) : [])
         } else {
            toastify(response)
         }
      } catch (error) {
         toastify({
            toastTitle: "Sorry",
            toastDescription: "An unexpected error occurred",
            toastType: "error" as ToastType,
            errorCode: "ERROR-123457",
         })
      } finally {
         setLoading(false)
      }
   }

   const handleAddPath = async (e?: React.FormEvent) => {
      if (e) e.preventDefault()
      if (!newPath || !newPassphrases) return

      setLoading(true)
      try {
         const passphrases = newPassphrases.split(",").map((p) => p.trim())
         const response = await createPathAction({ path: newPath, passphrases })

         if (response.success && response.data) {
            setPaths([...paths, response.data as PathEntry])
            setNewPath("")
            setNewPassphrases("")
            setIsAddingNew(false)
         } else {
            toastify(response)
         }
      } catch (error) {
         toastify({
            toastTitle: "Sorry",
            toastDescription: "An unexpected error occurred",
            toastType: "error" as ToastType,
            errorCode: "ERROR-123457",
         })
      } finally {
         setLoading(false)
      }
   }

   const handleEditPath = async (id: number, newPath: string, newPassphrases: string) => {
      setLoading(true)
      try {
         const passphrasesArray = newPassphrases
            .split(",")
            .map((p) => p.trim())
            .filter((p) => p)

         const response = await updatePathAction({ id, path: newPath, passphrases: passphrasesArray })

         if (response.success) {
            setPaths(paths.map((p) => (p.id === id ? { ...p, path: newPath, passphrases: passphrasesArray } : p)))
            toggleEditing(id, false)
         } else {
            toastify(response)
         }
      } catch (error) {
         toastify({
            toastTitle: "Sorry",
            toastDescription: "An unexpected error occurred",
            toastType: "error" as ToastType,
            errorCode: "ERROR-123456",
         })
      } finally {
         setLoading(false)
      }
   }

   const handleDeletePath = async (id: number) => {
      setLoading(true)
      try {
         const response = await deletePathAction({ id })
         if (response.success) {
            setPaths(paths.filter((p) => p.id !== id))
         } else {
            toastify(response)
         }
      } catch (error) {
         toastify({
            toastTitle: "Sorry",
            toastDescription: "An unexpected error occurred",
            toastType: "error" as ToastType,
            errorCode: "ERROR-123457",
         })
      } finally {
         setLoading(false)
      }
   }

   const toggleEditing = (id: number, isEditing: boolean) => {
      setEditingPaths((prev) => ({ ...prev, [id]: isEditing }))
   }

   // Define columns for the data table
   const columns: ColumnDef<PathEntry>[] = [
      {
         id: "select",
         header: ({ table }) => (
            <Checkbox
               checked={table.getIsAllPageRowsSelected() ? true : table.getIsSomePageRowsSelected() ? "indeterminate" : false}
               onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
               aria-label="Select all"
            />
         ),
         cell: ({ row }) => (
            <Checkbox checked={row.getIsSelected()} onCheckedChange={(value) => row.toggleSelected(!!value)} aria-label="Select row" />
         ),
         enableSorting: false,
         enableHiding: false,
      },
      {
         accessorKey: "path",
         header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
               Path
               <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
         ),
         cell: ({ row }) => {
            const path = row.original
            const isEditing = editingPaths[path.id] || false

            if (isEditing) {
               return <EditablePathCell path={path} loading={loading} toggleEditing={toggleEditing} handleEditPath={handleEditPath} />
            }

            return (
               <div className="font-medium flex items-center gap-2 group">
                  <span className="flex-grow">{row.getValue("path")}</span>
                  <Button
                     variant="ghost"
                     size="sm"
                     className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                     onClick={() => toggleEditing(path.id, true)}
                  >
                     <Pencil className="h-3 w-3" />
                  </Button>
               </div>
            )
         },
      },
      {
         accessorKey: "passphrases",
         header: "Passphrases",
         cell: ({ row }) => {
            const path = row.original
            const isEditing = editingPaths[path.id] || false

            if (isEditing) {
               return <EditablePassphrasesCell path={path} loading={loading} toggleEditing={toggleEditing} handleEditPath={handleEditPath} />
            }

            return (
               <div className="flex items-center gap-2 group">
                  <span className="flex-grow">{path.passphrases.join(", ")}</span>
                  <Button
                     variant="ghost"
                     size="sm"
                     className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                     onClick={() => toggleEditing(path.id, true)}
                  >
                     <Pencil className="h-3 w-3" />
                  </Button>
               </div>
            )
         },
      },
      {
         id: "actions",
         enableHiding: false,
         cell: ({ row }) => {
            const path = row.original
            const isEditing = editingPaths[path.id] || false

            if (isEditing) {
               return (
                  <div className="flex space-x-1 justify-center">
                     <Button onClick={() => toggleEditing(path.id, false)} size="sm" variant="ghost" className="h-8 w-8 p-0" disabled={loading}>
                        <X className="h-4 w-4 text-red-500" />
                     </Button>
                  </div>
               )
            }

            return (
               <div className="flex justify-center">
                  <Button
                     onClick={() => handleDeletePath(path.id)}
                     size="sm"
                     variant="ghost"
                     className="h-8 w-8 p-0 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                     disabled={loading}
                  >
                     <Trash2 className="h-4 w-4" />
                  </Button>
               </div>
            )
         },
      },
   ]

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
   })

   return (
      <div className="space-y-6 p-6 bg-background rounded-lg shadow-xl   max-w-4xl mx-auto">
         <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Passphrase Manager</h1>
         </div>

         {/* Paths Data Table */}
         {loading ? (
            <div className="space-y-4">
               <div className="flex items-center py-4">
                  <Skeleton className="h-10 w-[250px]" />
                  <Skeleton className="h-10 w-[100px] ml-auto" />
               </div>
               <div className="rounded-md border">
                  <div className="h-24 flex items-center justify-center">
                     <Skeleton className="h-8 w-[250px]" />
                  </div>
               </div>
            </div>
         ) : (
            <div className="w-full">
               <div className="flex items-center py-4">
                  <Input
                     placeholder="Filter paths..."
                     value={(table.getColumn("path")?.getFilterValue() as string) ?? ""}
                     onChange={(event) => table.getColumn("path")?.setFilterValue(event.target.value)}
                     className="max-w-sm"
                  />
                  <DropdownMenu>
                     <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="ml-auto">
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
                                    key={column.id}
                                    className="capitalize"
                                    checked={column.getIsVisible()}
                                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                                 >
                                    {column.id}
                                 </DropdownMenuCheckboxItem>
                              )
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
                                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                 </TableHead>
                              ))}
                           </TableRow>
                        ))}
                     </TableHeader>
                     <TableBody>
                        {table.getRowModel().rows?.length ? (
                           table.getRowModel().rows.map((row) => (
                              <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                                 {row.getVisibleCells().map((cell) => (
                                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                                 ))}
                              </TableRow>
                           ))
                        ) : (
                           <TableRow>
                              <TableCell colSpan={columns.length} className="h-24 text-center">
                                 No paths found.
                              </TableCell>
                           </TableRow>
                        )}

                        {/* Add New Row */}
                        {isAddingNew && (
                           <TableRow>
                              <TableCell></TableCell>
                              {/* Empty cell for checkbox */}
                              <TableCell>
                                 <Input
                                    value={newPath}
                                    onChange={(e) => setNewPath(e.target.value)}
                                    className="w-full"
                                    disabled={loading}
                                    placeholder="New path"
                                 />
                              </TableCell>
                              <TableCell>
                                 <Input
                                    value={newPassphrases}
                                    onChange={(e) => setNewPassphrases(e.target.value)}
                                    className="w-full"
                                    disabled={loading}
                                    placeholder="Comma-separated passphrases"
                                 />
                              </TableCell>
                              <TableCell>
                                 <div className="flex space-x-1">
                                    <Button
                                       onClick={handleAddPath}
                                       size="sm"
                                       variant="ghost"
                                       className="h-8 w-8 p-0"
                                       disabled={loading || !newPath || !newPassphrases}
                                    >
                                       <Check className="h-4 w-4 text-green-500" />
                                    </Button>
                                    <Button
                                       onClick={() => {
                                          setIsAddingNew(false)
                                          setNewPath("")
                                          setNewPassphrases("")
                                       }}
                                       size="sm"
                                       variant="ghost"
                                       className="h-8 w-8 p-0"
                                       disabled={loading}
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
                  <div className="flex-1 text-sm text-muted-foreground">
                     {table.getFilteredSelectedRowModel().rows.length} of {table.getFilteredRowModel().rows.length} row(s) selected.
                  </div>

                  <div className="space-x-2 flex items-center">
                     {!isAddingNew && (
                        <Button onClick={() => setIsAddingNew(true)} variant="outline" size="sm" disabled={loading}>
                           <Plus className="h-4 w-4 mr-2" /> Add New Path
                        </Button>
                     )}
                     <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage() || loading}>
                        Previous
                     </Button>
                     <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage() || loading}>
                        Next
                     </Button>
                  </div>
               </div>
            </div>
         )}
      </div>
   )
}
