import { useState } from 'react'
import { UploadCloud, FileText, X } from 'lucide-react'
import { cn } from '../lib/cn'
import { Button } from './Button'

export function FileDrop({ accept, maxMb = 10, onFiles, className, label }: {
  accept?: string; maxMb?: number; onFiles?: (files: File[]) => void; className?: string; label?: string
}) {
  const [dragging, setDragging] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const add = (incoming: FileList | null) => {
    if (!incoming) return
    const ok = Array.from(incoming).filter(f => f.size <= maxMb * 1024 * 1024)
    setFiles(prev => [...prev, ...ok])
    onFiles?.(ok)
  }
  return (
    <div className={cn('space-y-2', className)}>
      <label
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); add(e.dataTransfer.files) }}
        className={cn('flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-line-strong bg-surface-2 px-4 py-8 text-center transition-colors hover:border-brand-400 hover:bg-brand-50/40',
          dragging && 'border-brand-500 bg-brand-50')}
      >
        <UploadCloud className="h-8 w-8 text-brand-500" />
        <span className="text-sm font-medium text-content">{label ?? 'Drop files here or click to browse'}</span>
        <span className="text-xs text-content-subtle">{accept ?? 'Any file'} · max {maxMb} MB</span>
        <input type="file" accept={accept} multiple className="ui-sr-only" onChange={e => add(e.target.files)} />
      </label>
      {files.length > 0 && (
        <ul className="space-y-1">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center gap-2 rounded-md border border-line bg-surface px-3 py-2 text-sm">
              <FileText className="h-4 w-4 text-content-subtle" />
              <span className="min-w-0 flex-1 truncate text-content">{f.name}</span>
              <Button variant="ghost" size="icon-sm" aria-label={`Remove ${f.name}`} onClick={() => setFiles(prev => prev.filter((_, n) => n !== i))}>
                <X className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
