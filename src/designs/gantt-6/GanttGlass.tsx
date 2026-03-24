import { useRef, useState, useCallback, useMemo } from 'react'
import { useAtomValue, useSetAtom } from 'jotai'
import { tasksAtom, markersAtom } from '../../core/store'
import { addNewTaskAtom, addNewSubtaskAtom } from '../../core/actions'
import { useTimeline } from '../../core/useTimeline'
import { useGanttDrag } from '../../core/useGanttDrag'
import { useKeyboardShortcuts } from '../../core/useKeyboardShortcuts'
import { GanttToolbar } from '../../core/GanttToolbar'
import type { Task } from '../../core/types'

const TASK_ROW_H = 60
const SUBTASK_ROW_H = 38
const HEADER_H = 72
const LEFT_PANEL_W = 240

const FONT_HEADING = "'Sora', sans-serif"
const FONT_BODY = "'Plus Jakarta Sans', sans-serif"

const BLOB_COLORS = ['#7c3aed', '#ec4899', '#06b6d4', '#f97316']

function lighten(hex: string, amount = 0.45): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const lr = Math.round(r + (255 - r) * amount)
  const lg = Math.round(g + (255 - g) * amount)
  const lb = Math.round(b + (255 - b) * amount)
  return `rgb(${lr},${lg},${lb})`
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

function computeRows(tasks: Task[]) {
  const rows: { type: 'task' | 'subtask'; task: Task; taskIndex: number; subtaskIndex?: number; y: number; h: number }[] = []
  let y = 0
  tasks.forEach((task, ti) => {
    rows.push({ type: 'task', task, taskIndex: ti, y, h: TASK_ROW_H })
    y += TASK_ROW_H
    for (let si = 0; si < task.subtasks.length; si++) {
      rows.push({ type: 'subtask', task, taskIndex: ti, subtaskIndex: si, y, h: SUBTASK_ROW_H })
      y += SUBTASK_ROW_H
    }
  })
  return { rows, totalHeight: y }
}

const STYLE_TAG_CONTENT = `
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

@keyframes blob-drift-1 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  25% { transform: translate(80px, -60px) scale(1.1); }
  50% { transform: translate(-40px, 80px) scale(0.95); }
  75% { transform: translate(60px, 40px) scale(1.05); }
}

@keyframes blob-drift-2 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(-100px, 50px) scale(1.08); }
  66% { transform: translate(70px, -80px) scale(0.92); }
}

@keyframes blob-drift-3 {
  0%, 100% { transform: translate(0, 0) scale(1.05); }
  20% { transform: translate(50px, 70px) scale(0.95); }
  50% { transform: translate(-80px, -30px) scale(1.1); }
  80% { transform: translate(30px, -60px) scale(1); }
}

@keyframes blob-drift-4 {
  0%, 100% { transform: translate(0, 0) scale(0.95); }
  30% { transform: translate(-60px, -70px) scale(1.1); }
  60% { transform: translate(90px, 30px) scale(1); }
  90% { transform: translate(-30px, 60px) scale(1.05); }
}

@keyframes blob-drift-5 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  40% { transform: translate(70px, 50px) scale(1.12); }
  70% { transform: translate(-50px, -40px) scale(0.9); }
}

@keyframes breathe {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-2px); }
}

.glass-bar {
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s ease, filter 0.2s ease;
  will-change: transform;
}
.glass-bar:hover {
  transform: scale(1.02) translateY(-1px) !important;
  box-shadow: 0 8px 32px rgba(255,255,255,0.18), 0 0 0 1px rgba(255,255,255,0.3) !important;
  filter: brightness(1.08);
}

.glass-subtask {
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease;
  will-change: transform;
}
.glass-subtask:hover {
  transform: scale(1.03) !important;
  box-shadow: 0 4px 16px rgba(255,255,255,0.15) !important;
}

.candy-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
.candy-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); border-radius: 3px; }
.candy-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 3px; }
.candy-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.35); }
`

const GLASS_PANEL = {
  background: 'rgba(255,255,255,0.15)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(255,255,255,0.25)',
  borderRadius: 16,
} as const

const GLASS_HEADER = {
  background: 'rgba(255,255,255,0.12)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  borderBottom: '1px solid rgba(255,255,255,0.2)',
} as const

export default function GanttGlass() {
  const tasks = useAtomValue(tasksAtom)
  const markers = useAtomValue(markersAtom)
  const timeline = useTimeline()
  const { pxPerDay, totalWidth, barStyle, weekHeaders, monthHeaders, dayColumns, xToDate } = timeline
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const drag = useGanttDrag(pxPerDay, { taskRowH: TASK_ROW_H, subtaskRowH: SUBTASK_ROW_H }, scrollContainerRef)
  const addTask = useSetAtom(addNewTaskAtom)
  const addSubtask = useSetAtom(addNewSubtaskAtom)
  useKeyboardShortcuts()

  const leftPanelRef = useRef<HTMLDivElement>(null)
  const headerScrollRef = useRef<HTMLDivElement>(null)

  const [hoverDate, setHoverDate] = useState<string | null>(null)
  const [hoverX, setHoverX] = useState(0)
  const [hoverY, setHoverY] = useState(0)

  const { rows, totalHeight } = useMemo(() => computeRows(tasks), [tasks])
  const chartHeight = Math.max(totalHeight, 300)

  const handleTimelinePointerMove = useCallback(
    (e: React.PointerEvent) => {
      drag.onPointerMove(e)
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const scrollLeft = (e.currentTarget as HTMLElement).scrollLeft
      const x = e.clientX - rect.left + scrollLeft
      setHoverDate(xToDate(x))
      setHoverX(e.clientX - rect.left)
      setHoverY(e.clientY - rect.top)
    },
    [drag, xToDate],
  )

  const handleTimelinePointerLeave = useCallback(() => {
    setHoverDate(null)
  }, [])

  const syncScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget
    if (leftPanelRef.current) leftPanelRef.current.scrollTop = target.scrollTop
    if (headerScrollRef.current) headerScrollRef.current.scrollLeft = target.scrollLeft
  }, [])

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        fontFamily: FONT_BODY,
        color: 'rgba(255,255,255,0.9)',
      }}
    >
      <style>{STYLE_TAG_CONTENT}</style>

      {/* Animated gradient mesh background */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#1a1035', zIndex: 0 }}>
        <div
          style={{
            position: 'absolute',
            top: '5%',
            left: '10%',
            width: 380,
            height: 380,
            borderRadius: '50%',
            background: BLOB_COLORS[0],
            filter: 'blur(80px)',
            opacity: 0.6,
            animation: 'blob-drift-1 20s ease-in-out infinite alternate',
            willChange: 'transform',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '50%',
            right: '5%',
            width: 350,
            height: 350,
            borderRadius: '50%',
            background: BLOB_COLORS[1],
            filter: 'blur(80px)',
            opacity: 0.55,
            animation: 'blob-drift-2 18s ease-in-out infinite alternate',
            willChange: 'transform',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            left: '30%',
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: BLOB_COLORS[2],
            filter: 'blur(80px)',
            opacity: 0.5,
            animation: 'blob-drift-3 22s ease-in-out infinite alternate',
            willChange: 'transform',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '30%',
            left: '55%',
            width: 320,
            height: 320,
            borderRadius: '50%',
            background: BLOB_COLORS[3],
            filter: 'blur(80px)',
            opacity: 0.5,
            animation: 'blob-drift-4 25s ease-in-out infinite alternate',
            willChange: 'transform',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '60%',
            left: '5%',
            width: 300,
            height: 300,
            borderRadius: '50%',
            background: '#a855f7',
            filter: 'blur(80px)',
            opacity: 0.4,
            animation: 'blob-drift-5 15s ease-in-out infinite alternate',
            willChange: 'transform',
          }}
        />
      </div>

      {/* Main glass container */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          margin: 12,
          ...GLASS_PANEL,
          overflow: 'hidden',
        }}
      >
        {/* Toolbar */}
        <div
          style={{
            ...GLASS_HEADER,
            borderBottom: '1px solid rgba(255,255,255,0.18)',
            borderRadius: 0,
            position: 'relative',
            zIndex: 10,
          }}
        >
          <GanttToolbar
            className="px-5 py-3"
            buttonClass="bg-white/10 text-white/90 border border-white/20 hover:bg-white/20 hover:border-white/35 backdrop-blur-sm"
            title="Candy Glass"
            titleClass="text-base tracking-wide"
            accentColor="#e879f9"
          />
        </div>

        {/* Header: month + week rows */}
        <div
          style={{
            ...GLASS_HEADER,
            borderRadius: 0,
            display: 'flex',
            position: 'relative',
            zIndex: 10,
            flexShrink: 0,
          }}
        >
          {/* Left header spacer */}
          <div
            style={{
              width: LEFT_PANEL_W,
              minWidth: LEFT_PANEL_W,
              borderRight: '1px solid rgba(255,255,255,0.15)',
              display: 'flex',
              alignItems: 'center',
              padding: '0 20px',
            }}
          >
            <span
              style={{
                fontFamily: FONT_HEADING,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.12em',
                color: 'rgba(255,255,255,0.7)',
                textTransform: 'uppercase',
              }}
            >
              Tasks
            </span>
          </div>

          {/* Timeline headers */}
          <div ref={headerScrollRef} style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ width: totalWidth, position: 'relative', height: HEADER_H }}>
              {/* Month row */}
              <div style={{ height: HEADER_H / 2, position: 'relative' }}>
                {monthHeaders.map((m, i) => (
                  <div
                    key={i}
                    style={{
                      position: 'absolute',
                      left: m.x,
                      width: m.width,
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      paddingLeft: 14,
                      fontFamily: FONT_HEADING,
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      color: 'rgba(255,255,255,0.85)',
                      textTransform: 'uppercase',
                      borderLeft: '1px solid rgba(255,255,255,0.1)',
                      borderBottom: '1px solid rgba(255,255,255,0.08)',
                      boxSizing: 'border-box',
                    }}
                  >
                    {m.label}
                  </div>
                ))}
              </div>

              {/* Week row */}
              <div style={{ height: HEADER_H / 2, position: 'relative' }}>
                {weekHeaders.map((w, i) => (
                  <div
                    key={i}
                    style={{
                      position: 'absolute',
                      left: w.x,
                      width: w.width,
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      paddingLeft: 10,
                      fontFamily: FONT_BODY,
                      fontSize: 10,
                      fontWeight: 500,
                      color: 'rgba(255,255,255,0.45)',
                      borderLeft: '1px solid rgba(255,255,255,0.08)',
                      boxSizing: 'border-box',
                    }}
                  >
                    {w.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Main body */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
          {/* Left panel — task names */}
          <div
            ref={leftPanelRef}
            className="candy-scrollbar"
            style={{
              width: LEFT_PANEL_W,
              minWidth: LEFT_PANEL_W,
              borderRight: '1px solid rgba(255,255,255,0.12)',
              overflowY: 'hidden',
              overflowX: 'hidden',
              background: 'rgba(255,255,255,0.05)',
            }}
          >
            <div style={{ height: chartHeight }}>
              {rows.map((row) => {
                if (row.type === 'task') {
                  const color = row.task.color
                  return (
                    <div
                      key={`tl-${row.task.id}`}
                      style={{
                        height: TASK_ROW_H,
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0 20px',
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                        gap: 10,
                      }}
                    >
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: `linear-gradient(135deg, ${color}, ${lighten(color, 0.3)})`,
                          boxShadow: `0 0 8px ${hexToRgba(color, 0.4)}`,
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontFamily: FONT_BODY,
                          fontSize: 13,
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          color: 'rgba(255,255,255,0.9)',
                        }}
                      >
                        {row.task.name}
                      </span>
                      <button
                        onClick={() => addSubtask(row.task.id)}
                        style={{
                          marginLeft: 'auto',
                          flexShrink: 0,
                          width: 22,
                          height: 22,
                          borderRadius: 8,
                          border: '1px solid rgba(255,255,255,0.2)',
                          background: 'rgba(255,255,255,0.08)',
                          color: 'rgba(255,255,255,0.6)',
                          fontSize: 15,
                          lineHeight: '20px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s ease',
                          backdropFilter: 'blur(4px)',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)'; e.currentTarget.style.color = 'rgba(255,255,255,0.95)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
                        title="Add subtask"
                      >
                        +
                      </button>
                    </div>
                  )
                }
                const sub = row.task.subtasks[row.subtaskIndex!]
                return (
                  <div
                    key={`sl-${row.task.id}-${sub.id}`}
                    style={{
                      height: SUBTASK_ROW_H,
                      display: 'flex',
                      alignItems: 'center',
                      paddingLeft: 44,
                      paddingRight: 20,
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: FONT_BODY,
                        fontSize: 11,
                        fontWeight: 500,
                        color: 'rgba(255,255,255,0.5)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {sub.name}
                    </span>
                  </div>
                )
              })}
              <div
                style={{
                  height: TASK_ROW_H,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <button
                  onClick={() => addTask()}
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px dashed rgba(255,255,255,0.2)',
                    borderRadius: 12,
                    color: 'rgba(255,255,255,0.6)',
                    fontFamily: FONT_HEADING,
                    fontSize: 12,
                    fontWeight: 600,
                    padding: '8px 20px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    backdropFilter: 'blur(4px)',
                    letterSpacing: '0.04em',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)'; e.currentTarget.style.color = 'rgba(255,255,255,0.95)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
                >
                  + Add Task
                </button>
              </div>
            </div>
          </div>

          {/* Right panel — timeline */}
          <div
            ref={scrollContainerRef}
            className="candy-scrollbar"
            style={{
              flex: 1,
              overflowX: 'auto',
              overflowY: 'auto',
              position: 'relative',
              cursor: drag.isDragging ? 'grabbing' : 'default',
            }}
            onPointerMove={handleTimelinePointerMove}
            onPointerUp={drag.endDrag}
            onPointerLeave={handleTimelinePointerLeave}
            onScroll={syncScroll}
          >
            <div
              style={{
                width: totalWidth,
                height: chartHeight,
                position: 'relative',
              }}
            >
              {/* Frosted column dividers */}
              {dayColumns.map((col, i) => (
                <div
                  key={`vg-${i}`}
                  style={{
                    position: 'absolute',
                    left: col.x,
                    top: 0,
                    width: 1,
                    height: chartHeight,
                    background: col.isWeekStart
                      ? 'rgba(255,255,255,0.1)'
                      : 'rgba(255,255,255,0.04)',
                  }}
                />
              ))}

              {/* Row separator lines */}
              {rows.map((row, i) => (
                <div
                  key={`hg-${i}`}
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: row.y + row.h - 1,
                    width: '100%',
                    height: 1,
                    background: 'rgba(255,255,255,0.05)',
                  }}
                />
              ))}

              {/* Task bars & subtask bars */}
              {rows.map((row) => {
                if (row.type === 'task') {
                  const task = row.task
                  const color = task.color
                  const lightColor = lighten(color, 0.4)
                  const bs = barStyle(task.startDate, task.endDate)
                  const barH = 36
                  const barY = row.y + (TASK_ROW_H - barH) / 2

                  return (
                    <div
                      key={`tb-${task.id}`}
                      className="glass-bar"
                      style={{
                        position: 'absolute',
                        left: bs.left,
                        top: barY,
                        width: bs.width,
                        height: barH,
                        background: `linear-gradient(135deg, ${hexToRgba(color, 0.5)}, ${hexToRgba(color, 0.25)})`,
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        border: '1px solid rgba(255,255,255,0.3)',
                        borderRadius: 12,
                        cursor: drag.isDragging ? 'grabbing' : 'grab',
                        boxSizing: 'border-box',
                        overflow: 'hidden',
                        zIndex: 2,
                        boxShadow: `0 4px 20px ${hexToRgba(color, 0.25)}, inset 0 1px 0 rgba(255,255,255,0.2)`,
                        animation: `breathe ${3 + (row.taskIndex % 3) * 0.4}s ease-in-out infinite`,
                        animationDelay: `${row.taskIndex * 0.5}s`,
                      }}
                      onPointerDown={(e) => drag.startDrag(e, task.id)}
                    >
                      {/* Progress fill */}
                      <div
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          height: '100%',
                          width: `${task.progress}%`,
                          background: `linear-gradient(90deg, ${hexToRgba(color, 0.35)}, ${hexToRgba(color, 0.15)})`,
                          borderRadius: '12px 0 0 12px',
                          transition: 'width 0.3s ease',
                        }}
                      />
                      {/* Top highlight streak */}
                      <div
                        style={{
                          position: 'absolute',
                          top: 1,
                          left: 12,
                          right: 12,
                          height: 1,
                          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                          borderRadius: 1,
                        }}
                      />
                      {bs.width > 70 && (
                        <span
                          style={{
                            position: 'relative',
                            zIndex: 1,
                            fontFamily: FONT_BODY,
                            fontSize: 11,
                            fontWeight: 600,
                            color: 'rgba(255,255,255,0.95)',
                            padding: '0 14px',
                            lineHeight: `${barH}px`,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: 'block',
                            textShadow: `0 1px 4px ${hexToRgba(color, 0.5)}`,
                          }}
                        >
                          {task.name}
                        </span>
                      )}
                    </div>
                  )
                }

                const sub = row.task.subtasks[row.subtaskIndex!]
                const color = row.task.color
                const bs = barStyle(sub.startDate, sub.endDate)
                const barH = 22
                const barY = row.y + (SUBTASK_ROW_H - barH) / 2

                return (
                  <div
                    key={`sb-${row.task.id}-${sub.id}`}
                    className="glass-subtask"
                    style={{
                      position: 'absolute',
                      left: bs.left,
                      top: barY,
                      width: bs.width,
                      height: barH,
                      background: `linear-gradient(135deg, ${hexToRgba(color, 0.3)}, ${hexToRgba(color, 0.12)})`,
                      backdropFilter: 'blur(6px)',
                      WebkitBackdropFilter: 'blur(6px)',
                      border: '1px solid rgba(255,255,255,0.18)',
                      borderRadius: 11,
                      cursor: drag.isDragging ? 'grabbing' : 'grab',
                      boxSizing: 'border-box',
                      overflow: 'hidden',
                      zIndex: 2,
                      boxShadow: `0 2px 10px ${hexToRgba(color, 0.15)}, inset 0 1px 0 rgba(255,255,255,0.12)`,
                    }}
                    onPointerDown={(e) => drag.startDrag(e, row.task.id, sub.id)}
                  >
                    {bs.width > 55 && (
                      <span
                        style={{
                          fontFamily: FONT_BODY,
                          fontSize: 10,
                          fontWeight: 500,
                          color: 'rgba(255,255,255,0.7)',
                          padding: '0 10px',
                          lineHeight: `${barH}px`,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: 'block',
                        }}
                      >
                        {sub.name}
                      </span>
                    )}
                  </div>
                )
              })}

              {/* Markers — frosted vertical bands with diamond icon */}
              {markers.map((marker) => {
                const x = timeline.dateToX(marker.date)
                if (x < 0 || x > totalWidth) return null
                const mColor = marker.color || '#e879f9'
                return (
                  <div
                    key={`mk-${marker.id}`}
                    style={{
                      position: 'absolute',
                      left: x - 4,
                      top: 0,
                      width: 8,
                      height: chartHeight,
                      zIndex: 3,
                    }}
                  >
                    {/* Blurred band */}
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: hexToRgba(mColor, 0.2),
                        backdropFilter: 'blur(4px)',
                        WebkitBackdropFilter: 'blur(4px)',
                      }}
                    />
                    {/* Diamond icon at top */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 8,
                        left: '50%',
                        width: 10,
                        height: 10,
                        background: `linear-gradient(135deg, ${mColor}, ${lighten(mColor, 0.3)})`,
                        border: '1px solid rgba(255,255,255,0.4)',
                        transform: 'translateX(-50%) rotate(45deg)',
                        boxShadow: `0 2px 8px ${hexToRgba(mColor, 0.4)}`,
                      }}
                    />
                    {/* Label */}
                    <div
                      style={{
                        position: 'absolute',
                        left: 14,
                        top: 4,
                        background: 'rgba(255,255,255,0.15)',
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        border: '1px solid rgba(255,255,255,0.25)',
                        borderRadius: 8,
                        padding: '3px 10px',
                        fontFamily: FONT_HEADING,
                        fontSize: 9,
                        fontWeight: 600,
                        color: 'rgba(255,255,255,0.9)',
                        whiteSpace: 'nowrap',
                        letterSpacing: '0.04em',
                        boxShadow: `0 4px 12px ${hexToRgba(mColor, 0.2)}`,
                      }}
                    >
                      {marker.label}
                    </div>
                  </div>
                )
              })}

              {drag.dropIndicatorY !== null && (
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: drag.dropIndicatorY,
                    width: '100%',
                    height: 2,
                    background: 'linear-gradient(90deg, rgba(236,72,153,0.8), rgba(124,58,237,0.8), rgba(6,182,212,0.8))',
                    boxShadow: '0 0 12px rgba(236,72,153,0.4), 0 0 4px rgba(124,58,237,0.3)',
                    zIndex: 20,
                    pointerEvents: 'none',
                    borderRadius: 1,
                    transition: 'top 0.1s ease',
                  }}
                />
              )}

              {/* Hover date tooltip */}
              {hoverDate && (
                <div
                  style={{
                    position: 'fixed',
                    left: hoverX + (scrollContainerRef.current?.getBoundingClientRect().left ?? 0),
                    top: hoverY + (scrollContainerRef.current?.getBoundingClientRect().top ?? 0) - 36,
                    background: 'rgba(255,255,255,0.18)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: 10,
                    padding: '4px 12px',
                    fontFamily: FONT_BODY,
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.9)',
                    pointerEvents: 'none',
                    zIndex: 100,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                    transform: 'translateX(-50%)',
                  }}
                >
                  {hoverDate}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
