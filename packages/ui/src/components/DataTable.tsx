import { useMemo, useState } from 'react'
import {
  flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel,
  getSortedRowModel, useReactTable,
  type ColumnDef, type SortingState, type VisibilityState, type RowSelectionState,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ArrowUpDown, ArrowUp, ArrowDown, Columns3, Download, Rows3, Trash2 } from 'lucide-react'
import { cn } from '../lib/cn'
import { Button } from './Button'
import { Checkbox } from './Field'
import { SearchField } from './SearchField'
import { Popover } from './Overlays'
import { Pagination } from './Pagination'
import { EmptyState } from './Feedback'

export interface DataTableProps<T> {
  data: T[]
  columns: ColumnDef<T, any>[]
  getRowId?: (row: T, index: number) => string
  searchPlaceholder?: string
  onRowClick?: (row: T) => void
  mobileCard?: (row: T) => React.ReactNode
  bulkActions?: { label: string; onAction: (ids: string[]) => void; danger?: boolean }[]
  pageSize?: number
  emptyTitle?: string
  emptyAction?: React.ReactNode
}

export function DataTable<T>({
  data, columns, getRowId, searchPlaceholder = 'Search…', onRowClick, mobileCard,
  bulkActions, pageSize = 10, emptyTitle = 'Nothing to show yet', emptyAction,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [density, setDensity] = useState<'compact' | 'comfortable'>('comfortable')
  const [scrollRef, setScrollRef] = useState<HTMLDivElement | null>(null)
  const virtualize = data.length > 200

  const allColumns = useMemo<ColumnDef<T, any>[]>(() => [
    {
      id: '__select',
      header: ({ table }) => (
        <Checkbox aria-label="Select all" checked={table.getIsAllRowsSelected() ? true : table.getIsSomeRowsSelected() ? 'indeterminate' : false}
          onCheckedChange={v => table.toggleAllRowsSelected(!!v)} />
      ),
      cell: ({ row }) => (
        <Checkbox aria-label={`Select row ${row.id}`} checked={row.getIsSelected()} onCheckedChange={v => row.toggleSelected(!!v)} />
      ),
      enableSorting: false, enableHiding: false, size: 40,
    },
    ...columns,
  ], [columns])

  const table = useReactTable({
    data, columns: allColumns, state: { sorting, globalFilter, rowSelection, columnVisibility },
    onSortingChange: setSorting, onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection, onColumnVisibilityChange: setColumnVisibility,
    getRowId: getRowId ?? ((row, index) => String(index)),
    globalFilterFn: 'includesString',
    getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(), getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: virtualize ? data.length : pageSize } },
  })
  const rows = table.getRowModel().rows
  const selectedIds = table.getSelectedRowModel().rows.map(r => r.id)

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef,
    estimateSize: () => (density === 'compact' ? 40 : 56),
    overscan: 12,
  })

  const exportCsv = () => {
    const headers = table.getVisibleLeafColumns().filter(c => c.id !== '__select').map(c => String(c.columnDef.header ?? c.id))
    const lines = [headers.join(','), ...table.getFilteredRowModel().rows.map(row =>
      table.getVisibleLeafColumns().filter(c => c.id !== '__select').map(c => {
        const value = row.getValue(c.id)
        return `"${String(value ?? '').replaceAll('"', '""')}"`
      }).join(','))]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'schoolos-export.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const pad = density === 'compact' ? 'px-3 py-2' : 'px-4 py-3'

  return (
    <div className="ui-card overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
        <SearchField value={globalFilter} onChange={setGlobalFilter} placeholder={searchPlaceholder} className="min-w-48 flex-1" />
        <Popover trigger={<Button variant="outline" size="sm"><Columns3 className="h-4 w-4" />Columns</Button>}>
          <div className="w-52 space-y-2">
            <p className="text-xs font-semibold text-content-muted">Visible columns</p>
            {table.getAllLeafColumns().filter(c => c.id !== '__select').map(c => (
              <Checkbox key={c.id} label={String(c.columnDef.header ?? c.id)} checked={c.getIsVisible()}
                onCheckedChange={v => c.toggleVisibility(!!v)} />
            ))}
          </div>
        </Popover>
        <Button variant="outline" size="sm" aria-label="Toggle density" onClick={() => setDensity(d => d === 'compact' ? 'comfortable' : 'compact')}>
          <Rows3 className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-4 w-4" /><span className="hidden sm:inline">CSV</span></Button>
      </div>

      {selectedIds.length > 0 && bulkActions && (
        <div className="flex flex-wrap items-center gap-2 border-b border-brand-200 bg-brand-50 px-4 py-2 text-sm dark:border-brand-500/30 dark:bg-brand-500/10">
          <span className="tnum font-medium text-brand-800 dark:text-brand-200">{selectedIds.length} selected</span>
          {bulkActions.map(a => (
            <Button key={a.label} size="sm" variant={a.danger ? 'danger' : 'outline'} onClick={() => a.onAction(selectedIds)}>
              {a.danger && <Trash2 className="h-3.5 w-3.5" />}{a.label}
            </Button>
          ))}
          <Button size="sm" variant="ghost" onClick={() => table.resetRowSelection()}>Clear</Button>
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState title={emptyTitle} description="Try adjusting your search or filters." action={emptyAction} variant="search" />
      ) : (
        <>
          <div ref={setScrollRef} className={cn('ui-scroll', virtualize && 'max-h-[560px] overflow-auto')}>
            {virtualize ? (
              <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
                {virtualizer.getVirtualItems().map(vrow => {
                  const row = rows[vrow.index]
                  return (
                    <div key={row.id} className="absolute inset-x-0 flex items-center border-b border-line px-3 text-sm hover:bg-surface-2"
                      style={{ height: vrow.size, transform: `translateY(${vrow.start}px)` }}>
                      {row.getVisibleCells().map(cell => (
                        <div key={cell.id} className="min-w-0 flex-1 truncate px-2" style={{ maxWidth: cell.column.getSize() }}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            ) : (
              <table className="hidden w-full border-collapse text-sm md:table">
                <thead className="ui-sticky-head">
                  {table.getHeaderGroups().map(hg => (
                    <tr key={hg.id}>
                      {hg.headers.map(h => (
                        <th key={h.id} scope="col" className={cn('border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-content-subtle', pad)}
                          style={{ width: h.getSize() }}>
                          {h.column.getCanSort() ? (
                            <button type="button" onClick={h.column.getToggleSortingHandler()} className="focus-ring inline-flex items-center gap-1 hover:text-content">
                              {flexRender(h.column.columnDef.header, h.getContext())}
                              {h.column.getIsSorted() === 'asc' ? <ArrowUp className="h-3 w-3" /> : h.column.getIsSorted() === 'desc' ? <ArrowDown className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                            </button>
                          ) : flexRender(h.column.columnDef.header, h.getContext())}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={row.id} onClick={() => onRowClick?.(row.original)}
                      className={cn('border-b border-line/70 transition-colors last:border-0 hover:bg-brand-50/50 dark:hover:bg-brand-500/5', i % 2 === 1 && 'bg-surface-2/40', row.getIsSelected() && 'bg-brand-50 dark:bg-brand-500/10', onRowClick && 'cursor-pointer')}>
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id} className={cn(pad, 'tnum max-w-xs truncate')}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {mobileCard && (
            <div className="space-y-2 p-3 md:hidden">
              {rows.map(row => <div key={row.id} onClick={() => onRowClick?.(row.original)}>{mobileCard(row.original)}</div>)}
            </div>
          )}
          {!virtualize && (
            <div className="border-t border-line">
              <Pagination page={table.getState().pagination.pageIndex + 1} pageSize={pageSize}
                total={table.getFilteredRowModel().rows.length}
                onPageChange={p => table.setPageIndex(p - 1)} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
