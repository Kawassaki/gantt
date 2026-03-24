import type { GanttExport, Task, Subtask, Marker } from './types'
import { format } from 'date-fns'

function isString(v: unknown): v is string {
  return typeof v === 'string'
}

function isDateStr(v: unknown): boolean {
  return isString(v) && /^\d{4}-\d{2}-\d{2}$/.test(v)
}

function isValidSubtask(s: unknown): s is Subtask {
  if (!s || typeof s !== 'object') return false
  const o = s as Record<string, unknown>
  return isString(o.id) && isString(o.name) && isDateStr(o.startDate) && isDateStr(o.endDate) && isString(o.color)
}

function isValidTask(t: unknown): t is Task {
  if (!t || typeof t !== 'object') return false
  const o = t as Record<string, unknown>
  return (
    isString(o.id) &&
    isString(o.name) &&
    isDateStr(o.startDate) &&
    isDateStr(o.endDate) &&
    isString(o.color) &&
    typeof o.progress === 'number' &&
    Array.isArray(o.subtasks) &&
    o.subtasks.every(isValidSubtask)
  )
}

function isValidMarker(m: unknown): m is Marker {
  if (!m || typeof m !== 'object') return false
  const o = m as Record<string, unknown>
  return isString(o.id) && isDateStr(o.date) && isString(o.label) && isString(o.color)
}

export function validateExport(data: unknown): GanttExport | null {
  if (!data || typeof data !== 'object') return null
  const o = data as Record<string, unknown>
  if (o.version !== 1) return null
  if (!Array.isArray(o.tasks) || !o.tasks.every(isValidTask)) return null
  if (!Array.isArray(o.markers) || !o.markers.every(isValidMarker)) return null
  if (!o.timelineConfig || typeof o.timelineConfig !== 'object') return null
  const tc = o.timelineConfig as Record<string, unknown>
  if (!isDateStr(tc.startDate) || !isDateStr(tc.endDate) || typeof tc.zoomLevel !== 'number') return null
  return data as GanttExport
}

export function downloadJson(data: GanttExport) {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `gantt-export-${format(new Date(), 'yyyy-MM-dd')}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function readJsonFile(file: File): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        resolve(JSON.parse(reader.result as string))
      } catch {
        reject(new Error('Invalid JSON file'))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}
