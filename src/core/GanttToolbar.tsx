import { useAtomValue, useSetAtom } from 'jotai'
import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { exportDataAtom, importDataAtom, undoAtom, redoAtom } from './actions'
import { undoStackAtom, redoStackAtom } from './store'
import { downloadJson, readJsonFile, validateExport } from './importExport'
import { useTimeline } from './useTimeline'

const IconHome = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
  </svg>
)

const IconZoomOut = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" />
  </svg>
)

const IconZoomIn = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" />
  </svg>
)

const IconUndo = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
  </svg>
)

const IconRedo = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10" />
  </svg>
)

const IconExport = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
  </svg>
)

const IconImport = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
  </svg>
)

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
  const navigate = useNavigate()

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
      <button className={btnBase} onClick={() => navigate('/')} title="Back to home">
        <IconHome />
      </button>

      {title && <span className={`font-bold mr-auto ${titleClass}`}>{title}</span>}

      <div className="flex items-center gap-1">
        <button className={btnBase} onClick={() => setZoom(config.zoomLevel - 10)} title="Zoom out">
          <IconZoomOut />
        </button>
        <span className="text-[10px] opacity-50 tabular-nums w-7 text-center select-none">{config.zoomLevel}</span>
        <button className={btnBase} onClick={() => setZoom(config.zoomLevel + 10)} title="Zoom in">
          <IconZoomIn />
        </button>
      </div>

      <div className={divider} style={{ background: accentColor || 'currentColor' }} />

      <div className="flex items-center gap-1">
        <button className={btnBase} onClick={() => undo()} disabled={undoStack.length === 0} title="Undo (Ctrl+Z)">
          <IconUndo />
        </button>
        <button className={btnBase} onClick={() => redo()} disabled={redoStack.length === 0} title="Redo (Ctrl+Shift+Z)">
          <IconRedo />
        </button>
      </div>

      <div className={divider} style={{ background: accentColor || 'currentColor' }} />

      <div className="flex items-center gap-1">
        <button className={btnBase} onClick={handleExport} title="Export as JSON">
          <IconExport />
          <span className="hidden sm:inline">Export</span>
        </button>
        <button className={btnBase} onClick={() => fileRef.current?.click()} title="Import JSON">
          <IconImport />
          <span className="hidden sm:inline">Import</span>
        </button>
      </div>

      <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
    </div>
  )
}
