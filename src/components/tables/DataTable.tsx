"use client";

import React, { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
} from "@tanstack/react-table";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { ArrowUpIcon, ArrowDownIcon } from "@/icons";
import Pagination from "./Pagination";

interface DataTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData, any>[];
  enableFilters?: boolean;
  enablePagination?: boolean;
  pageSize?: number;
}

/**
 * DataTable Component
 *
 * A reusable table component powered by @tanstack/react-table with:
 * - Column sorting (click headers to sort ascending/descending)
 * - Column filtering (text input per column)
 * - Pagination with customizable page size
 * - Dark mode support
 * - Accessibility features (ARIA labels, keyboard navigation)
 *
 * @param data - Array of data objects to display
 * @param columns - Column definitions (use createColumns helper)
 * @param enableFilters - Show filter inputs below headers (default: true)
 * @param enablePagination - Enable pagination controls (default: true)
 * @param pageSize - Number of rows per page (default: 10)
 */
export function DataTable<TData>({
  data,
  columns,
  enableFilters = true,
  enablePagination = true,
  pageSize = 10,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: enablePagination ? getPaginationRowModel() : undefined,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: {
      sorting,
      columnFilters,
    },
    initialState: {
      pagination: {
        pageSize,
      },
    },
  });

  const totalPages = enablePagination
    ? table.getPageCount()
    : 1;
  const currentPage = enablePagination
    ? table.getState().pagination.pageIndex + 1
    : 1;

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="border-b border-gray-100 dark:border-gray-800">
            {/* Header Row with Sorting */}
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const isSorted = header.column.getIsSorted();

                  return (
                    <TableCell
                      key={header.id}
                      isHeader
                      className={`px-5 py-3 dark:text-white ${
                        canSort ? "cursor-pointer select-none hover:bg-gray-50 dark:hover:bg-gray-800" : ""
                      }`}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                    >
                      {header.isPlaceholder ? null : (
                        <div className="flex items-center gap-2">
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {canSort && (
                            <span className="inline-flex">
                              {isSorted === "asc" ? (
                                <ArrowUpIcon className="w-4 h-4 text-brand-500" />
                              ) : isSorted === "desc" ? (
                                <ArrowDownIcon className="w-4 h-4 text-brand-500" />
                              ) : (
                                <span className="w-4 h-4 opacity-30">
                                  <ArrowUpIcon className="w-4 h-4" />
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}

            {/* Filter Row */}
            {enableFilters && (
              <TableRow>
                {table.getHeaderGroups()[0].headers.map((header) => {
                  const canFilter = header.column.getCanFilter();

                  return (
                    <TableCell key={`filter-${header.id}`} className="px-5 py-2">
                      {canFilter ? (
                        <input
                          type="text"
                          value={(header.column.getFilterValue() as string) ?? ""}
                          onChange={(e) =>
                            header.column.setFilterValue(e.target.value)
                          }
                          placeholder="Filtrar"
                          className="w-full px-2 py-1 text-sm border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                          aria-label={`Filtrar ${header.column.columnDef.header}`}
                        />
                      ) : null}
                    </TableCell>
                  );
                })}
              </TableRow>
            )}
          </TableHeader>

          {/* Body Rows */}
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-5 py-2 dark:text-white">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="px-5 py-8 text-center text-gray-500 dark:text-gray-400"
                >
                  No se encontraron resultados
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {enablePagination && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Mostrando {table.getRowModel().rows.length} de {data.length} resultados
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(page) => table.setPageIndex(page - 1)}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Helper function to create action column with edit/delete buttons
 * Use this in your column definitions for consistent action buttons
 *
 * @example
 * const columns = [
 *   ...otherColumns,
 *   createActionColumn<Product>({
 *     onEdit: (id) => router.push(`/productos/${id}/edit`),
 *     onDelete: (id) => handleDelete(id),
 *   })
 * ];
 */
export function createActionColumn<TData extends { [key: string]: any }>(options: {
  onEdit?: (id: any) => void;
  onDelete?: (id: any) => void;
  editHref?: (id: any) => string;
  idField?: string;
}): ColumnDef<TData, any> {
  const { onEdit, onDelete, editHref, idField = "id" } = options;

  return {
    id: "actions",
    header: "Acciones",
    enableSorting: false,
    enableColumnFilter: false,
    cell: ({ row }) => {
      const id = row.original[idField];
      const PencilIcon = require("@/icons").PencilIcon;
      const TrashBinIcon = require("@/icons").TrashBinIcon;

      return (
        <div className="flex space-x-2">
          {(onEdit || editHref) && (
            editHref ? (
              <a
                href={editHref(id)}
                className="text-brand-500 hover:text-brand-600 dark:text-brand-400"
                aria-label="Editar"
              >
                <PencilIcon className="w-5 h-5" />
              </a>
            ) : (
              <button
                onClick={() => onEdit?.(id)}
                className="text-brand-500 hover:text-brand-600 dark:text-brand-400"
                aria-label="Editar"
              >
                <PencilIcon className="w-5 h-5" />
              </button>
            )
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(id)}
              className="text-error-500 hover:text-error-600"
              aria-label="Eliminar"
            >
              <TrashBinIcon className="w-5 h-5" />
            </button>
          )}
        </div>
      );
    },
  };
}
