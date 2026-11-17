import { createContext, useContext, type ReactNode } from 'react'
import { toast } from 'sonner'

/** Verb + object labels supplied by the host app so every screen stays FR/EN. */
export interface ActionLabels {
  actions: string
  more: string
  openMenu: string
  add: string
  edit: string
  view: string
  duplicate: string
  remove: string
  copy: string
  copied: string
  copyFailed: string
  copyLink: string
  share: string
  export: string
  exportCsv: string
  quickAdd: string
  undo: string
  cancel: string
  confirm: string
  close: string
  unavailable: string
  destructive: string
  selected: (count: number) => string
  clearSelection: string
  previousPage: string
  nextPage: string
  clearSearch: string
  search: string
  selectAll: string
  clear: string
  columns: string
  toggleDensity: string
  resetView: string
  commandPalette: string
  searchPages: string
  general: string
  noMatches: string
}

export const defaultActionLabels: ActionLabels = {
  actions: 'Actions',
  more: 'More actions',
  openMenu: 'Open menu',
  add: 'Add',
  edit: 'Edit',
  view: 'View',
  duplicate: 'Duplicate',
  remove: 'Remove',
  copy: 'Copy',
  copied: 'Copied',
  copyFailed: 'Could not copy',
  copyLink: 'Copy link',
  share: 'Share',
  export: 'Export',
  exportCsv: 'Export as CSV',
  quickAdd: 'Quick add',
  undo: 'Undo',
  cancel: 'Cancel',
  confirm: 'Confirm',
  close: 'Close',
  unavailable: 'Action unavailable',
  destructive: 'Irreversible actions',
  selected: count => `${count} selected`,
  clearSelection: 'Clear selection',
  previousPage: 'Previous page',
  nextPage: 'Next page',
  clearSearch: 'Clear search',
  search: 'Search',
  selectAll: 'Select all',
  clear: 'Clear',
  columns: 'Columns',
  toggleDensity: 'Toggle density',
  resetView: 'Reset saved view',
  commandPalette: 'Command palette',
  searchPages: 'Search pages and actions…',
  general: 'General',
  noMatches: 'No matches found.',
}

const ActionLabelsContext = createContext<ActionLabels>(defaultActionLabels)

export function ActionLabelsProvider({ labels, children }: { labels: ActionLabels; children: ReactNode }) {
  return <ActionLabelsContext.Provider value={labels}>{children}</ActionLabelsContext.Provider>
}

export function useActionLabels(): ActionLabels {
  return useContext(ActionLabelsContext)
}

/** Undo-first feedback for reversible actions. The message must never contain case data. */
export function undoToast(message: string, onUndo: () => void, undoLabel?: string) {
  toast(message, {
    duration: 8000,
    action: { label: undoLabel ?? defaultActionLabels.undo, onClick: onUndo },
  })
}
