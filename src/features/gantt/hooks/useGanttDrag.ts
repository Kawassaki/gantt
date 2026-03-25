import { parseISO, addDays, differenceInDays, format } from "date-fns";
import { useAtom } from "jotai";
import { useState, useCallback, useRef, useEffect } from "react";

import { tasksAtom } from "../state/store";
import type { DragMode, Task } from "../types";

import { usePushUndoSnapshot } from "./useUndoSnapshot";

const EDGE_ZONE_WIDTH = 8;
const VERTICAL_DRAG_THRESHOLD = 12;

export interface DropTarget {
  indicatorY: number;
  apply: (tasks: Task[]) => Task[];
}

interface FlatRow {
  type: "task" | "subtask";
  taskId: string;
  taskIndex: number;
  subtaskId?: string;
  subtaskIndex?: number;
  y: number;
  h: number;
}

const buildFlatRows = (
  tasks: Task[],
  taskRowHeight: number,
  subtaskRowHeight: number
): FlatRow[] => {
  const rows: FlatRow[] = [];
  let y = 0;
  tasks.forEach((task, taskIndex) => {
    rows.push({
      type: "task",
      taskId: task.id,
      taskIndex,
      y,
      h: taskRowHeight,
    });
    y += taskRowHeight;
    task.subtasks.forEach((subtask, subtaskIndex) => {
      rows.push({
        type: "subtask",
        taskId: task.id,
        taskIndex,
        subtaskId: subtask.id,
        subtaskIndex,
        y,
        h: subtaskRowHeight,
      });
      y += subtaskRowHeight;
    });
  });
  return rows;
};

interface TaskGroup {
  taskId: string;
  taskIndex: number;
  startY: number;
  endY: number;
}

const buildTaskGroups = (
  tasks: Task[],
  taskRowHeight: number,
  subtaskRowHeight: number
): TaskGroup[] => {
  const groups: TaskGroup[] = [];
  let y = 0;
  tasks.forEach((task, taskIndex) => {
    const startY = y;
    y += taskRowHeight + task.subtasks.length * subtaskRowHeight;
    groups.push({ taskId: task.id, taskIndex, startY, endY: y });
  });
  return groups;
};

const computeDropTarget = (
  relativeY: number,
  tasks: Task[],
  draggedTaskId: string,
  draggedSubtaskId: string | undefined,
  taskRowHeight: number,
  subtaskRowHeight: number
): DropTarget | null => {
  if (!draggedSubtaskId) {
    const taskGroups = buildTaskGroups(tasks, taskRowHeight, subtaskRowHeight);
    const draggedTaskIndex = tasks.findIndex(
      (task) => task.id === draggedTaskId
    );
    if (draggedTaskIndex < 0) return null;

    let nearestBoundaryIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (
      let boundaryIndex = 0;
      boundaryIndex <= taskGroups.length;
      boundaryIndex += 1
    ) {
      const boundaryY =
        boundaryIndex < taskGroups.length
          ? taskGroups[boundaryIndex].startY
          : taskGroups[taskGroups.length - 1].endY;
      const distance = Math.abs(relativeY - boundaryY);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestBoundaryIndex = boundaryIndex;
      }
    }

    if (
      nearestBoundaryIndex === draggedTaskIndex ||
      nearestBoundaryIndex === draggedTaskIndex + 1
    ) {
      return null;
    }

    const targetIndex =
      nearestBoundaryIndex > draggedTaskIndex
        ? nearestBoundaryIndex - 1
        : nearestBoundaryIndex;
    const indicatorY =
      nearestBoundaryIndex < taskGroups.length
        ? taskGroups[nearestBoundaryIndex].startY
        : taskGroups[taskGroups.length - 1].endY;

    return {
      indicatorY,
      apply: (existingTasks) => {
        const nextTasks = [...existingTasks];
        const [movedTask] = nextTasks.splice(draggedTaskIndex, 1);
        nextTasks.splice(targetIndex, 0, movedTask);
        return nextTasks;
      },
    };
  }

  const flatRows = buildFlatRows(tasks, taskRowHeight, subtaskRowHeight);
  const sourceTask = tasks.find((task) => task.id === draggedTaskId);
  if (!sourceTask) return null;
  const sourceSubtask = sourceTask.subtasks.find(
    (subtask) => subtask.id === draggedSubtaskId
  );
  if (!sourceSubtask) return null;

  let bestRow: FlatRow | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  let insertAfterRow = true;

  for (const row of flatRows) {
    if (row.type === "subtask" && row.subtaskId === draggedSubtaskId) continue;
    const rowMidpoint = row.y + row.h / 2;
    const distance = Math.abs(relativeY - rowMidpoint);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      bestRow = row;
      insertAfterRow = relativeY > rowMidpoint;
    }
  }

  if (!bestRow) return null;

  let targetTaskId: string;
  let targetSubtaskIndex: number;
  let indicatorY: number;

  if (bestRow.type === "task") {
    targetTaskId = bestRow.taskId;
    if (insertAfterRow) {
      targetSubtaskIndex = 0;
      indicatorY = bestRow.y + bestRow.h;
    } else {
      const previousTaskGroupIndex = bestRow.taskIndex - 1;
      if (previousTaskGroupIndex >= 0) {
        targetTaskId = tasks[previousTaskGroupIndex].id;
        targetSubtaskIndex = tasks[previousTaskGroupIndex].subtasks.length;
        indicatorY = bestRow.y;
      } else {
        targetTaskId = bestRow.taskId;
        targetSubtaskIndex = 0;
        indicatorY = bestRow.y + bestRow.h;
      }
    }
  } else {
    targetTaskId = bestRow.taskId;
    if (insertAfterRow) {
      targetSubtaskIndex = (bestRow.subtaskIndex ?? 0) + 1;
      indicatorY = bestRow.y + bestRow.h;
    } else {
      targetSubtaskIndex = bestRow.subtaskIndex ?? 0;
      indicatorY = bestRow.y;
    }
  }

  if (targetTaskId === draggedTaskId) {
    const sourceSubtaskIndex = sourceTask.subtasks.findIndex(
      (subtask) => subtask.id === draggedSubtaskId
    );
    if (
      targetSubtaskIndex === sourceSubtaskIndex ||
      targetSubtaskIndex === sourceSubtaskIndex + 1
    ) {
      return null;
    }
  }

  return {
    indicatorY,
    apply: (existingTasks) => {
      const movedSubtask = existingTasks
        .find((task) => task.id === draggedTaskId)
        ?.subtasks.find((subtask) => subtask.id === draggedSubtaskId);
      if (!movedSubtask) return existingTasks;

      let nextTasks = existingTasks.map((task) =>
        task.id === draggedTaskId
          ? {
              ...task,
              subtasks: task.subtasks.filter(
                (subtask) => subtask.id !== draggedSubtaskId
              ),
            }
          : task
      );

      nextTasks = nextTasks.map((task) => {
        if (task.id !== targetTaskId) return task;
        const subtasks = [...task.subtasks];
        let insertionIndex = targetSubtaskIndex;
        if (draggedTaskId === targetTaskId) {
          const sourceSubtaskIndex = sourceTask.subtasks.findIndex(
            (subtask) => subtask.id === draggedSubtaskId
          );
          if (targetSubtaskIndex > sourceSubtaskIndex) {
            insertionIndex = targetSubtaskIndex - 1;
          }
        }
        subtasks.splice(insertionIndex, 0, {
          ...movedSubtask,
          color: task.color,
        });
        return { ...task, subtasks };
      });

      return nextTasks;
    },
  };
};

export const useGanttDrag = (
  pixelsPerDay: number,
  rowConfig: { taskRowH: number; subtaskRowH: number } = {
    taskRowH: 56,
    subtaskRowH: 36,
  },
  chartBodyRef?: React.RefObject<HTMLElement | null>,
  displayTasks?: Task[]
) => {
  const [tasks, setTasks] = useAtom(tasksAtom);
  const [dragState, setDragState] = useState<{
    taskId: string;
    subtaskId?: string;
    mode: DragMode;
    startX: number;
    startY: number;
    originalStartDate: string;
    originalEndDate: string;
  } | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);

  const hasUndoSnapshot = useRef(false);
  const pushUndoSnapshot = usePushUndoSnapshot();
  const previousUserSelect = useRef<string | null>(null);

  const getPointerMode = useCallback(
    (event: React.PointerEvent, element: HTMLElement): DragMode => {
      const rect = element.getBoundingClientRect();
      const pointerX = event.clientX - rect.left;
      if (pointerX <= EDGE_ZONE_WIDTH) return "resize-start";
      if (pointerX >= rect.width - EDGE_ZONE_WIDTH) return "resize-end";
      return "move";
    },
    []
  );

  const startDrag = useCallback(
    (
      event: React.PointerEvent,
      taskId: string,
      subtaskId?: string,
      forcedMode?: DragMode
    ) => {
      const targetElement = event.currentTarget as HTMLElement;
      targetElement.setPointerCapture(event.pointerId);
      const mode = forcedMode ?? getPointerMode(event, targetElement);
      event.preventDefault();

      if (previousUserSelect.current === null) {
        previousUserSelect.current = document.body.style.userSelect;
      }
      document.body.style.userSelect = "none";

      const task = tasks.find((currentTask) => currentTask.id === taskId);
      if (!task) return;

      const timeline = subtaskId
        ? task.subtasks.find((subtask) => subtask.id === subtaskId)
        : task;
      if (!timeline) return;

      hasUndoSnapshot.current = false;
      setDropTarget(null);
      setDragState({
        taskId,
        subtaskId,
        mode,
        startX: event.clientX,
        startY: event.clientY,
        originalStartDate: timeline.startDate,
        originalEndDate: timeline.endDate,
      });
    },
    [getPointerMode, tasks]
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (!dragState) return;
      if (!hasUndoSnapshot.current) {
        pushUndoSnapshot();
        hasUndoSnapshot.current = true;
      }

      const deltaX = event.clientX - dragState.startX;
      const deltaY = event.clientY - dragState.startY;
      const dayDelta = Math.round(deltaX / pixelsPerDay);

      const originalStart = parseISO(dragState.originalStartDate);
      const originalEnd = parseISO(dragState.originalEndDate);

      let nextStartDate: Date;
      let nextEndDate: Date;

      if (dragState.mode === "move") {
        nextStartDate = addDays(originalStart, dayDelta);
        nextEndDate = addDays(originalEnd, dayDelta);
      } else if (dragState.mode === "resize-start") {
        nextStartDate = addDays(originalStart, dayDelta);
        nextEndDate = originalEnd;
        if (differenceInDays(nextEndDate, nextStartDate) < 1) {
          nextStartDate = addDays(nextEndDate, -1);
        }
      } else {
        nextStartDate = originalStart;
        nextEndDate = addDays(originalEnd, dayDelta);
        if (differenceInDays(nextEndDate, nextStartDate) < 1) {
          nextEndDate = addDays(nextStartDate, 1);
        }
      }

      const formatDate = (value: Date): string => format(value, "yyyy-MM-dd");

      setTasks((currentTasks) =>
        currentTasks.map((task) => {
          if (task.id !== dragState.taskId) return task;
          if (dragState.subtaskId) {
            return {
              ...task,
              subtasks: task.subtasks.map((subtask) =>
                subtask.id === dragState.subtaskId
                  ? {
                      ...subtask,
                      startDate: formatDate(nextStartDate),
                      endDate: formatDate(nextEndDate),
                    }
                  : subtask
              ),
            };
          }
          return {
            ...task,
            startDate: formatDate(nextStartDate),
            endDate: formatDate(nextEndDate),
          };
        })
      );

      if (
        dragState.mode === "move" &&
        chartBodyRef?.current &&
        Math.abs(deltaY) > VERTICAL_DRAG_THRESHOLD
      ) {
        const chartRect = chartBodyRef.current.getBoundingClientRect();
        const scrollTop = chartBodyRef.current.scrollTop;
        const relativeY = event.clientY - chartRect.top + scrollTop;
        const layoutTasks = displayTasks ?? tasks;

        const target = computeDropTarget(
          relativeY,
          layoutTasks,
          dragState.taskId,
          dragState.subtaskId,
          rowConfig.taskRowH,
          rowConfig.subtaskRowH
        );
        setDropTarget(target);
      } else if (dragState.mode === "move") {
        setDropTarget(null);
      }
    },
    [
      chartBodyRef,
      displayTasks,
      dragState,
      pixelsPerDay,
      pushUndoSnapshot,
      rowConfig.subtaskRowH,
      rowConfig.taskRowH,
      setTasks,
      tasks,
    ]
  );

  const endDrag = useCallback(() => {
    if (dropTarget) {
      setTasks((currentTasks) => dropTarget.apply(currentTasks));
    }
    setDragState(null);
    setDropTarget(null);
    document.body.style.userSelect = previousUserSelect.current ?? "";
    previousUserSelect.current = null;
  }, [dropTarget, setTasks]);

  useEffect(
    () => () => {
      document.body.style.userSelect = previousUserSelect.current ?? "";
      previousUserSelect.current = null;
    },
    []
  );

  const getCursor = useCallback(
    (event: React.PointerEvent, element: HTMLElement): string => {
      const mode = getPointerMode(event, element);
      if (mode === "resize-start" || mode === "resize-end") return "ew-resize";
      return "grab";
    },
    [getPointerMode]
  );

  return {
    isDragging: dragState !== null,
    dragTaskId: dragState?.taskId,
    dragSubtaskId: dragState?.subtaskId,
    dragMode: dragState?.mode,
    dropIndicatorY: dropTarget?.indicatorY ?? null,
    startDrag,
    onPointerMove,
    endDrag,
    getCursor,
  };
};
