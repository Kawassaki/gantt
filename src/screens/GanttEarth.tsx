import { addDays, parseISO } from "date-fns";
import { useAtomValue, useSetAtom } from "jotai";
import {
  Check,
  ChevronDown,
  Laptop,
  LocateFixed,
  Moon,
  Pipette,
  Plus,
  Sun,
  Trash2,
  X,
} from "lucide-react";
import { useRef, useCallback, useMemo, useState, useEffect } from "react";
import type { DateRange } from "react-day-picker";

import { GanttToolbar } from "../features/gantt/components";
import {
  FlagPennant,
  GrainFilter,
  GrainOverlay,
  WavyConnector,
} from "../features/gantt/components/chart";
import {
  HEADER_HEIGHT,
  LEFT_PANEL_DEFAULT_WIDTH,
  LEFT_PANEL_MAX_WIDTH,
  LEFT_PANEL_MIN_WIDTH,
  QUICK_DOUBLE_CLICK_MS,
  SUBTASK_ROW_HEIGHT,
  TASK_PRESET_COLORS,
  TASK_ROW_HEIGHT,
  THEME_COLORS,
  THEME_STORAGE_KEY,
} from "../features/gantt/constants";
import {
  useGanttDrag,
  useKeyboardShortcuts,
  useTimeline,
} from "../features/gantt/hooks";
import {
  addNewTaskAtom,
  addNewSubtaskAtom,
  addMarkerAtom,
  removeMarkerAtom,
  deleteTaskAtom,
  deleteSubtaskAtom,
  deleteTimelineTabAtom,
  createTimelineTabAtom,
  recolorTimelineTabAtom,
  renameTimelineTabAtom,
  reorderTimelineTabsAtom,
  updateTaskAtom,
  updateSubtaskAtom,
  updateMarkerAtom,
} from "../features/gantt/state/actions";
import {
  activeTabIdAtom,
  markersAtom,
  tabsAtom,
  tasksAtom,
} from "../features/gantt/state/store";
import type {
  Marker,
  ThemeMode,
  ThemePreference,
  TimelineViewMode,
} from "../features/gantt/types";
import { darkenHex } from "../features/gantt/utils/colors";
import {
  parseConfigDate,
  toConfigDate,
} from "../features/gantt/utils/dateConfig";
import { rowHeight, totalHeight } from "../features/gantt/utils/layoutMetrics";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../shared/components/alert-dialog";
import { DateRangePicker } from "../shared/components/date-range-picker";

const globalStyles = `
.earth-bar {
  transition: box-shadow 0.18s ease;
}
.earth-bar:hover {
  box-shadow: 0 4px 14px rgba(9,30,66,0.2) !important;
}
.earth-subtask-bar {
  transition: box-shadow 0.18s ease;
}
.earth-subtask-bar:hover {
  box-shadow: 0 3px 10px rgba(9,30,66,0.15) !important;
}
.earth-bar::before,
.earth-bar::after,
.earth-subtask-bar::before,
.earth-subtask-bar::after {
  content: "";
  position: absolute;
  top: 4px;
  bottom: 4px;
  width: 2px;
  border-radius: 2px;
  background: rgba(255,255,255,0.8);
  opacity: 0;
  transition: opacity 0.15s ease;
  pointer-events: none;
}
.earth-bar::before,
.earth-subtask-bar::before {
  left: 6px;
}
.earth-bar::after,
.earth-subtask-bar::after {
  right: 6px;
}
.earth-bar:hover::before,
.earth-bar:hover::after,
.earth-subtask-bar:hover::before,
.earth-subtask-bar:hover::after {
  opacity: 1;
}
.earth-row {
  transition: background-color 0.15s ease;
}
.earth-row:hover {
  background-color: var(--earth-row-hover);
}
.earth-toolbar-btn {
  background: var(--earth-toolbar-btn-bg);
  border: 1px solid var(--earth-toolbar-btn-border);
  color: var(--earth-charcoal);
  transition: all 0.15s ease;
}
.earth-toolbar-btn:hover {
  background: var(--earth-toolbar-btn-hover-bg);
  border-color: var(--earth-toolbar-btn-hover-border);
}
.earth-toolbar-btn:disabled {
  opacity: 0.35;
}
.earth-toolbar-btn-glass {
  border-radius: 999px !important;
  backdrop-filter: blur(8px);
}
.earth-toolbar-btn-editorial {
  border-radius: 5px !important;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding-inline: 10px !important;
}
.earth-toolbar-btn-capsule {
  border-radius: 999px !important;
  border-color: rgba(88, 166, 255, 0.35) !important;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.12);
}
.earth-toolbar-btn-brutalist {
  border-radius: 0 !important;
  border-width: 2px !important;
  font-weight: 700 !important;
  box-shadow: 2px 2px 0 rgba(23, 43, 77, 0.35);
}
.earth-toolbar-btn-minimal {
  border-radius: 999px !important;
  border-color: transparent !important;
  background: transparent !important;
  text-decoration: underline;
  text-underline-offset: 4px;
  padding: 4px !important;
}
.earth-toolbar-btn-minimal.earth-toolbar-btn--io {
  text-decoration: none;
}
.earth-toolbar-btn-minimal:hover {
  border-color: var(--earth-toolbar-btn-border) !important;
  background: var(--earth-toolbar-btn-bg) !important;
}
.earth-divider-glass,
.earth-divider-editorial,
.earth-divider-capsule,
.earth-divider-brutalist,
.earth-divider-minimal {
  width: 1px;
  height: 18px;
}
.earth-divider-brutalist {
  width: 2px;
  opacity: 0.6;
}
.earth-title {
  color: var(--earth-accent);
}
@keyframes earth-subrow-in {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.earth-subrow {
  animation: earth-subrow-in 0.16s ease-out;
}
`;

const TODAY_MARKER_ID = "__today_marker__";
const MARKER_MIN_VISIBLE_X = 12;
const CHART_TOP_GAP = 28;

export default function GanttEarth() {
  const [themePreference, setThemePreference] = useState<ThemePreference>(
    () => {
      if (typeof window === "undefined") return "light";
      const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (stored === "light" || stored === "dark" || stored === "system")
        return stored;
      return "light";
    }
  );
  const [systemThemeMode, setSystemThemeMode] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });
  const themeMode: ThemeMode =
    themePreference === "system" ? systemThemeMode : themePreference;
  const C = THEME_COLORS[themeMode];
  const tabs = useAtomValue(tabsAtom);
  const activeTabId = useAtomValue(activeTabIdAtom);
  const setActiveTabId = useSetAtom(activeTabIdAtom);
  const tasks = useAtomValue(tasksAtom);
  const markers = useAtomValue(markersAtom);
  const {
    config,
    pxPerDay,
    totalWidth,
    viewMode,
    dayColumns,
    gridColumns,
    topHeaders,
    bottomHeaders,
    barStyle,
    dateToX,
    xToDate,
    setViewMode,
    setDateRange,
  } = useTimeline();
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const headerRightRef = useRef<HTMLDivElement>(null);
  const taskClickTimerRef = useRef<number | null>(null);
  const lastRowClickRef = useRef<{ key: string; at: number } | null>(null);
  const resizeStartRef = useRef<{ startX: number; startWidth: number } | null>(
    null
  );
  const markerDragRef = useRef<{
    markerId: string;
    pointerId: number;
    startClientX: number;
    currentX: number;
    startX: number;
  } | null>(null);
  const prevCursorRef = useRef<string | null>(null);
  const prevUserSelectRef = useRef<string | null>(null);
  const [leftPanelWidth, setLeftPanelWidth] = useState(
    LEFT_PANEL_DEFAULT_WIDTH
  );
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [collapsedTaskIds, setCollapsedTaskIds] = useState<Set<string>>(
    () => new Set()
  );
  const displayTasks = useMemo(
    () =>
      tasks.map((task) =>
        collapsedTaskIds.has(task.id) ? { ...task, subtasks: [] } : task
      ),
    [tasks, collapsedTaskIds]
  );
  const {
    isDragging,
    dragTaskId,
    dragSubtaskId,
    startDrag,
    onPointerMove,
    endDrag,
    getCursor,
    dropIndicatorY,
  } = useGanttDrag(
    pxPerDay,
    { taskRowH: TASK_ROW_HEIGHT, subtaskRowH: SUBTASK_ROW_HEIGHT },
    rightRef,
    displayTasks,
    CHART_TOP_GAP
  );
  const addTask = useSetAtom(addNewTaskAtom);
  const addSubtask = useSetAtom(addNewSubtaskAtom);
  const deleteTask = useSetAtom(deleteTaskAtom);
  const deleteSubtask = useSetAtom(deleteSubtaskAtom);
  const updateTask = useSetAtom(updateTaskAtom);
  const updateSubtask = useSetAtom(updateSubtaskAtom);
  const addMarker = useSetAtom(addMarkerAtom);
  const removeMarker = useSetAtom(removeMarkerAtom);
  const updateMarker = useSetAtom(updateMarkerAtom);
  const createTimelineTab = useSetAtom(createTimelineTabAtom);
  const renameTimelineTab = useSetAtom(renameTimelineTabAtom);
  const recolorTimelineTab = useSetAtom(recolorTimelineTabAtom);
  const reorderTimelineTabs = useSetAtom(reorderTimelineTabsAtom);
  const deleteTimelineTab = useSetAtom(deleteTimelineTabAtom);
  useKeyboardShortcuts();

  const [editingName, setEditingName] = useState<{
    taskId: string;
    subtaskId?: string;
    value: string;
  } | null>(null);
  const [openColorTaskId, setOpenColorTaskId] = useState<string | null>(null);
  const [openColorTabId, setOpenColorTabId] = useState<string | null>(null);
  const [tabColorMenuPosition, setTabColorMenuPosition] = useState<{
    tabId: string;
    top: number;
    left: number;
  } | null>(null);
  const [draggingTabId, setDraggingTabId] = useState<string | null>(null);
  const [tabNameEdit, setTabNameEdit] = useState<{
    tabId: string;
    value: string;
  } | null>(null);
  const [tabPendingDelete, setTabPendingDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [draggingMarkerId, setDraggingMarkerId] = useState<string | null>(null);
  const [draggingMarkerX, setDraggingMarkerX] = useState<number | null>(null);
  const [editingMarker, setEditingMarker] = useState<{
    markerId: string;
    value: string;
  } | null>(null);
  const [openMarkerMenuId, setOpenMarkerMenuId] = useState<string | null>(null);
  const setTheme = useCallback((preference: ThemePreference) => {
    setThemePreference(preference);
  }, []);

  const selectedRange = useMemo<DateRange | undefined>(
    () => ({
      from: parseConfigDate(config.startDate),
      to: parseConfigDate(config.endDate),
    }),
    [config.endDate, config.startDate]
  );
  const todayDate = useMemo(() => toConfigDate(new Date()), []);

  const applyMode = useCallback(
    (mode: TimelineViewMode) => {
      setViewMode(mode);
    },
    [setViewMode]
  );

  const handleResetToTodayMarker = useCallback(() => {
    const viewport = rightRef.current;
    if (!viewport) return;
    const todayX = dateToX(todayDate);
    const targetLeft = todayX - viewport.clientWidth / 2;
    const maxLeft = Math.max(0, totalWidth - viewport.clientWidth);
    const clampedLeft = Math.min(maxLeft, Math.max(0, targetLeft));
    viewport.scrollTo({ left: clampedLeft, behavior: "smooth" });
    if (headerRightRef.current) {
      headerRightRef.current.scrollLeft = clampedLeft;
    }
  }, [dateToX, todayDate, totalWidth]);

  const handleRangeChange = useCallback(
    (range: DateRange | undefined) => {
      if (!range?.from || !range?.to) return;
      setDateRange(toConfigDate(range.from), toConfigDate(range.to));
    },
    [setDateRange]
  );

  const activeTab = useMemo(
    () => tabs.find((tab) => tab.id === activeTabId) ?? tabs[0],
    [activeTabId, tabs]
  );

  const startTabNameEdit = useCallback((tabId: string, title: string) => {
    setTabNameEdit({ tabId, value: title });
  }, []);

  const cancelTabNameEdit = useCallback(() => {
    setTabNameEdit(null);
  }, []);

  const commitTabNameEdit = useCallback(() => {
    if (!tabNameEdit) return;
    renameTimelineTab({ tabId: tabNameEdit.tabId, title: tabNameEdit.value });
    setTabNameEdit(null);
  }, [renameTimelineTab, tabNameEdit]);

  const handleTabDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>, tabId: string) => {
      setDraggingTabId(tabId);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", tabId);
    },
    []
  );

  const handleTabDrop = useCallback(
    (targetTabId: string) => {
      if (!draggingTabId || draggingTabId === targetTabId) {
        setDraggingTabId(null);
        return;
      }

      const fromIndex = tabs.findIndex((tab) => tab.id === draggingTabId);
      const toIndex = tabs.findIndex((tab) => tab.id === targetTabId);
      if (fromIndex >= 0 && toIndex >= 0 && fromIndex !== toIndex) {
        reorderTimelineTabs({ fromIndex, toIndex });
      }
      setDraggingTabId(null);
    },
    [draggingTabId, reorderTimelineTabs, tabs]
  );

  const handleConfirmTabDelete = useCallback(() => {
    if (!tabPendingDelete) return;
    deleteTimelineTab(tabPendingDelete.id);
    setTabPendingDelete(null);
  }, [deleteTimelineTab, tabPendingDelete]);

  const startNameEdit = useCallback(
    (taskId: string, currentName: string, subtaskId?: string) => {
      setEditingName({ taskId, subtaskId, value: currentName });
    },
    []
  );

  const cancelNameEdit = useCallback(() => {
    setEditingName(null);
  }, []);

  const commitNameEdit = useCallback(() => {
    if (!editingName) return;
    const nextName = editingName.value.trim();
    if (!nextName) {
      setEditingName(null);
      return;
    }

    const task = tasks.find((t) => t.id === editingName.taskId);
    if (!task) {
      setEditingName(null);
      return;
    }

    if (editingName.subtaskId) {
      const sub = task.subtasks.find((s) => s.id === editingName.subtaskId);
      if (!sub || sub.name === nextName) {
        setEditingName(null);
        return;
      }
      updateSubtask({
        taskId: task.id,
        subtask: { ...sub, name: nextName },
      });
      setEditingName(null);
      return;
    }

    if (task.name !== nextName) {
      updateTask({ ...task, name: nextName });
    }
    setEditingName(null);
  }, [editingName, tasks, updateTask, updateSubtask]);

  const toggleTaskCollapsed = useCallback((taskId: string) => {
    setCollapsedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }, []);

  const handleTaskColorChange = useCallback(
    (taskId: string, nextColor: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task || task.color === nextColor) return;
      updateTask({
        ...task,
        color: nextColor,
        // Keep subtask data color in sync with parent task color.
        subtasks: task.subtasks.map((s) => ({ ...s, color: nextColor })),
      });
    },
    [tasks, updateTask]
  );

  const handleLeftRowPointerDown = useCallback(
    (e: React.PointerEvent, taskId: string, subtaskId?: string) => {
      const target = e.target as HTMLElement;
      if (target.closest("button") || target.closest("input")) return;
      if (editingName) return;
      startDrag(e, taskId, subtaskId, "move");
    },
    [editingName, startDrag]
  );

  const handleRowClick = useCallback(
    (
      e: React.MouseEvent,
      taskId: string,
      currentName: string,
      subtaskId?: string
    ) => {
      const target = e.target as HTMLElement;
      if (target.closest("button") || target.closest("input")) return;
      if (editingName || isDragging) return;

      const key = subtaskId ? `${taskId}:${subtaskId}` : taskId;
      const now = performance.now();
      const last = lastRowClickRef.current;
      if (last && last.key === key && now - last.at <= QUICK_DOUBLE_CLICK_MS) {
        if (taskClickTimerRef.current !== null) {
          window.clearTimeout(taskClickTimerRef.current);
          taskClickTimerRef.current = null;
        }
        lastRowClickRef.current = null;
        startNameEdit(taskId, currentName, subtaskId);
        return;
      }
      lastRowClickRef.current = { key, at: now };

      if (subtaskId) return;
      if (taskClickTimerRef.current !== null) {
        window.clearTimeout(taskClickTimerRef.current);
      }
      taskClickTimerRef.current = window.setTimeout(() => {
        toggleTaskCollapsed(taskId);
        taskClickTimerRef.current = null;
      }, QUICK_DOUBLE_CLICK_MS);
    },
    [editingName, isDragging, startNameEdit, toggleTaskCollapsed]
  );

  const stopSidebarResize = useCallback(() => {
    resizeStartRef.current = null;
    setIsResizingSidebar(false);
    document.body.style.cursor = prevCursorRef.current ?? "";
    document.body.style.userSelect = prevUserSelectRef.current ?? "";
    prevCursorRef.current = null;
    prevUserSelectRef.current = null;
  }, []);

  const handleSidebarResizeStart = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      resizeStartRef.current = {
        startX: e.clientX,
        startWidth: leftPanelWidth,
      };
      setIsResizingSidebar(true);
      prevCursorRef.current = document.body.style.cursor;
      prevUserSelectRef.current = document.body.style.userSelect;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [leftPanelWidth]
  );

  useEffect(() => {
    if (!isResizingSidebar) return;

    const onPointerMove = (e: PointerEvent) => {
      if (!resizeStartRef.current) return;
      const delta = e.clientX - resizeStartRef.current.startX;
      const next = Math.min(
        LEFT_PANEL_MAX_WIDTH,
        Math.max(
          LEFT_PANEL_MIN_WIDTH,
          resizeStartRef.current.startWidth + delta
        )
      );
      setLeftPanelWidth(next);
    };

    const onPointerUp = () => stopSidebarResize();

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [isResizingSidebar, stopSidebarResize]);

  useEffect(() => {
    return () => {
      document.body.style.cursor = prevCursorRef.current ?? "";
      document.body.style.userSelect = prevUserSelectRef.current ?? "";
      prevCursorRef.current = null;
      prevUserSelectRef.current = null;
      if (taskClickTimerRef.current !== null) {
        window.clearTimeout(taskClickTimerRef.current);
        taskClickTimerRef.current = null;
      }
      lastRowClickRef.current = null;
    };
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const onThemeChange = (event: MediaQueryListEvent) => {
      setSystemThemeMode(event.matches ? "dark" : "light");
    };
    mediaQuery.addEventListener("change", onThemeChange);
    return () => mediaQuery.removeEventListener("change", onThemeChange);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, themePreference);
    document.documentElement.dataset.theme = themeMode;
    document.documentElement.style.setProperty("color-scheme", themeMode);
    document.documentElement.style.setProperty("--app-bg", C.appBg);
    document.documentElement.style.setProperty("--app-text", C.charcoal);
  }, [C.appBg, C.charcoal, themeMode, themePreference]);

  useEffect(() => {
    if (!openColorTaskId && !openColorTabId && !openMarkerMenuId) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.closest("[data-task-color-menu]") ||
        target.closest("[data-task-color-trigger]")
      ) {
        return;
      }
      if (
        target.closest("[data-tab-color-menu]") ||
        target.closest("[data-tab-color-trigger]")
      ) {
        return;
      }
      if (
        target.closest("[data-marker-actions-menu]") ||
        target.closest("[data-marker-actions-trigger]")
      ) {
        return;
      }
      setOpenColorTaskId(null);
      setOpenColorTabId(null);
      setTabColorMenuPosition(null);
      setOpenMarkerMenuId(null);
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [openColorTaskId, openColorTabId, openMarkerMenuId]);

  const syncScroll = useCallback((source: "left" | "right") => {
    const l = leftRef.current;
    const r = rightRef.current;
    const h = headerRightRef.current;
    if (!l || !r) return;
    if (source === "left") {
      r.scrollTop = l.scrollTop;
    } else {
      l.scrollTop = r.scrollTop;
      if (h) h.scrollLeft = r.scrollLeft;
    }
  }, []);

  const clampMarkerX = useCallback(
    (x: number) => Math.max(0, Math.min(totalWidth, x)),
    [totalWidth]
  );

  const handleMarkerPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, marker: Marker) => {
      if (marker.id === TODAY_MARKER_ID) return;
      if (e.button !== 0) return;
      const target = e.target as HTMLElement;
      if (target.closest("input") || target.closest("button")) return;
      e.preventDefault();
      e.stopPropagation();
      const startX = clampMarkerX(dateToX(marker.date));
      markerDragRef.current = {
        markerId: marker.id,
        pointerId: e.pointerId,
        startClientX: e.clientX,
        currentX: startX,
        startX,
      };
      setDraggingMarkerId(marker.id);
      setDraggingMarkerX(startX);
    },
    [clampMarkerX, dateToX]
  );

  const handleMarkerDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, marker: Marker) => {
      if (marker.id === TODAY_MARKER_ID) return;
      e.preventDefault();
      e.stopPropagation();
      setEditingMarker({ markerId: marker.id, value: marker.label });
    },
    []
  );

  const commitMarkerEdit = useCallback(() => {
    if (!editingMarker) return;
    const marker = markers.find((m) => m.id === editingMarker.markerId);
    if (!marker) {
      setEditingMarker(null);
      return;
    }
    const trimmed = editingMarker.value.trim();
    if (trimmed && trimmed !== marker.label) {
      updateMarker({ ...marker, label: trimmed });
    }
    setEditingMarker(null);
  }, [editingMarker, markers, updateMarker]);

  const cancelMarkerEdit = useCallback(() => {
    setEditingMarker(null);
  }, []);

  const handleMarkerColorChange = useCallback(
    (markerId: string, nextColor: string) => {
      const marker = markers.find((m) => m.id === markerId);
      if (!marker || marker.color === nextColor) return;
      updateMarker({ ...marker, color: nextColor });
    },
    [markers, updateMarker]
  );

  const handleRemoveMarker = useCallback(
    (markerId: string) => {
      if (editingMarker?.markerId === markerId) {
        setEditingMarker(null);
      }
      setOpenMarkerMenuId((prev) => (prev === markerId ? null : prev));
      removeMarker(markerId);
    },
    [editingMarker, removeMarker]
  );

  const handleChartDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (editingMarker) return;
      const target = e.target as HTMLElement;
      if (target.closest("[data-marker-id]")) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = clampMarkerX(e.clientX - rect.left);
      const markerDate = xToDate(x);
      addMarker({
        date: markerDate,
        label: `Marker ${markers.length + 1}`,
        color: C.terracotta,
      });
    },
    [
      C.terracotta,
      addMarker,
      clampMarkerX,
      editingMarker,
      markers.length,
      xToDate,
    ]
  );

  useEffect(() => {
    if (!draggingMarkerId) return;

    const onPointerMove = (e: PointerEvent) => {
      const drag = markerDragRef.current;
      if (!drag || e.pointerId !== drag.pointerId) return;
      const delta = e.clientX - drag.startClientX;
      const nextX = clampMarkerX(drag.startX + delta);
      drag.currentX = nextX;
      setDraggingMarkerX(nextX);
    };

    const finish = (e?: PointerEvent) => {
      const drag = markerDragRef.current;
      if (!drag) return;
      if (e && e.pointerId !== drag.pointerId) return;
      const marker = markers.find((m) => m.id === drag.markerId);
      if (marker) {
        const nextDate = xToDate(drag.currentX);
        if (nextDate !== marker.date) {
          updateMarker({ ...marker, date: nextDate });
        }
      }
      markerDragRef.current = null;
      setDraggingMarkerId(null);
      setDraggingMarkerX(null);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
    };
  }, [clampMarkerX, draggingMarkerId, markers, updateMarker, xToDate]);

  const chartHeight = totalHeight(displayTasks);
  const chartCanvasHeight = chartHeight + CHART_TOP_GAP;
  const timelineMarkers = useMemo<Marker[]>(
    () => [
      {
        id: TODAY_MARKER_ID,
        date: todayDate,
        label: "Today",
        color: C.terracotta,
      },
      ...markers.filter((marker) => marker.id !== TODAY_MARKER_ID),
    ],
    [C.terracotta, markers, todayDate]
  );
  const chartStartDate = useMemo(
    () => parseISO(config.startDate),
    [config.startDate]
  );
  const weekendColumns = useMemo(
    () =>
      dayColumns.filter((_, index) => {
        const day = addDays(chartStartDate, index);
        const dayOfWeek = day.getDay();
        return dayOfWeek === 0 || dayOfWeek === 6;
      }),
    [chartStartDate, dayColumns]
  );

  const rowOffsets = useMemo(() => {
    const offsets: number[] = [];
    let y = 0;
    for (const t of displayTasks) {
      offsets.push(y);
      y += rowHeight(t);
    }
    return offsets;
  }, [displayTasks]);

  const renderThemeControl = ({
    containerBg,
    containerBorder,
    inactiveColor,
    themeActiveBg,
    shadow,
  }: {
    containerBg: string;
    containerBorder: string;
    inactiveColor: string;
    themeActiveBg: string;
    shadow?: string;
  }) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: 4,
        gap: 4,
        borderRadius: 999,
        border: `1px solid ${containerBorder}`,
        background: containerBg,
        boxShadow: shadow,
        flexShrink: 0,
      }}
    >
      <button
        onClick={() => setTheme("light")}
        style={{
          border: "none",
          borderRadius: 999,
          width: 26,
          height: 26,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: inactiveColor,
          background:
            themePreference === "light" ? themeActiveBg : "transparent",
          transition: "all 0.15s ease",
        }}
        title="Use light mode"
        aria-label="Use light mode"
      >
        <Sun size={14} />
      </button>
      <button
        onClick={() => setTheme("dark")}
        style={{
          border: "none",
          borderRadius: 999,
          width: 26,
          height: 26,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: inactiveColor,
          background:
            themePreference === "dark" ? themeActiveBg : "transparent",
          transition: "all 0.15s ease",
        }}
        title="Use dark mode"
        aria-label="Use dark mode"
      >
        <Moon size={14} />
      </button>
      <button
        onClick={() => setTheme("system")}
        style={{
          border: "none",
          borderRadius: 999,
          width: 26,
          height: 26,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: inactiveColor,
          background:
            themePreference === "system" ? themeActiveBg : "transparent",
          transition: "all 0.15s ease",
        }}
        title="Use system theme preference"
        aria-label="Use system theme preference"
      >
        <Laptop size={14} />
      </button>
    </div>
  );

  return (
    <div
      style={{
        background: C.appBg,
        color: C.charcoal,
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
        transition: "background-color 0.2s ease, color 0.2s ease",
        ["--earth-accent" as string]: C.terracotta,
        ["--earth-charcoal" as string]: C.charcoal,
        ["--earth-row-hover" as string]: C.rowHover,
        ["--earth-toolbar-btn-bg" as string]: C.toolbarBtnBg,
        ["--earth-toolbar-btn-border" as string]: C.toolbarBtnBorder,
        ["--earth-toolbar-btn-hover-bg" as string]: C.toolbarBtnHoverBg,
        ["--earth-toolbar-btn-hover-border" as string]: C.toolbarBtnHoverBorder,
      }}
    >
      <style>{globalStyles}</style>
      <GrainFilter />
      <GrainOverlay opacity={C.overlayOpacity} />

      {/* Header concepts */}
      <div
        style={{
          padding: 0,
          borderBottom: `1px solid ${C.ruleLight}`,
          background: C.toolbarBg,
          backdropFilter: "blur(10px)",
          zIndex: 30,
          position: "relative",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "stretch",
            justifyContent: "space-between",
            gap: 14,
            border: `1px solid ${C.ruleLight}`,
            background:
              themeMode === "dark"
                ? "linear-gradient(90deg, rgba(230,237,243,0.04), rgba(88,166,255,0.1), rgba(230,237,243,0.04))"
                : "linear-gradient(90deg, rgba(0,82,204,0.03), rgba(255,255,255,0.92), rgba(0,82,204,0.05))",
            borderRadius: 14,
            padding: "12px 14px",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 9,
              minWidth: 0,
              flex: 1,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 10,
                  minWidth: 0,
                }}
              >
                <strong
                  style={{
                    fontSize: 18,
                    letterSpacing: "-0.02em",
                    whiteSpace: "nowrap",
                  }}
                >
                  C&C Gantt
                </strong>
              </div>
              <span
                style={{
                  fontSize: 10,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  opacity: 0.55,
                  padding: "3px 8px",
                  borderRadius: 999,
                  border: `1px solid ${C.ruleLight}`,
                  background:
                    themeMode === "dark"
                      ? "rgba(13,17,23,0.5)"
                      : "rgba(255,255,255,0.72)",
                }}
              >
                Command Strip
              </span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 10px",
                borderRadius: 10,
                border: `1px solid ${activeTab?.color ?? C.ruleLight}`,
                background:
                  themeMode === "dark"
                    ? "rgba(13,17,23,0.58)"
                    : "rgba(255,255,255,0.78)",
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  opacity: 0.55,
                  whiteSpace: "nowrap",
                  maxWidth: "320px",
                  width: "fit-content",
                  textOverflow: "ellipsis",
                  overflow: "hidden",
                }}
              >
                Actions • <strong>{activeTab?.title ?? "Timeline"}</strong>
              </span>
              <GanttToolbar
                className="gap-1.5"
                buttonClass="earth-toolbar-btn earth-toolbar-btn-minimal"
                accentColor={activeTab?.color ?? C.terracotta}
                dividerClass="earth-divider-minimal"
              />
              <div
                style={{
                  width: 1,
                  height: 18,
                  background: C.ruleLight,
                  opacity: 0.6,
                }}
              />
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  flexWrap: "nowrap",
                  minWidth: 0,
                }}
              >
                {(["day", "week", "month", "year"] as TimelineViewMode[]).map(
                  (mode) => {
                    const active = viewMode === mode;
                    return (
                      <button
                        key={mode}
                        onClick={() => applyMode(mode)}
                        style={{
                          border: `1px solid ${active ? (activeTab?.color ?? C.terracotta) : C.ruleLight}`,
                          background: active
                            ? themeMode === "dark"
                              ? "rgba(88,166,255,0.24)"
                              : "rgba(0,82,204,0.11)"
                            : "transparent",
                          color: C.charcoal,
                          borderRadius: 8,
                          padding: "4px 10px",
                          fontSize: 10,
                          letterSpacing: "0.05em",
                          textTransform: "uppercase",
                          fontWeight: 700,
                          cursor: "pointer",
                          opacity: active ? 1 : 0.75,
                          transition: "all 0.15s ease",
                        }}
                        title={`View by ${mode}`}
                      >
                        {mode}
                      </button>
                    );
                  }
                )}
                <DateRangePicker
                  value={selectedRange}
                  onChange={handleRangeChange}
                  isDark={themeMode === "dark"}
                  buttonStyle={{
                    border: `1px solid ${C.ruleLight}`,
                    background:
                      themeMode === "dark"
                        ? "rgba(13,17,23,0.7)"
                        : "rgba(255,255,255,0.92)",
                    color: C.charcoal,
                  }}
                  popoverStyle={{
                    border: `1px solid ${C.ruleLight}`,
                    background:
                      themeMode === "dark"
                        ? "rgba(13,17,23,0.98)"
                        : "rgba(255,255,255,0.98)",
                    boxShadow:
                      themeMode === "dark"
                        ? "0 14px 36px rgba(0,0,0,0.5)"
                        : "0 14px 30px rgba(9,30,66,0.18)",
                  }}
                />
                <button
                  onClick={handleResetToTodayMarker}
                  style={{
                    border: `1px solid ${C.ruleLight}`,
                    background: "transparent",
                    color: C.charcoal,
                    borderRadius: 8,
                    width: 30,
                    height: 30,
                    cursor: "pointer",
                    opacity: 0.8,
                    transition: "all 0.15s ease",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  title="Center chart on Today marker"
                  aria-label="Center chart on Today marker"
                >
                  <LocateFixed size={12} />
                </button>
              </div>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              width: "116px",
              gap: 8,
              paddingLeft: 12,
              borderLeft: `1px solid ${C.ruleLight}`,
            }}
          >
            {renderThemeControl({
              containerBg:
                themeMode === "dark"
                  ? "rgba(13,17,23,0.7)"
                  : "rgba(255,255,255,0.86)",
              containerBorder: C.ruleLight,
              inactiveColor: C.charcoal,
              themeActiveBg: "rgba(88,166,255,0.28)",
            })}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          borderBottom: `1px solid ${C.ruleLight}`,
          background: C.cream,
          minHeight: 62,
          zIndex: 70,
        }}
      >
        <div
          style={{
            width: leftPanelWidth,
            minWidth: leftPanelWidth,
            borderRight: `1px solid ${C.ruleLight}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            gap: 8,
            padding: "10px 12px",
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              opacity: 0.55,
            }}
          >
            Timelines
          </span>
        </div>

        <div
          style={{
            flex: 1,
            minWidth: 0,
            padding: "8px 10px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            overflowX: "auto",
          }}
        >
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            const isEditing = tabNameEdit?.tabId === tab.id;
            return (
              <div
                key={tab.id}
                draggable
                onDragStart={(e) => handleTabDragStart(e, tab.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleTabDrop(tab.id)}
                onDragEnd={() => setDraggingTabId(null)}
                onClick={() => setActiveTabId(tab.id)}
                onDoubleClick={() => startTabNameEdit(tab.id, tab.title)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  height: 44,
                  minWidth: 180,
                  maxWidth: 280,
                  borderRadius: 11,
                  padding: "0 10px",
                  border: `1px solid ${isActive ? tab.color : C.ruleLight}`,
                  background: isActive
                    ? themeMode === "dark"
                      ? "rgba(13,17,23,0.78)"
                      : "rgba(255,255,255,0.96)"
                    : "transparent",
                  boxShadow: isActive
                    ? `inset 0 0 0 1px ${tab.color}22`
                    : "none",
                  cursor: "pointer",
                  opacity: draggingTabId === tab.id ? 0.55 : 1,
                  transition: "all 0.14s ease",
                  flexShrink: 0,
                }}
              >
                {isEditing ? (
                  <>
                    <input
                      autoFocus
                      value={tabNameEdit.value}
                      onChange={(e) => {
                        const nextValue = e.currentTarget.value;
                        setTabNameEdit((prev) =>
                          prev ? { ...prev, value: nextValue } : prev
                        );
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          commitTabNameEdit();
                        }
                        if (e.key === "Escape") {
                          e.preventDefault();
                          cancelTabNameEdit();
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        border: `1px solid ${C.ruleLight}`,
                        borderRadius: 8,
                        height: 28,
                        padding: "0 8px",
                        fontSize: 12,
                        color: C.charcoal,
                        background: C.editorBg,
                        outline: "none",
                      }}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        commitTabNameEdit();
                      }}
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 999,
                        border: `1px solid ${C.ruleLight}`,
                        background: "transparent",
                        color: C.charcoal,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                      }}
                      title="Apply tab name"
                      aria-label="Apply tab name"
                    >
                      <Check size={12} />
                    </button>
                  </>
                ) : (
                  <>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        minWidth: 0,
                        flex: 1,
                      }}
                    >
                      {tab.title}
                    </span>

                    <div
                      style={{
                        position: "relative",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        height: "100%",
                      }}
                    >
                      <button
                        data-tab-color-trigger
                        onClick={(e) => {
                          e.stopPropagation();
                          const triggerBounds =
                            e.currentTarget.getBoundingClientRect();
                          setOpenColorTabId((prev) => {
                            if (prev === tab.id) {
                              setTabColorMenuPosition(null);
                              return null;
                            }
                            setTabColorMenuPosition({
                              tabId: tab.id,
                              top: triggerBounds.bottom + 6,
                              left: triggerBounds.right,
                            });
                            return tab.id;
                          });
                        }}
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 999,
                          border: `1px solid ${C.ruleLight}`,
                          background: tab.color,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        title="Change tab color"
                        aria-label="Change tab color"
                      >
                        {openColorTabId === tab.id && (
                          <Pipette
                            size={10}
                            color={themeMode === "dark" ? C.charcoal : C.ivory}
                          />
                        )}
                      </button>

                      {openColorTabId === tab.id &&
                        tabColorMenuPosition?.tabId === tab.id && (
                          <div
                            data-tab-color-menu
                            style={{
                              position: "fixed",
                              top: tabColorMenuPosition.top,
                              left: tabColorMenuPosition.left,
                              transform: "translateX(-100%)",
                              zIndex: 80,
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              padding: 8,
                              borderRadius: 10,
                              border: `1px solid ${C.ruleLight}`,
                              background: C.cream,
                              boxShadow:
                                "0 8px 18px rgba(9,30,66,0.12), 0 1px 2px rgba(9,30,66,0.08)",
                            }}
                          >
                            {TASK_PRESET_COLORS.map((color) => (
                              <button
                                key={color}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  recolorTimelineTab({ tabId: tab.id, color });
                                  setOpenColorTabId(null);
                                  setTabColorMenuPosition(null);
                                }}
                                style={{
                                  width: 14,
                                  height: 14,
                                  borderRadius: 999,
                                  border: `1px solid ${C.ruleLight}`,
                                  background: color,
                                  cursor: "pointer",
                                  padding: 0,
                                }}
                                title={`Set tab color ${color}`}
                              />
                            ))}
                            <label
                              style={{
                                width: 16,
                                height: 16,
                                borderRadius: 999,
                                border: `1px solid ${C.ruleLight}`,
                                background: tab.color,
                                position: "relative",
                                overflow: "hidden",
                                cursor: "pointer",
                              }}
                              title="Custom tab color"
                            >
                              <input
                                type="color"
                                value={tab.color}
                                onChange={(e) =>
                                  recolorTimelineTab({
                                    tabId: tab.id,
                                    color: e.currentTarget.value,
                                  })
                                }
                                style={{
                                  position: "absolute",
                                  inset: 0,
                                  opacity: 0,
                                  cursor: "pointer",
                                }}
                              />
                            </label>
                          </div>
                        )}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setTabPendingDelete({ id: tab.id, title: tab.title });
                      }}
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 999,
                        border: "none",
                        background: "transparent",
                        color: C.charcoal,
                        opacity: 0.55,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      title="Delete tab"
                      aria-label="Delete tab"
                    >
                      <X size={12} />
                    </button>
                  </>
                )}
              </div>
            );
          })}
          <button
            onClick={() => createTimelineTab()}
            style={{
              width: 30,
              height: 30,
              borderRadius: 999,
              border: `1px solid ${C.ruleLight}`,
              background:
                themeMode === "dark"
                  ? "rgba(13,17,23,0.65)"
                  : "rgba(255,255,255,0.9)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: C.terracotta,
              cursor: "pointer",
              flexShrink: 0,
            }}
            title="Create new timeline tab"
            aria-label="Create new timeline tab"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* Header */}
      <div
        style={{
          display: "flex",
          flexShrink: 0,
          borderBottom: `1px solid ${C.ruleLight}`,
          zIndex: 20,
          position: "relative",
        }}
      >
        {/* Left header */}
        <div
          style={{
            width: leftPanelWidth,
            minWidth: leftPanelWidth,
            height: HEADER_HEIGHT,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            padding: "0 20px 10px",
            borderRight: `1px solid ${C.ruleLight}`,
            background: C.cream,
          }}
        >
          <span
            style={{
              fontWeight: 500,
              fontSize: 13,
              opacity: 0.45,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            Items
          </span>
          <button
            onClick={() => addTask()}
            style={{
              background: "transparent",
              border: `1px dashed rgba(9,30,66,0.15)`,
              borderRadius: 999,
              color: C.terracotta,
              fontSize: 12,
              padding: "4px 10px",
              cursor: "pointer",
              transition: "all 0.15s ease",
              opacity: 0.6,
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "1";
              e.currentTarget.style.background = "rgba(0,82,204,0.06)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "0.6";
              e.currentTarget.style.background = "transparent";
            }}
            title="Add task"
          >
            <Plus size={13} />
            Add Task
          </button>
        </div>
        {/* Right header */}
        <div
          ref={headerRightRef}
          style={{
            flex: 1,
            overflow: "hidden",
            height: HEADER_HEIGHT,
            background: C.cream,
          }}
        >
          <div
            style={{
              width: totalWidth,
              height: HEADER_HEIGHT,
              position: "relative",
            }}
          >
            {/* Top headers */}
            {topHeaders.map((m, i) => (
              <div
                key={`m${i}`}
                style={{
                  position: "absolute",
                  left: m.x,
                  top: 0,
                  width: m.width,
                  height: HEADER_HEIGHT / 2,
                  display: "flex",
                  alignItems: "center",
                  paddingLeft: 14,
                  fontWeight: 600,
                  fontSize: 13,
                  color: C.charcoal,
                  opacity: 0.7,
                  borderLeft: i > 0 ? `1px solid ${C.ruleLight}` : "none",
                }}
              >
                {m.label}
              </div>
            ))}
            {/* Bottom headers */}
            {bottomHeaders.map((w, i) => (
              <div
                key={`w${i}`}
                style={{
                  position: "absolute",
                  left: w.x,
                  top: HEADER_HEIGHT / 2,
                  width: w.width,
                  height: HEADER_HEIGHT / 2,
                  display: "flex",
                  alignItems: "center",
                  paddingLeft: 8,
                  fontSize: 11,
                  fontWeight: 500,
                  color: C.charcoal,
                  opacity: 0.4,
                  borderLeft: `1px solid ${C.ruleLight}`,
                }}
              >
                {w.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      <div
        style={{
          flex: 1,
          display: "flex",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          onPointerDown={handleSidebarResizeStart}
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: leftPanelWidth - 3,
            width: 6,
            cursor: "col-resize",
            zIndex: 40,
            background: isResizingSidebar
              ? "rgba(0,82,204,0.18)"
              : "transparent",
            transition: "background-color 0.12s ease",
          }}
          title="Resize sidebar"
        />
        {/* Left task names */}
        <div
          ref={leftRef}
          onScroll={() => syncScroll("left")}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          style={{
            width: leftPanelWidth,
            minWidth: leftPanelWidth,
            overflowY: "auto",
            overflowX: "hidden",
            borderRight: `1px solid ${C.ruleLight}`,
            background: C.cream,
            scrollbarWidth: "none",
          }}
        >
          <div style={{ height: chartCanvasHeight, position: "relative" }}>
            <div
              style={{
                height: CHART_TOP_GAP,
                borderBottom: `1px solid ${C.ruleLight}`,
                background:
                  themeMode === "dark"
                    ? "rgba(13,17,23,0.5)"
                    : "rgba(255,255,255,0.45)",
                display: "flex",
                alignItems: "center",
                padding: "0 20px",
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  opacity: 0.55,
                }}
              >
                Markers
              </span>
            </div>
            {displayTasks.map((task) => {
              const isTaskDragged =
                isDragging && dragTaskId === task.id && !dragSubtaskId;
              const isCollapsed = collapsedTaskIds.has(task.id);
              return (
                <div key={task.id} style={{ position: "relative" }}>
                  {/* Task name row */}
                  <div
                    className="earth-row"
                    onPointerDown={(e) => handleLeftRowPointerDown(e, task.id)}
                    onClick={(e) => handleRowClick(e, task.id, task.name)}
                    style={{
                      height: TASK_ROW_HEIGHT,
                      display: "flex",
                      alignItems: "center",
                      padding: "0 20px",
                      borderBottom: `1px solid ${C.ruleLight}`,
                      cursor: isDragging ? "grabbing" : "grab",
                      background: isTaskDragged
                        ? "rgba(0,82,204,0.08)"
                        : undefined,
                      boxShadow: isTaskDragged
                        ? "inset 0 0 0 1px rgba(0,82,204,0.25)"
                        : undefined,
                      transition:
                        "background-color 0.1s ease, box-shadow 0.1s ease",
                    }}
                  >
                    <button
                      onClick={() => toggleTaskCollapsed(task.id)}
                      style={{
                        width: 20,
                        height: 20,
                        marginRight: 8,
                        flexShrink: 0,
                        borderRadius: 999,
                        border: `1px solid ${C.ruleLight}`,
                        background: "transparent",
                        color: C.charcoal,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: 0.45,
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = "1";
                        e.currentTarget.style.background = "rgba(9,30,66,0.08)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = "0.45";
                        e.currentTarget.style.background = "transparent";
                      }}
                      title={isCollapsed ? "Expand task" : "Collapse task"}
                    >
                      <ChevronDown
                        size={12}
                        style={{
                          transform: isCollapsed
                            ? "rotate(-90deg)"
                            : "rotate(0deg)",
                          transition: "transform 0.16s ease",
                        }}
                      />
                    </button>
                    {editingName?.taskId === task.id &&
                    editingName.subtaskId === undefined ? (
                      <input
                        autoFocus
                        value={editingName.value}
                        onChange={(e) => {
                          const nextValue = e.currentTarget.value;
                          setEditingName((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  value: nextValue,
                                }
                              : prev
                          );
                        }}
                        onBlur={commitNameEdit}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            commitNameEdit();
                          } else if (e.key === "Escape") {
                            cancelNameEdit();
                          }
                        }}
                        style={{
                          width: leftPanelWidth - 148,
                          border: `1px solid ${C.ruleLight}`,
                          borderRadius: 6,
                          padding: "4px 8px",
                          fontWeight: 500,
                          fontSize: 16,
                          color: C.charcoal,
                          background: C.editorBg,
                          outline: "none",
                        }}
                      />
                    ) : (
                      <span
                        style={{
                          fontWeight: 500,
                          fontSize: 16,
                          color: C.charcoal,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          maxWidth: leftPanelWidth - 148,
                        }}
                      >
                        {task.name}
                      </span>
                    )}
                    <div
                      style={{
                        marginLeft: "auto",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <div style={{ position: "relative" }}>
                        <button
                          data-task-color-trigger
                          onClick={() =>
                            setOpenColorTaskId((prev) =>
                              prev === task.id ? null : task.id
                            )
                          }
                          style={{
                            flexShrink: 0,
                            width: 22,
                            height: 22,
                            borderRadius: 999,
                            border: `1px solid ${C.ruleLight}`,
                            cursor: "pointer",
                            position: "relative",
                            overflow: "hidden",
                            background:
                              openColorTaskId === task.id
                                ? "rgba(9,30,66,0.08)"
                                : task.color || C.terracotta,
                            boxShadow:
                              openColorTaskId === task.id
                                ? "none"
                                : "inset 0 0 0 1px rgba(255,255,255,0.45)",
                            opacity: 0.9,
                            padding: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                          title="Task color"
                        >
                          {openColorTaskId === task.id && (
                            <Pipette size={12} color={C.charcoal} />
                          )}
                        </button>
                        {openColorTaskId === task.id && (
                          <div
                            data-task-color-menu
                            style={{
                              position: "absolute",
                              top: 28,
                              right: 0,
                              zIndex: 45,
                              background: C.cream,
                              border: `1px solid ${C.ruleLight}`,
                              borderRadius: 10,
                              padding: 8,
                              boxShadow:
                                "0 8px 18px rgba(9,30,66,0.12), 0 1px 2px rgba(9,30,66,0.08)",
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            {TASK_PRESET_COLORS.map((color) => {
                              const isActive =
                                (task.color || C.terracotta).toLowerCase() ===
                                color.toLowerCase();
                              return (
                                <button
                                  key={color}
                                  onClick={() => {
                                    handleTaskColorChange(task.id, color);
                                    setOpenColorTaskId(null);
                                  }}
                                  style={{
                                    flexShrink: 0,
                                    width: 16,
                                    height: 16,
                                    borderRadius: 999,
                                    border: isActive
                                      ? "1px solid rgba(9,30,66,0.35)"
                                      : `1px solid ${C.ruleLight}`,
                                    background: color,
                                    cursor: "pointer",
                                    padding: 0,
                                    boxShadow: isActive
                                      ? "0 0 0 1px rgba(255,255,255,0.8) inset"
                                      : "none",
                                  }}
                                  title={`Set task color ${color}`}
                                />
                              );
                            })}
                            <label
                              style={{
                                width: 18,
                                height: 18,
                                borderRadius: 999,
                                border: `1px solid ${C.ruleLight}`,
                                cursor: "pointer",
                                position: "relative",
                                overflow: "hidden",
                                background: task.color || C.terracotta,
                                boxShadow:
                                  "inset 0 0 0 1px rgba(255,255,255,0.45)",
                                flexShrink: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                              title="Custom color"
                            >
                              <Pipette
                                size={10}
                                color={
                                  themeMode === "dark" ? C.charcoal : C.ivory
                                }
                                style={{
                                  filter:
                                    "drop-shadow(0 0 1px rgba(0,0,0,0.35))",
                                }}
                              />
                              <input
                                type="color"
                                value={task.color || C.terracotta}
                                onChange={(e) =>
                                  handleTaskColorChange(
                                    task.id,
                                    e.currentTarget.value
                                  )
                                }
                                style={{
                                  position: "absolute",
                                  inset: 0,
                                  opacity: 0,
                                  cursor: "pointer",
                                }}
                              />
                            </label>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => addSubtask(task.id)}
                        style={{
                          flexShrink: 0,
                          width: 22,
                          height: 22,
                          borderRadius: 999,
                          border: `1px solid ${C.ruleLight}`,
                          background: "transparent",
                          color: C.terracotta,
                          fontSize: 15,
                          lineHeight: "20px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "all 0.15s ease",
                          opacity: 0.4,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.opacity = "1";
                          e.currentTarget.style.background =
                            "rgba(0,82,204,0.08)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = "0.4";
                          e.currentTarget.style.background = "transparent";
                        }}
                        title="Add subtask"
                      >
                        <Plus size={14} />
                      </button>
                      <button
                        onClick={() => deleteTask(task.id)}
                        style={{
                          flexShrink: 0,
                          width: 22,
                          height: 22,
                          borderRadius: 999,
                          border: `1px solid ${C.ruleLight}`,
                          background: "transparent",
                          color: C.charcoal,
                          fontSize: 14,
                          lineHeight: "20px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "all 0.15s ease",
                          opacity: 0.35,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.opacity = "1";
                          e.currentTarget.style.background =
                            "rgba(9,30,66,0.08)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = "0.35";
                          e.currentTarget.style.background = "transparent";
                        }}
                        title="Remove task"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  {/* Subtask names */}
                  {task.subtasks.map((sub) => {
                    const isSubtaskDragged =
                      isDragging &&
                      dragTaskId === task.id &&
                      dragSubtaskId === sub.id;
                    return (
                      <div
                        key={sub.id}
                        className="earth-row earth-subrow"
                        onPointerDown={(e) =>
                          handleLeftRowPointerDown(e, task.id, sub.id)
                        }
                        onClick={(e) =>
                          handleRowClick(e, task.id, sub.name, sub.id)
                        }
                        style={{
                          height: SUBTASK_ROW_HEIGHT,
                          display: "flex",
                          alignItems: "center",
                          paddingLeft: 40,
                          paddingRight: 20,
                          borderBottom: `1px solid ${C.ruleLight}`,
                          cursor: isDragging ? "grabbing" : "grab",
                          background: isSubtaskDragged
                            ? "rgba(0,82,204,0.08)"
                            : undefined,
                          boxShadow: isSubtaskDragged
                            ? "inset 0 0 0 1px rgba(0,82,204,0.2)"
                            : undefined,
                          transition:
                            "background-color 0.1s ease, box-shadow 0.1s ease",
                        }}
                      >
                        {editingName?.taskId === task.id &&
                        editingName.subtaskId === sub.id ? (
                          <input
                            autoFocus
                            value={editingName.value}
                            onChange={(e) => {
                              const nextValue = e.currentTarget.value;
                              setEditingName((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      value: nextValue,
                                    }
                                  : prev
                              );
                            }}
                            onBlur={commitNameEdit}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                commitNameEdit();
                              } else if (e.key === "Escape") {
                                cancelNameEdit();
                              }
                            }}
                            style={{
                              width: leftPanelWidth - 112,
                              border: `1px solid ${C.ruleLight}`,
                              borderRadius: 6,
                              padding: "3px 8px",
                              fontSize: 14,
                              color: C.charcoal,
                              background: C.editorBg,
                              outline: "none",
                            }}
                          />
                        ) : (
                          <span
                            style={{
                              fontSize: 14,
                              color: C.charcoal,
                              opacity: 0.55,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              maxWidth: leftPanelWidth - 112,
                            }}
                          >
                            {sub.name}
                          </span>
                        )}
                        <div
                          style={{
                            marginLeft: "auto",
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <button
                            onClick={() =>
                              deleteSubtask({
                                taskId: task.id,
                                subtaskId: sub.id,
                              })
                            }
                            style={{
                              flexShrink: 0,
                              width: 20,
                              height: 20,
                              borderRadius: 999,
                              border: `1px solid ${C.ruleLight}`,
                              background: "transparent",
                              color: C.charcoal,
                              fontSize: 13,
                              lineHeight: "18px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              transition: "all 0.15s ease",
                              opacity: 0.28,
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.opacity = "0.95";
                              e.currentTarget.style.background =
                                "rgba(9,30,66,0.08)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.opacity = "0.28";
                              e.currentTarget.style.background = "transparent";
                            }}
                            title="Remove subtask"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
            {dropIndicatorY !== null && (
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: dropIndicatorY,
                  width: "100%",
                  height: 3,
                  background: C.terracotta,
                  boxShadow: "0 0 10px rgba(0,82,204,0.35)",
                  zIndex: 30,
                  pointerEvents: "none",
                  borderRadius: 2,
                  transition: "top 0.1s ease",
                }}
              />
            )}
          </div>
        </div>

        {/* Right chart area */}
        <div
          ref={rightRef}
          onScroll={() => syncScroll("right")}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          style={{
            flex: 1,
            overflow: "auto",
            position: "relative",
            cursor: isDragging || draggingMarkerId ? "grabbing" : "default",
          }}
        >
          <div
            onDoubleClick={handleChartDoubleClick}
            style={{
              width: totalWidth,
              height: chartCanvasHeight,
              position: "relative",
            }}
          >
            {/* Vertical separators */}
            {weekendColumns.map((col, i) => (
              <div
                key={`weekend-${i}`}
                style={{
                  position: "absolute",
                  left: col.x,
                  top: 0,
                  width: col.width,
                  height: chartCanvasHeight,
                  background:
                    themeMode === "dark"
                      ? "rgba(230,237,243,0.035)"
                      : "rgba(9,30,66,0.055)",
                  pointerEvents: "none",
                }}
              />
            ))}

            {/* Vertical separators */}
            {gridColumns.map((col, i) => (
              <div
                key={`dc${i}`}
                style={{
                  position: "absolute",
                  left: col.x,
                  top: 0,
                  width: 1,
                  height: chartCanvasHeight,
                  background: col.isWeekStart ? C.ruleLight : C.ruleVert,
                }}
              />
            ))}

            {/* Horizontal ruled lines per row */}
            {displayTasks.map((task, ti) => {
              const y = rowOffsets[ti];
              const lines = [];
              lines.push(
                <div
                  key={`rl-${task.id}`}
                  style={{
                    position: "absolute",
                    left: 0,
                    top: CHART_TOP_GAP + y + TASK_ROW_HEIGHT - 1,
                    width: totalWidth,
                    height: 1,
                    background: C.ruleLight,
                  }}
                />
              );
              task.subtasks.forEach((sub, si) => {
                lines.push(
                  <div
                    key={`rl-${sub.id}`}
                    style={{
                      position: "absolute",
                      left: 0,
                      top:
                        CHART_TOP_GAP +
                        y +
                        TASK_ROW_HEIGHT +
                        (si + 1) * SUBTASK_ROW_HEIGHT -
                        1,
                      width: totalWidth,
                      height: 1,
                      background: C.ruleLight,
                    }}
                  />
                );
              });
              return lines;
            })}

            {/* Connector SVG layer */}
            <svg
              style={{
                position: "absolute",
                inset: 0,
                width: totalWidth,
                height: chartCanvasHeight,
                pointerEvents: "none",
                zIndex: 5,
              }}
            >
              {displayTasks.map((task, ti) => {
                const y = rowOffsets[ti];
                const parentBar = barStyle(task.startDate, task.endDate);
                return task.subtasks.map((sub, si) => {
                  const childBar = barStyle(sub.startDate, sub.endDate);
                  return (
                    <WavyConnector
                      key={`conn-${sub.id}`}
                      parentLeft={parentBar.left}
                      parentWidth={parentBar.width}
                      childLeft={childBar.left}
                      childWidth={childBar.width}
                      parentBottom={CHART_TOP_GAP + y + TASK_ROW_HEIGHT - 6}
                      childTop={
                        CHART_TOP_GAP +
                        y +
                        TASK_ROW_HEIGHT +
                        si * SUBTASK_ROW_HEIGHT +
                        SUBTASK_ROW_HEIGHT / 2
                      }
                      strokeColor={C.charcoal}
                    />
                  );
                });
              })}
            </svg>

            {/* Markers */}
            {timelineMarkers.map((marker) => {
              const isTodayMarker = marker.id === TODAY_MARKER_ID;
              const rawX =
                draggingMarkerId === marker.id && draggingMarkerX !== null
                  ? draggingMarkerX
                  : dateToX(marker.date);
              const x = Math.max(MARKER_MIN_VISIBLE_X, rawX);
              return (
                <div
                  key={marker.id}
                  data-marker-id={marker.id}
                  onPointerDown={(e) => handleMarkerPointerDown(e, marker)}
                  onDoubleClick={(e) => handleMarkerDoubleClick(e, marker)}
                  style={{
                    position: "absolute",
                    left: x,
                    top: 0,
                    height: chartCanvasHeight,
                    zIndex: 60,
                    cursor: isTodayMarker
                      ? "default"
                      : draggingMarkerId === marker.id
                        ? "grabbing"
                        : "grab",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      width: 0,
                      height: chartCanvasHeight,
                      borderLeft: isTodayMarker
                        ? `2px solid ${marker.color || C.terracotta}`
                        : `2px dashed ${marker.color || C.terracotta}`,
                      opacity: isTodayMarker ? 0.8 : 0.5,
                    }}
                  />
                  <FlagPennant x={0} color={marker.color || C.terracotta} />
                  <div
                    style={{
                      position: "absolute",
                      left: 10,
                      top: 4,
                      fontSize: 10,
                      fontWeight: 600,
                      color: marker.color || C.terracotta,
                      whiteSpace: "nowrap",
                      letterSpacing: "0.02em",
                    }}
                  >
                    {editingMarker?.markerId === marker.id ? (
                      <input
                        autoFocus
                        value={editingMarker.value}
                        onChange={(e) => {
                          const nextValue = e.currentTarget.value;
                          setEditingMarker((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  value: nextValue,
                                }
                              : prev
                          );
                        }}
                        onBlur={commitMarkerEdit}
                        onPointerDown={(e) => e.stopPropagation()}
                        onDoubleClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            commitMarkerEdit();
                          } else if (e.key === "Escape") {
                            cancelMarkerEdit();
                          }
                        }}
                        style={{
                          border: `1px solid ${marker.color || C.terracotta}`,
                          borderRadius: 4,
                          padding: "2px 6px",
                          fontSize: 10,
                          fontWeight: 600,
                          color: marker.color || C.terracotta,
                          background: C.editorBg,
                          outline: "none",
                          minWidth: 84,
                        }}
                      />
                    ) : (
                      marker.label
                    )}
                  </div>
                  {!isTodayMarker && (
                    <button
                      data-marker-actions-trigger
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setOpenMarkerMenuId((prev) =>
                          prev === marker.id ? null : marker.id
                        );
                      }}
                      style={{
                        position: "absolute",
                        left: 10,
                        top: 18,
                        zIndex: 0,
                        width: 18,
                        height: 18,
                        borderRadius: 999,
                        border: `1px solid ${C.ruleLight}`,
                        background: C.editorBg,
                        color: marker.color || C.terracotta,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        opacity: openMarkerMenuId === marker.id ? 1 : 0.7,
                      }}
                      title="Marker options"
                      aria-label="Marker options"
                    >
                      <Pipette size={11} />
                    </button>
                  )}
                  {!isTodayMarker && openMarkerMenuId === marker.id && (
                    <div
                      data-marker-actions-menu
                      onPointerDown={(e) => e.stopPropagation()}
                      style={{
                        position: "absolute",
                        left: 32,
                        top: 16,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: 8,
                        borderRadius: 10,
                        border: `1px solid ${C.ruleLight}`,
                        background: C.cream,
                        boxShadow:
                          "0 8px 18px rgba(9,30,66,0.12), 0 1px 2px rgba(9,30,66,0.08)",
                      }}
                    >
                      {TASK_PRESET_COLORS.map((color) => {
                        const isActive =
                          (marker.color || C.terracotta).toLowerCase() ===
                          color.toLowerCase();
                        return (
                          <button
                            key={`${marker.id}-${color}`}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleMarkerColorChange(marker.id, color);
                              setOpenMarkerMenuId(null);
                            }}
                            style={{
                              flexShrink: 0,
                              width: 16,
                              height: 16,
                              borderRadius: 999,
                              border: isActive
                                ? "1px solid rgba(9,30,66,0.35)"
                                : `1px solid ${C.ruleLight}`,
                              background: color,
                              cursor: "pointer",
                              padding: 0,
                              boxShadow: isActive
                                ? "0 0 0 1px rgba(255,255,255,0.8) inset"
                                : "none",
                            }}
                            title={`Set marker color ${color}`}
                            aria-label={`Set marker color ${color}`}
                          />
                        );
                      })}
                      <label
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 999,
                          border: `1px solid ${C.ruleLight}`,
                          cursor: "pointer",
                          position: "relative",
                          overflow: "hidden",
                          background: marker.color || C.terracotta,
                          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.45)",
                          flexShrink: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        title="Custom color"
                      >
                        <Pipette
                          size={10}
                          color={themeMode === "dark" ? C.charcoal : C.ivory}
                          style={{
                            filter: "drop-shadow(0 0 1px rgba(0,0,0,0.35))",
                          }}
                        />
                        <input
                          type="color"
                          value={marker.color || C.terracotta}
                          onChange={(e) =>
                            handleMarkerColorChange(
                              marker.id,
                              e.currentTarget.value
                            )
                          }
                          style={{
                            position: "absolute",
                            inset: 0,
                            opacity: 0,
                            cursor: "pointer",
                          }}
                        />
                      </label>
                      <div
                        style={{
                          width: 1,
                          height: 16,
                          background: C.ruleLight,
                          marginInline: 2,
                        }}
                      />
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleRemoveMarker(marker.id);
                        }}
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 999,
                          border: `1px solid ${C.ruleLight}`,
                          background: "transparent",
                          color: C.charcoal,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                        }}
                        title="Delete marker"
                        aria-label="Delete marker"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Task bars */}
            {displayTasks.map((task, ti) => {
              const y = rowOffsets[ti];
              const bs = barStyle(task.startDate, task.endDate);
              const barH = 30;
              const barTop = y + (TASK_ROW_HEIGHT - barH) / 2;
              const isTaskDragged =
                isDragging && dragTaskId === task.id && !dragSubtaskId;

              return (
                <div key={task.id}>
                  {/* Parent bar */}
                  <div
                    className="earth-bar"
                    onPointerDown={(e) => startDrag(e, task.id)}
                    onPointerMove={(e) => {
                      if (!isDragging) {
                        const el = e.currentTarget as HTMLElement;
                        el.style.cursor = getCursor(e, el);
                      }
                    }}
                    style={{
                      position: "absolute",
                      left: bs.left,
                      top: CHART_TOP_GAP + barTop,
                      width: bs.width,
                      height: barH,
                      borderRadius: 999,
                      background: task.color || C.terracotta,
                      boxShadow: C.barShadow,
                      zIndex: isTaskDragged ? 16 : 10,
                      overflow: "hidden",
                      display: "flex",
                      alignItems: "center",
                      opacity: isTaskDragged ? 0.75 : 1,
                      transform: isTaskDragged ? "scale(1.02)" : undefined,
                      outline: isTaskDragged
                        ? "2px solid rgba(0,82,204,0.4)"
                        : undefined,
                    }}
                  >
                    {/* Paper texture overlay */}
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        filter: "url(#earth-paper-tex)",
                        opacity: 0.08,
                        borderRadius: 999,
                        pointerEvents: "none",
                      }}
                    />
                    {/* Progress fill */}
                    {task.progress > 0 && (
                      <div
                        style={{
                          position: "absolute",
                          left: 0,
                          top: 0,
                          height: "100%",
                          width: `${Math.min(task.progress, 100)}%`,
                          borderRadius: 999,
                          background: darkenHex(
                            task.color || C.terracotta,
                            0.12
                          ),
                          opacity: 0.4,
                          pointerEvents: "none",
                        }}
                      />
                    )}
                    {/* Label */}
                    <span
                      style={{
                        position: "relative",
                        zIndex: 2,
                        paddingLeft: 14,
                        paddingRight: 14,
                        fontSize: 16,
                        fontWeight: 600,
                        color: "#fff",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        textShadow: "0 1px 3px rgba(0,0,0,0.2)",
                        letterSpacing: "0.01em",
                      }}
                    >
                      {task.name}
                    </span>
                  </div>

                  {/* Subtask bars */}
                  {task.subtasks.map((sub, si) => {
                    const sbs = barStyle(sub.startDate, sub.endDate);
                    const subBarH = 22;
                    const subY =
                      y +
                      TASK_ROW_HEIGHT +
                      si * SUBTASK_ROW_HEIGHT +
                      (SUBTASK_ROW_HEIGHT - subBarH) / 2;
                    const isSubtaskDragged =
                      isDragging &&
                      dragTaskId === task.id &&
                      dragSubtaskId === sub.id;

                    return (
                      <div
                        key={sub.id}
                        className="earth-subtask-bar"
                        onPointerDown={(e) => startDrag(e, task.id, sub.id)}
                        onPointerMove={(e) => {
                          if (!isDragging) {
                            const el = e.currentTarget as HTMLElement;
                            el.style.cursor = getCursor(e, el);
                          }
                        }}
                        style={{
                          position: "absolute",
                          left: sbs.left,
                          top: CHART_TOP_GAP + subY,
                          width: sbs.width,
                          height: subBarH,
                          borderRadius: 999,
                          background: task.color || sub.color || C.sage,
                          boxShadow: "0 1px 5px rgba(45,42,38,0.1)",
                          zIndex: isSubtaskDragged ? 16 : 10,
                          overflow: "hidden",
                          display: "flex",
                          alignItems: "center",
                          opacity: isSubtaskDragged ? 0.75 : 1,
                          transform: isSubtaskDragged
                            ? "scale(1.03)"
                            : undefined,
                          outline: isSubtaskDragged
                            ? "2px solid rgba(0,82,204,0.35)"
                            : undefined,
                        }}
                      >
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            filter: "url(#earth-paper-tex)",
                            opacity: 0.06,
                            borderRadius: 999,
                            pointerEvents: "none",
                          }}
                        />
                        <span
                          style={{
                            position: "relative",
                            zIndex: 2,
                            paddingLeft: 10,
                            paddingRight: 10,
                            fontSize: 14,
                            fontWeight: 500,
                            color: "#fff",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            textShadow: "0 1px 2px rgba(0,0,0,0.15)",
                          }}
                        >
                          {sub.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
            {dropIndicatorY !== null && (
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: dropIndicatorY,
                  width: "100%",
                  height: 3,
                  background: C.terracotta,
                  boxShadow: `0 0 10px rgba(0,82,204,0.35)`,
                  zIndex: 30,
                  pointerEvents: "none",
                  borderRadius: 2,
                  transition: "top 0.1s ease",
                }}
              />
            )}
          </div>
        </div>
      </div>

      <AlertDialog
        open={Boolean(tabPendingDelete)}
        onOpenChange={(open) => {
          if (!open) setTabPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete timeline tab?</AlertDialogTitle>
            <AlertDialogDescription>
              {tabPendingDelete
                ? `This will permanently remove ${tabPendingDelete.title} and its tasks, markers, and history.`
                : "This will permanently remove this timeline tab."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmTabDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
