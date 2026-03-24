import { useState, useCallback, useRef, useMemo } from 'react'
import { useAtom } from 'jotai'
import { parseISO, addDays, differenceInDays, format } from 'date-fns'
import { tasksAtom } from './store'
import { usePushUndoSnapshot } from './undoHelper'
import type { DragMode, Task } from './types'

const EDGE_ZONE = 8
const VERTICAL_THRESHOLD = 12

export interface DropTarget {
  indicatorY: number
  apply: (tasks: Task[]) => Task[]
}

interface FlatRow {
  type: 'task' | 'subtask'
  taskId: string
  taskIndex: number
  subtaskId?: string
  subtaskIndex?: number
  y: number
  h: number
}

function buildFlatRows(tasks: Task[], taskRowH: number, subtaskRowH: number): FlatRow[] {
  const rows: FlatRow[] = []
  let y = 0
  tasks.forEach((task, ti) => {
    rows.push({ type: 'task', taskId: task.id, taskIndex: ti, y, h: taskRowH })
    y += taskRowH
    task.subtasks.forEach((sub, si) => {
      rows.push({ type: 'subtask', taskId: task.id, taskIndex: ti, subtaskId: sub.id, subtaskIndex: si, y, h: subtaskRowH })
      y += subtaskRowH
    })
  })
  return rows
}

interface TaskGroup {
  taskId: string
  taskIndex: number
  startY: number
  endY: number
}

function buildTaskGroups(tasks: Task[], taskRowH: number, subtaskRowH: number): TaskGroup[] {
  const groups: TaskGroup[] = []
  let y = 0
  tasks.forEach((task, ti) => {
    const start = y
    y += taskRowH + task.subtasks.length * subtaskRowH
    groups.push({ taskId: task.id, taskIndex: ti, startY: start, endY: y })
  })
  return groups
}

function computeDropTarget(
  relY: number,
  tasks: Task[],
  dragTaskId: string,
  dragSubtaskId: string | undefined,
  taskRowH: number,
  subtaskRowH: number,
): DropTarget | null {
  if (!dragSubtaskId) {
    const groups = buildTaskGroups(tasks, taskRowH, subtaskRowH)
    const draggedIdx = tasks.findIndex(t => t.id === dragTaskId)
    if (draggedIdx < 0) return null

    let bestBoundaryIdx = 0
    let bestDist = Infinity
    for (let i = 0; i <= groups.length; i++) {
      const boundaryY = i < groups.length ? groups[i].startY : groups[groups.length - 1].endY
      const dist = Math.abs(relY - boundaryY)
      if (dist < bestDist) {
        bestDist = dist
        bestBoundaryIdx = i
      }
    }

    if (bestBoundaryIdx === draggedIdx || bestBoundaryIdx === draggedIdx + 1) return null

    const toIndex = bestBoundaryIdx > draggedIdx ? bestBoundaryIdx - 1 : bestBoundaryIdx
    const indicatorY = bestBoundaryIdx < groups.length
      ? groups[bestBoundaryIdx].startY
      : groups[groups.length - 1].endY

    return {
      indicatorY,
      apply: (prev) => {
        const arr = [...prev]
        const [moved] = arr.splice(draggedIdx, 1)
        arr.splice(toIndex, 0, moved)
        return arr
      },
    }
  } else {
    const flatRows = buildFlatRows(tasks, taskRowH, subtaskRowH)
    const sourceTask = tasks.find(t => t.id === dragTaskId)
    if (!sourceTask) return null
    const subtask = sourceTask.subtasks.find(s => s.id === dragSubtaskId)
    if (!subtask) return null

    let bestRow: FlatRow | null = null
    let bestDist = Infinity
    let insertAfter = true

    for (const row of flatRows) {
      if (row.type === 'subtask' && row.subtaskId === dragSubtaskId) continue

      const midY = row.y + row.h / 2
      const dist = Math.abs(relY - midY)
      if (dist < bestDist) {
        bestDist = dist
        bestRow = row
        insertAfter = relY > midY
      }
    }

    if (!bestRow) return null

    let targetTaskId: string
    let targetSubIndex: number
    let indicatorY: number

    if (bestRow.type === 'task') {
      targetTaskId = bestRow.taskId
      if (insertAfter) {
        targetSubIndex = 0
        indicatorY = bestRow.y + bestRow.h
      } else {
        const prevGroupIdx = bestRow.taskIndex - 1
        if (prevGroupIdx >= 0) {
          targetTaskId = tasks[prevGroupIdx].id
          targetSubIndex = tasks[prevGroupIdx].subtasks.length
          indicatorY = bestRow.y
        } else {
          targetTaskId = bestRow.taskId
          targetSubIndex = 0
          indicatorY = bestRow.y + bestRow.h
        }
      }
    } else {
      targetTaskId = bestRow.taskId
      if (insertAfter) {
        targetSubIndex = (bestRow.subtaskIndex ?? 0) + 1
        indicatorY = bestRow.y + bestRow.h
      } else {
        targetSubIndex = bestRow.subtaskIndex ?? 0
        indicatorY = bestRow.y
      }
    }

    if (targetTaskId === dragTaskId) {
      const origIdx = sourceTask.subtasks.findIndex(s => s.id === dragSubtaskId)
      if (targetSubIndex === origIdx || targetSubIndex === origIdx + 1) return null
    }

    return {
      indicatorY,
      apply: (prev) => {
        const sub = prev.find(t => t.id === dragTaskId)?.subtasks.find(s => s.id === dragSubtaskId)
        if (!sub) return prev

        let result = prev.map(t => {
          if (t.id === dragTaskId) {
            return { ...t, subtasks: t.subtasks.filter(s => s.id !== dragSubtaskId) }
          }
          return t
        })

        result = result.map(t => {
          if (t.id === targetTaskId) {
            const subs = [...t.subtasks]
            let adjustedIdx = targetSubIndex
            if (dragTaskId === targetTaskId) {
              const origIdx = sourceTask.subtasks.findIndex(s => s.id === dragSubtaskId)
              if (targetSubIndex > origIdx) adjustedIdx = targetSubIndex - 1
            }
            subs.splice(adjustedIdx, 0, sub)
            return { ...t, subtasks: subs }
          }
          return t
        })

        return result
      },
    }
  }
}

export function useGanttDrag(
  pxPerDay: number,
  rowConfig: { taskRowH: number; subtaskRowH: number } = { taskRowH: 56, subtaskRowH: 36 },
  chartBodyRef?: React.RefObject<HTMLElement | null>,
) {
  const [tasks, setTasks] = useAtom(tasksAtom)
  const [dragInfo, setDragInfo] = useState<{
    taskId: string
    subtaskId?: string
    mode: DragMode
    startX: number
    startY: number
    origStart: string
    origEnd: string
  } | null>(null)

  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null)
  const snapshotPushed = useRef(false)
  const pushUndo = usePushUndoSnapshot()

  const getPointerMode = useCallback(
    (e: React.PointerEvent, el: HTMLElement): DragMode => {
      const rect = el.getBoundingClientRect()
      const x = e.clientX - rect.left
      if (x <= EDGE_ZONE) return 'resize-start'
      if (x >= rect.width - EDGE_ZONE) return 'resize-end'
      return 'move'
    },
    [],
  )

  const startDrag = useCallback(
    (e: React.PointerEvent, taskId: string, subtaskId?: string) => {
      const el = e.currentTarget as HTMLElement
      el.setPointerCapture(e.pointerId)
      const mode = getPointerMode(e, el)

      let origStart: string, origEnd: string
      const task = tasks.find(t => t.id === taskId)
      if (!task) return
      if (subtaskId) {
        const sub = task.subtasks.find(s => s.id === subtaskId)
        if (!sub) return
        origStart = sub.startDate
        origEnd = sub.endDate
      } else {
        origStart = task.startDate
        origEnd = task.endDate
      }

      snapshotPushed.current = false
      setDropTarget(null)
      setDragInfo({ taskId, subtaskId, mode, startX: e.clientX, startY: e.clientY, origStart, origEnd })
    },
    [tasks, getPointerMode],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragInfo) return
      if (!snapshotPushed.current) {
        pushUndo()
        snapshotPushed.current = true
      }

      const dx = e.clientX - dragInfo.startX
      const dy = e.clientY - dragInfo.startY

      // --- Horizontal drag (date changes) ---
      const dayDelta = Math.round(dx / pxPerDay)
      const origS = parseISO(dragInfo.origStart)
      const origE = parseISO(dragInfo.origEnd)

      let newStart: Date, newEnd: Date

      if (dragInfo.mode === 'move') {
        newStart = addDays(origS, dayDelta)
        newEnd = addDays(origE, dayDelta)
      } else if (dragInfo.mode === 'resize-start') {
        newStart = addDays(origS, dayDelta)
        newEnd = origE
        if (differenceInDays(newEnd, newStart) < 1) {
          newStart = addDays(newEnd, -1)
        }
      } else {
        newStart = origS
        newEnd = addDays(origE, dayDelta)
        if (differenceInDays(newEnd, newStart) < 1) {
          newEnd = addDays(newStart, 1)
        }
      }

      const fmt = (d: Date) => format(d, 'yyyy-MM-dd')

      setTasks(prev =>
        prev.map(t => {
          if (t.id !== dragInfo.taskId) return t
          if (dragInfo.subtaskId) {
            return {
              ...t,
              subtasks: t.subtasks.map(s =>
                s.id === dragInfo.subtaskId ? { ...s, startDate: fmt(newStart), endDate: fmt(newEnd) } : s,
              ),
            }
          }
          return { ...t, startDate: fmt(newStart), endDate: fmt(newEnd) }
        }),
      )

      // --- Vertical drag (reorder) ---
      if (dragInfo.mode === 'move' && chartBodyRef?.current && Math.abs(dy) > VERTICAL_THRESHOLD) {
        const rect = chartBodyRef.current.getBoundingClientRect()
        const scrollTop = chartBodyRef.current.scrollTop
        const relY = e.clientY - rect.top + scrollTop

        const target = computeDropTarget(
          relY,
          tasks,
          dragInfo.taskId,
          dragInfo.subtaskId,
          rowConfig.taskRowH,
          rowConfig.subtaskRowH,
        )
        setDropTarget(target)
      } else if (dragInfo.mode === 'move') {
        setDropTarget(null)
      }
    },
    [dragInfo, pxPerDay, setTasks, pushUndo, tasks, chartBodyRef, rowConfig],
  )

  const endDrag = useCallback(() => {
    if (dropTarget) {
      setTasks(prev => dropTarget.apply(prev))
    }
    setDragInfo(null)
    setDropTarget(null)
  }, [dropTarget, setTasks])

  const getCursor = useCallback(
    (e: React.PointerEvent, el: HTMLElement): string => {
      const mode = getPointerMode(e, el)
      if (mode === 'resize-start' || mode === 'resize-end') return 'ew-resize'
      return 'grab'
    },
    [getPointerMode],
  )

  return {
    isDragging: dragInfo !== null,
    dragTaskId: dragInfo?.taskId,
    dragSubtaskId: dragInfo?.subtaskId,
    dragMode: dragInfo?.mode,
    dropIndicatorY: dropTarget?.indicatorY ?? null,
    startDrag,
    onPointerMove,
    endDrag,
    getCursor,
  }
}
