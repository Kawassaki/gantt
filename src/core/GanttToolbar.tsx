import { useAtomValue, useSetAtom } from 'jotai'
import { useRef } from 'react'
import { Download, Redo2, Undo2, Upload, ZoomIn, ZoomOut } from 'lucide-react'
import { exportDataAtom, importDataAtom, undoAtom, redoAtom } from './actions'
import { undoStackAtom, redoStackAtom } from './store'
import { downloadJson, readJsonFile, validateExport } from './importExport'
import { useTimeline } from './useTimeline'

interface Props {
  className?: string
  buttonClass?: string
  title?: string
  titleClass?: string
  accentColor?: string
  dividerClass?: string
}

export function GanttToolbar({ className = '', buttonClass = '', title, titleClass = '', accentColor, dividerClass }: Props) {
  const exportData = useAtomValue(exportDataAtom)
  const importData = useSetAtom(importDataAtom)
  const undo = useSetAtom(undoAtom)
  const redo = useSetAtom(redoAtom)
  const undoStack = useAtomValue(undoStackAtom)
  const redoStack = useAtomValue(redoStackAtom)
  const { config, setZoom } = useTimeline()
  const fileRef = useRef<HTMLInputElement>(null)

  const handleExport = () => downloadJson(exportData)

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const raw = await readJsonFile(file)
      const data = validateExport(raw)
      if (!data) {
        alert('Invalid Gantt file format')
        return
      }
      importData(data)
    } catch {
      alert('Failed to read file')
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  const btnBase = `inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${buttonClass}`
  const divider = dividerClass || 'w-px h-5 opacity-15'

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {title && <span className={`font-bold mr-auto ${titleClass}`}>{title}</span>}

      <div className="flex items-center gap-1">
        <button className={btnBase} onClick={() => setZoom(config.zoomLevel - 10)} title="Zoom out">
          <ZoomOut size={14} />
        </button>
        <span className="text-[10px] opacity-50 tabular-nums w-7 text-center select-none">{config.zoomLevel}</span>
        <button className={btnBase} onClick={() => setZoom(config.zoomLevel + 10)} title="Zoom in">
          <ZoomIn size={14} />
        </button>
      </div>

      <div className={divider} style={{ background: accentColor || 'currentColor' }} />

      <div className="flex items-center gap-1">
        <button className={btnBase} onClick={() => undo()} disabled={undoStack.length === 0} title="Undo (Ctrl+Z)">
          <Undo2 size={14} />
        </button>
        <button className={btnBase} onClick={() => redo()} disabled={redoStack.length === 0} title="Redo (Ctrl+Shift+Z)">
          <Redo2 size={14} />
        </button>
      </div>

      <div className={divider} style={{ background: accentColor || 'currentColor' }} />

      <div className="flex items-center gap-1">
        <button className={btnBase} onClick={handleExport} title="Export as JSON">
          <Download size={14} />
          <span className="hidden sm:inline">Export</span>
        </button>
        <button className={btnBase} onClick={() => fileRef.current?.click()} title="Import JSON">
          <Upload size={14} />
          <span className="hidden sm:inline">Import</span>
        </button>
      </div>

      <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
    </div>
  )
}
