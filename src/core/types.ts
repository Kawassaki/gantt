export interface Subtask {
  id: string
  name: string
  startDate: string // ISO date string for serialization
  endDate: string
  color: string
}

export interface Task {
  id: string
  name: string
  startDate: string
  endDate: string
  color: string
  subtasks: Subtask[]
  progress: number // 0-100
}

export interface Marker {
  id: string
  date: string
  label: string
  color: string
}

export interface TimelineConfig {
  startDate: string
  endDate: string
  zoomLevel: number // pixels per day
}

export interface GanttExport {
  version: number
  tasks: Task[]
  markers: Marker[]
  timelineConfig: TimelineConfig
}

export type DragMode = 'move' | 'resize-start' | 'resize-end'

export interface DragState {
  taskId: string
  subtaskId?: string
  mode: DragMode
  startX: number
  originalStart: string
  originalEnd: string
}
