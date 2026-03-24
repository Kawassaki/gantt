import { atom } from 'jotai'
import { tasksAtom, markersAtom, timelineConfigAtom, undoStackAtom, redoStackAtom } from './store'
import type { Task, Marker, Subtask, GanttExport } from './types'
import { format, addDays } from 'date-fns'

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

const TASK_COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#14b8a6']
const SUBTASK_COLORS = ['#60a5fa', '#a78bfa', '#22d3ee', '#34d399', '#fbbf24', '#f87171', '#f472b6', '#818cf8', '#2dd4bf']

// --- Snapshot helpers for undo/redo ---

export const pushUndoAtom = atom(null, (get, set) => {
  const snap = { tasks: get(tasksAtom), markers: get(markersAtom) }
  set(undoStackAtom, [...get(undoStackAtom).slice(-30), snap])
  set(redoStackAtom, [])
})

export const undoAtom = atom(null, (get, set) => {
  const stack = get(undoStackAtom)
  if (stack.length === 0) return
  const snap = stack[stack.length - 1]
  set(redoStackAtom, [...get(redoStackAtom), { tasks: get(tasksAtom), markers: get(markersAtom) }])
  set(undoStackAtom, stack.slice(0, -1))
  set(tasksAtom, snap.tasks)
  set(markersAtom, snap.markers)
})

export const redoAtom = atom(null, (get, set) => {
  const stack = get(redoStackAtom)
  if (stack.length === 0) return
  const snap = stack[stack.length - 1]
  set(undoStackAtom, [...get(undoStackAtom), { tasks: get(tasksAtom), markers: get(markersAtom) }])
  set(redoStackAtom, stack.slice(0, -1))
  set(tasksAtom, snap.tasks)
  set(markersAtom, snap.markers)
})

// --- Task CRUD ---

export const addTaskAtom = atom(null, (get, set, task: Omit<Task, 'id'>) => {
  set(pushUndoAtom)
  set(tasksAtom, [...get(tasksAtom), { ...task, id: 't-' + uid() }])
})

export const addNewTaskAtom = atom(null, (get, set) => {
  set(pushUndoAtom)
  const tasks = get(tasksAtom)
  const today = format(new Date(), 'yyyy-MM-dd')
  const endDate = format(addDays(new Date(), 5), 'yyyy-MM-dd')
  const color = TASK_COLORS[tasks.length % TASK_COLORS.length]
  set(tasksAtom, [...tasks, {
    id: 't-' + uid(),
    name: 'New Task',
    startDate: today,
    endDate,
    color,
    subtasks: [],
    progress: 0,
  }])
})

export const addNewSubtaskAtom = atom(null, (get, set, taskId: string) => {
  set(pushUndoAtom)
  const tasks = get(tasksAtom)
  const task = tasks.find(t => t.id === taskId)
  if (!task) return
  const color = SUBTASK_COLORS[task.subtasks.length % SUBTASK_COLORS.length]
  set(tasksAtom, tasks.map(t =>
    t.id === taskId
      ? {
          ...t,
          subtasks: [...t.subtasks, {
            id: 's-' + uid(),
            name: 'New Subtask',
            startDate: t.startDate,
            endDate: t.endDate,
            color,
          }],
        }
      : t,
  ))
})

export const updateTaskAtom = atom(null, (get, set, updated: Task) => {
  set(pushUndoAtom)
  set(tasksAtom, get(tasksAtom).map(t => (t.id === updated.id ? updated : t)))
})

export const deleteTaskAtom = atom(null, (get, set, taskId: string) => {
  set(pushUndoAtom)
  set(tasksAtom, get(tasksAtom).filter(t => t.id !== taskId))
})

// --- Subtask CRUD ---

export const addSubtaskAtom = atom(null, (get, set, { taskId, subtask }: { taskId: string; subtask: Omit<Subtask, 'id'> }) => {
  set(pushUndoAtom)
  set(tasksAtom, get(tasksAtom).map(t =>
    t.id === taskId ? { ...t, subtasks: [...t.subtasks, { ...subtask, id: 's-' + uid() }] } : t,
  ))
})

export const updateSubtaskAtom = atom(null, (get, set, { taskId, subtask }: { taskId: string; subtask: Subtask }) => {
  set(pushUndoAtom)
  set(tasksAtom, get(tasksAtom).map(t =>
    t.id === taskId ? { ...t, subtasks: t.subtasks.map(s => (s.id === subtask.id ? subtask : s)) } : t,
  ))
})

export const deleteSubtaskAtom = atom(null, (get, set, { taskId, subtaskId }: { taskId: string; subtaskId: string }) => {
  set(pushUndoAtom)
  set(tasksAtom, get(tasksAtom).map(t =>
    t.id === taskId ? { ...t, subtasks: t.subtasks.filter(s => s.id !== subtaskId) } : t,
  ))
})

// --- Marker CRUD ---

export const addMarkerAtom = atom(null, (get, set, marker: Omit<Marker, 'id'>) => {
  set(pushUndoAtom)
  set(markersAtom, [...get(markersAtom), { ...marker, id: 'm-' + uid() }])
})

export const removeMarkerAtom = atom(null, (get, set, markerId: string) => {
  set(pushUndoAtom)
  set(markersAtom, get(markersAtom).filter(m => m.id !== markerId))
})

// --- Import / Export ---

export const exportDataAtom = atom((get) => {
  const data: GanttExport = {
    version: 1,
    tasks: get(tasksAtom),
    markers: get(markersAtom),
    timelineConfig: get(timelineConfigAtom),
  }
  return data
})

export const importDataAtom = atom(null, (_get, set, data: GanttExport) => {
  set(tasksAtom, data.tasks)
  set(markersAtom, data.markers)
  set(timelineConfigAtom, data.timelineConfig)
  set(undoStackAtom, [])
  set(redoStackAtom, [])
})
