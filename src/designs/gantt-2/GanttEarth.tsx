import { useRef, useCallback, useMemo, useState, useEffect } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { ChevronDown, Pipette, Plus, Trash2 } from "lucide-react";
import { tasksAtom, markersAtom } from "../../core/store";
import {
  addNewTaskAtom,
  addNewSubtaskAtom,
  deleteTaskAtom,
  deleteSubtaskAtom,
  updateTaskAtom,
  updateSubtaskAtom,
} from "../../core/actions";
import { useTimeline } from "../../core/useTimeline";
import { useGanttDrag } from "../../core/useGanttDrag";
import { useKeyboardShortcuts } from "../../core/useKeyboardShortcuts";
import { GanttToolbar } from "../../core/GanttToolbar";
import type { Task } from "../../core/types";

const TASK_ROW_H = 56;
const SUBTASK_ROW_H = 36;
const LEFT_PANEL_DEFAULT_W = 240;
const LEFT_PANEL_MIN_W = 200;
const LEFT_PANEL_MAX_W = 420;
const QUICK_DOUBLE_CLICK_MS = 220;
const HEADER_H = 72;
const TASK_PRESET_COLORS = [
  "#0052CC",
  "#36B37E",
  "#FFAB00",
  "#FF5630",
  "#6554C0",
];

const C = {
  cream: "#F4F5F7",
  terracotta: "#0052CC",
  sage: "#4C9AFF",
  charcoal: "#172B4D",
  ivory: "#FFFFFF",
  ruleLight: "rgba(9,30,66,0.08)",
  ruleVert: "rgba(9,30,66,0.04)",
  barShadow: "0 1px 2px rgba(9,30,66,0.12), 0 0 1px rgba(9,30,66,0.2)",
};

function rowHeight(task: Task) {
  return TASK_ROW_H + task.subtasks.length * SUBTASK_ROW_H;
}

function totalHeight(tasks: Task[]) {
  return tasks.reduce((h, t) => h + rowHeight(t), 0);
}

function darkenHex(hex: string, amount = 0.18): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, ((n >> 16) & 0xff) - Math.round(255 * amount));
  const g = Math.max(0, ((n >> 8) & 0xff) - Math.round(255 * amount));
  const b = Math.max(0, (n & 0xff) - Math.round(255 * amount));
  return `rgb(${r},${g},${b})`;
}

const GrainFilter = () => (
  <svg style={{ position: "absolute", width: 0, height: 0 }} aria-hidden="true">
    <defs>
      <filter id="earth-grain">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.65"
          numOctaves="3"
          stitchTiles="stitch"
        />
        <feColorMatrix type="saturate" values="0" />
        <feBlend in="SourceGraphic" mode="multiply" />
      </filter>
      <filter id="earth-paper-tex">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="1.2"
          numOctaves="2"
          stitchTiles="stitch"
        />
        <feColorMatrix type="saturate" values="0" />
        <feBlend in="SourceGraphic" mode="soft-light" />
      </filter>
    </defs>
  </svg>
);

const GrainOverlay = () => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      filter: "url(#earth-grain)",
      opacity: 0.045,
      pointerEvents: "none",
      zIndex: 50,
    }}
  />
);

function WavyConnector({
  parentLeft,
  parentWidth,
  childLeft,
  childWidth,
  parentBottom,
  childTop,
}: {
  parentLeft: number;
  parentWidth: number;
  childLeft: number;
  childWidth: number;
  parentBottom: number;
  childTop: number;
}) {
  const x1 = parentLeft + 15;
  const y1 = parentBottom;
  const x2 = childLeft + 8;
  const y2 = childTop;
  const midY = (y1 + y2) / 2;
  const waveAmp = 4;
  return (
    <path
      d={`M${x1},${y1} C${x1 + waveAmp},${midY - 3} ${x2 - waveAmp},${midY + 3} ${x2},${y2}`}
      fill="none"
      stroke={C.charcoal}
      strokeWidth={1.5}
      strokeDasharray="4 3"
      opacity={0.3}
    />
  );
}

function FlagPennant({ x, color }: { x: number; color: string }) {
  return (
    <svg
      width="14"
      height="16"
      viewBox="0 0 14 16"
      style={{
        position: "absolute",
        left: x - 7,
        top: 2,
        pointerEvents: "none",
      }}
    >
      <polygon points="2,0 14,5 2,10" fill={color} opacity={0.85} />
      <line x1="2" y1="0" x2="2" y2="16" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

const globalStyles = `
.earth-bar {
  transition: transform 0.18s cubic-bezier(.4,0,.2,1), box-shadow 0.18s ease;
}
.earth-bar:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 14px rgba(9,30,66,0.2) !important;
}
.earth-subtask-bar {
  transition: transform 0.18s cubic-bezier(.4,0,.2,1), box-shadow 0.18s ease;
}
.earth-subtask-bar:hover {
  transform: scale(1.03);
  box-shadow: 0 3px 10px rgba(9,30,66,0.15) !important;
}
.earth-row {
  transition: background-color 0.15s ease;
}
.earth-row:hover {
  background-color: rgba(0,82,204,0.04);
}
.earth-toolbar-btn {
  background: rgba(9,30,66,0.06);
  border: 1px solid rgba(9,30,66,0.1);
  color: #172B4D;
  transition: all 0.15s ease;
}
.earth-toolbar-btn:hover {
  background: rgba(0,82,204,0.1);
  border-color: rgba(0,82,204,0.25);
}
.earth-toolbar-btn:disabled {
  opacity: 0.35;
}
.earth-title {
  color: #0052CC;
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

export default function GanttEarth() {
  const tasks = useAtomValue(tasksAtom);
  const markers = useAtomValue(markersAtom);
  const {
    pxPerDay,
    totalWidth,
    viewMode,
    gridColumns,
    topHeaders,
    bottomHeaders,
    barStyle,
    dateToX,
    setViewMode,
  } = useTimeline();
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const headerRightRef = useRef<HTMLDivElement>(null);
  const taskClickTimerRef = useRef<number | null>(null);
  const lastRowClickRef = useRef<{ key: string; at: number } | null>(null);
  const resizeStartRef = useRef<{ startX: number; startWidth: number } | null>(
    null,
  );
  const prevCursorRef = useRef<string | null>(null);
  const prevUserSelectRef = useRef<string | null>(null);
  const [leftPanelWidth, setLeftPanelWidth] = useState(LEFT_PANEL_DEFAULT_W);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [collapsedTaskIds, setCollapsedTaskIds] = useState<Set<string>>(
    () => new Set(),
  );
  const displayTasks = useMemo(
    () =>
      tasks.map((task) =>
        collapsedTaskIds.has(task.id) ? { ...task, subtasks: [] } : task,
      ),
    [tasks, collapsedTaskIds],
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
    { taskRowH: TASK_ROW_H, subtaskRowH: SUBTASK_ROW_H },
    rightRef,
    displayTasks,
  );
  const addTask = useSetAtom(addNewTaskAtom);
  const addSubtask = useSetAtom(addNewSubtaskAtom);
  const deleteTask = useSetAtom(deleteTaskAtom);
  const deleteSubtask = useSetAtom(deleteSubtaskAtom);
  const updateTask = useSetAtom(updateTaskAtom);
  const updateSubtask = useSetAtom(updateSubtaskAtom);
  useKeyboardShortcuts();

  const [editingName, setEditingName] = useState<{
    taskId: string;
    subtaskId?: string;
    value: string;
  } | null>(null);
  const [openColorTaskId, setOpenColorTaskId] = useState<string | null>(null);

  const startNameEdit = useCallback((taskId: string, currentName: string, subtaskId?: string) => {
    setEditingName({ taskId, subtaskId, value: currentName });
  }, []);

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
    [tasks, updateTask],
  );

  const handleLeftRowPointerDown = useCallback(
    (e: React.PointerEvent, taskId: string, subtaskId?: string) => {
      const target = e.target as HTMLElement;
      if (target.closest("button") || target.closest("input")) return;
      if (editingName) return;
      startDrag(e, taskId, subtaskId, "move");
    },
    [editingName, startDrag],
  );

  const handleRowClick = useCallback(
    (e: React.MouseEvent, taskId: string, currentName: string, subtaskId?: string) => {
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
    [editingName, isDragging, startNameEdit, toggleTaskCollapsed],
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
      resizeStartRef.current = { startX: e.clientX, startWidth: leftPanelWidth };
      setIsResizingSidebar(true);
      prevCursorRef.current = document.body.style.cursor;
      prevUserSelectRef.current = document.body.style.userSelect;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [leftPanelWidth],
  );

  useEffect(() => {
    if (!isResizingSidebar) return;

    const onPointerMove = (e: PointerEvent) => {
      if (!resizeStartRef.current) return;
      const delta = e.clientX - resizeStartRef.current.startX;
      const next = Math.min(
        LEFT_PANEL_MAX_W,
        Math.max(
          LEFT_PANEL_MIN_W,
          resizeStartRef.current.startWidth + delta,
        ),
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
    if (!openColorTaskId) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.closest("[data-task-color-menu]") ||
        target.closest("[data-task-color-trigger]")
      ) {
        return;
      }
      setOpenColorTaskId(null);
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [openColorTaskId]);

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

  const chartHeight = totalHeight(displayTasks);

  const rowOffsets = useMemo(() => {
    const offsets: number[] = [];
    let y = 0;
    for (const t of displayTasks) {
      offsets.push(y);
      y += rowHeight(t);
    }
    return offsets;
  }, [displayTasks]);

  return (
    <div
      style={{
        background: C.cream,
        color: C.charcoal,
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <style>{globalStyles}</style>
      <GrainFilter />
      <GrainOverlay />

      {/* Toolbar */}
      <div
        style={{
          padding: "12px 20px",
          borderBottom: `1px solid ${C.ruleLight}`,
          background: "rgba(244,245,247,0.92)",
          backdropFilter: "blur(8px)",
          zIndex: 30,
          position: "relative",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <GanttToolbar
            className="flex-wrap gap-2"
            buttonClass="earth-toolbar-btn"
            title="C&C Gantt"
            titleClass="text-xl tracking-tight earth-title"
            accentColor="#0052CC"
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: 3,
              borderRadius: 999,
              border: `1px solid ${C.ruleLight}`,
              background: "rgba(255,255,255,0.9)",
              flexShrink: 0,
            }}
          >
            {(["week", "month", "year"] as const).map((mode) => {
              const active = viewMode === mode;
              return (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  style={{
                    border: "none",
                    borderRadius: 999,
                    padding: "3px 8px",
                    fontSize: 10,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    cursor: "pointer",
                    color: active ? C.ivory : C.charcoal,
                    background: active ? C.terracotta : "transparent",
                    opacity: active ? 1 : 0.65,
                    transition: "all 0.15s ease",
                  }}
                  title={`View by ${mode}`}
                >
                  {mode}
                </button>
              );
            })}
          </div>
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
            height: HEADER_H,
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
            height: HEADER_H,
            background: C.cream,
          }}
        >
          <div
            style={{
              width: totalWidth,
              height: HEADER_H,
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
                  height: HEADER_H / 2,
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
                  top: HEADER_H / 2,
                  width: w.width,
                  height: HEADER_H / 2,
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
          <div style={{ height: chartHeight, position: "relative" }}>
            {displayTasks.map((task, ti) => {
              const y = rowOffsets[ti];
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
                      height: TASK_ROW_H,
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
                      transition: "background-color 0.1s ease, box-shadow 0.1s ease",
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
                          transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
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
                              : prev,
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
                          background: "rgba(255,255,255,0.9)",
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
                              prev === task.id ? null : task.id,
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
                              background: C.ivory,
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
                                color={C.ivory}
                                style={{ filter: "drop-shadow(0 0 1px rgba(0,0,0,0.35))" }}
                              />
                              <input
                                type="color"
                                value={task.color || C.terracotta}
                                onChange={(e) =>
                                  handleTaskColorChange(
                                    task.id,
                                    e.currentTarget.value,
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
                      isDragging && dragTaskId === task.id && dragSubtaskId === sub.id;
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
                        height: SUBTASK_ROW_H,
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
                                : prev,
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
                            background: "rgba(255,255,255,0.9)",
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
                            deleteSubtask({ taskId: task.id, subtaskId: sub.id })
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
                  )})}
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
            cursor: isDragging ? "grabbing" : "default",
          }}
        >
          <div
            style={{
              width: totalWidth,
              height: chartHeight,
              position: "relative",
            }}
          >
            {/* Vertical separators */}
            {gridColumns.map((col, i) => (
              <div
                key={`dc${i}`}
                style={{
                  position: "absolute",
                  left: col.x,
                  top: 0,
                  width: 1,
                  height: chartHeight,
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
                    top: y + TASK_ROW_H - 1,
                    width: totalWidth,
                    height: 1,
                    background: C.ruleLight,
                  }}
                />,
              );
              task.subtasks.forEach((sub, si) => {
                lines.push(
                  <div
                    key={`rl-${sub.id}`}
                    style={{
                      position: "absolute",
                      left: 0,
                      top: y + TASK_ROW_H + (si + 1) * SUBTASK_ROW_H - 1,
                      width: totalWidth,
                      height: 1,
                      background: C.ruleLight,
                    }}
                  />,
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
                height: chartHeight,
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
                      parentBottom={y + TASK_ROW_H - 6}
                      childTop={
                        y + TASK_ROW_H + si * SUBTASK_ROW_H + SUBTASK_ROW_H / 2
                      }
                    />
                  );
                });
              })}
            </svg>

            {/* Markers */}
            {markers.map((marker) => {
              const x = dateToX(marker.date);
              return (
                <div
                  key={marker.id}
                  style={{
                    position: "absolute",
                    left: x,
                    top: 0,
                    height: chartHeight,
                    zIndex: 8,
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      width: 0,
                      height: chartHeight,
                      borderLeft: `2px dashed ${marker.color || C.terracotta}`,
                      opacity: 0.5,
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
                    {marker.label}
                  </div>
                </div>
              );
            })}

            {/* Task bars */}
            {displayTasks.map((task, ti) => {
              const y = rowOffsets[ti];
              const bs = barStyle(task.startDate, task.endDate);
              const barH = 30;
              const barTop = y + (TASK_ROW_H - barH) / 2;
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
                      top: barTop,
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
                            0.12,
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
                      TASK_ROW_H +
                      si * SUBTASK_ROW_H +
                      (SUBTASK_ROW_H - subBarH) / 2;
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
                          top: subY,
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
                          transform: isSubtaskDragged ? "scale(1.03)" : undefined,
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
    </div>
  );
}
