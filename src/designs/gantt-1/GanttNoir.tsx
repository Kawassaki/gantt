import { useRef, useState, useCallback, useMemo } from 'react'
import { useAtomValue, useSetAtom } from 'jotai'
import { tasksAtom, markersAtom } from '../../core/store'
import { addNewTaskAtom, addNewSubtaskAtom } from '../../core/actions'
import { useTimeline } from '../../core/useTimeline'
import { useGanttDrag } from '../../core/useGanttDrag'
import { useKeyboardShortcuts } from '../../core/useKeyboardShortcuts'
import { GanttToolbar } from '../../core/GanttToolbar'
import type { Task, Marker } from '../../core/types'

const TASK_ROW_H = 56
const SUBTASK_ROW_H = 36
const HEADER_H = 64
const LEFT_PANEL_W = 240

const COLORS = {
  bg: '#0a0f1e',
  gridDot: '#0d1a35',
  cyan: '#00e5ff',
  barFill: '#2a3a5c',
  barBorder: '#00e5ff',
  textPrimary: '#e8ecf4',
  textDim: '#6b7fa3',
  headerBg: '#070c19',
  panelBorder: '#112240',
  subtaskDash: '#00e5ff',
  progressFill: '#0b1e3d',
  hoverGlow: '0 0 20px rgba(0,229,255,0.3)',
}

const FONT_HEADER = "'JetBrains Mono', monospace"
const FONT_BODY = "'Archivo', sans-serif"

const crosshatchSvg = `url("data:image/svg+xml,%3Csvg width='8' height='8' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 8L8 0M-1 1L1 -1M7 9L9 7' stroke='%2300e5ff' stroke-width='0.5' opacity='0.12'/%3E%3C/svg%3E")`

const blueprintGrid = `radial-gradient(circle, ${COLORS.gridDot} 1px, transparent 1px)`

function computeRows(tasks: Task[]) {
  const rows: { type: 'task' | 'subtask'; task: Task; subtaskIndex?: number; y: number; h: number }[] = []
  let y = 0
  for (const task of tasks) {
    rows.push({ type: 'task', task, y, h: TASK_ROW_H })
    y += TASK_ROW_H
    for (let si = 0; si < task.subtasks.length; si++) {
      rows.push({ type: 'subtask', task, subtaskIndex: si, y, h: SUBTASK_ROW_H })
      y += SUBTASK_ROW_H
    }
  }
  return { rows, totalHeight: y }
}

export default function GanttNoir() {
  const tasks = useAtomValue(tasksAtom)
  const markers = useAtomValue(markersAtom)
  const timeline = useTimeline()
  const { pxPerDay, totalWidth, barStyle, weekHeaders, monthHeaders, dayColumns, xToDate } = timeline
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const leftPanelRef = useRef<HTMLDivElement>(null)
  const drag = useGanttDrag(pxPerDay, { taskRowH: TASK_ROW_H, subtaskRowH: SUBTASK_ROW_H }, scrollContainerRef)
  const addTask = useSetAtom(addNewTaskAtom)
  const addSubtask = useSetAtom(addNewSubtaskAtom)
  useKeyboardShortcuts()

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

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (scrollContainerRef.current && Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      e.preventDefault()
      scrollContainerRef.current.scrollLeft += e.deltaX
    }
  }, [])

  const syncScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = (e.currentTarget as HTMLDivElement).scrollTop
    if (leftPanelRef.current) {
      leftPanelRef.current.scrollTop = scrollTop
    }
  }, [])

  return (
    <div
      style={{
        background: COLORS.bg,
        color: COLORS.textPrimary,
        fontFamily: FONT_BODY,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderRadius: 12,
        border: `1px solid ${COLORS.panelBorder}`,
      }}
    >
      <style>{`
        @keyframes noir-pulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
        @keyframes noir-glow-pulse {
          0%, 100% { box-shadow: 0 0 8px rgba(0,229,255,0.15); }
          50% { box-shadow: 0 0 18px rgba(0,229,255,0.35); }
        }
        .noir-bar { transition: box-shadow 0.2s ease, filter 0.2s ease; }
        .noir-bar:hover { box-shadow: ${COLORS.hoverGlow} !important; filter: brightness(1.15); }
        .noir-marker-line { animation: noir-pulse 3s ease-in-out infinite; }
        .noir-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .noir-scrollbar::-webkit-scrollbar-track { background: ${COLORS.headerBg}; }
        .noir-scrollbar::-webkit-scrollbar-thumb { background: ${COLORS.panelBorder}; border-radius: 3px; }
        .noir-scrollbar::-webkit-scrollbar-thumb:hover { background: ${COLORS.cyan}44; }
      `}</style>

      {/* Toolbar */}
      <GanttToolbar
        className="px-4 py-3"
        buttonClass={`bg-[#112240] text-[${COLORS.cyan}] border border-[#1a3356] hover:bg-[#1a3356] hover:border-[#00e5ff66]`}
        title="NOIR BLUEPRINT"
        titleClass="text-sm tracking-[0.25em] uppercase"
        accentColor={COLORS.cyan}
      />

      <div
        style={{
          borderTop: `1px solid ${COLORS.panelBorder}`,
          borderBottom: `1px solid ${COLORS.panelBorder}`,
          background: COLORS.headerBg,
          display: 'flex',
        }}
      >
        {/* Left header spacer */}
        <div
          style={{
            width: LEFT_PANEL_W,
            minWidth: LEFT_PANEL_W,
            borderRight: `1px solid ${COLORS.panelBorder}`,
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
          }}
        >
          <span
            style={{
              fontFamily: FONT_HEADER,
              fontSize: 10,
              letterSpacing: '0.15em',
              color: COLORS.textDim,
              textTransform: 'uppercase',
            }}
          >
            Tasks
          </span>
        </div>

        {/* Timeline headers */}
        <div
          style={{ flex: 1, overflow: 'hidden' }}
          ref={(el) => {
            if (el && scrollContainerRef.current) {
              const sync = () => {
                el.scrollLeft = scrollContainerRef.current!.scrollLeft
              }
              scrollContainerRef.current.addEventListener('scroll', sync)
            }
          }}
        >
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
                    paddingLeft: 12,
                    fontFamily: FONT_HEADER,
                    fontSize: 11,
                    letterSpacing: '0.1em',
                    color: COLORS.textPrimary,
                    textTransform: 'uppercase',
                    borderLeft: `1px solid ${COLORS.panelBorder}`,
                    borderBottom: `1px solid ${COLORS.panelBorder}`,
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
                    paddingLeft: 8,
                    fontFamily: FONT_BODY,
                    fontSize: 10,
                    color: COLORS.textDim,
                    borderLeft: `1px solid ${COLORS.panelBorder}`,
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

      {/* Main body: left panel + timeline */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left panel — task names */}
        <div
          ref={leftPanelRef}
          className="noir-scrollbar"
          style={{
            width: LEFT_PANEL_W,
            minWidth: LEFT_PANEL_W,
            borderRight: `1px solid ${COLORS.panelBorder}`,
            overflowY: 'hidden',
            overflowX: 'hidden',
            background: COLORS.headerBg,
          }}
        >
          <div style={{ height: chartHeight }}>
            {rows.map((row, i) => {
              if (row.type === 'task') {
                return (
                  <div
                    key={`tl-${row.task.id}`}
                    style={{
                      height: TASK_ROW_H,
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 16px',
                      borderBottom: `1px solid ${COLORS.panelBorder}`,
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: COLORS.cyan,
                        flexShrink: 0,
                        boxShadow: `0 0 6px ${COLORS.cyan}66`,
                      }}
                    />
                    <span
                      style={{
                        fontFamily: FONT_HEADER,
                        fontSize: 12,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        color: COLORS.textPrimary,
                      }}
                    >
                      {row.task.name}
                    </span>
                    <button
                      onClick={() => addSubtask(row.task.id)}
                      style={{
                        marginLeft: 'auto',
                        flexShrink: 0,
                        width: 20,
                        height: 20,
                        borderRadius: 4,
                        border: `1px solid ${COLORS.panelBorder}`,
                        background: 'transparent',
                        color: COLORS.cyan,
                        fontSize: 14,
                        lineHeight: '18px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s ease',
                        opacity: 0.5,
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.borderColor = COLORS.cyan; e.currentTarget.style.boxShadow = `0 0 8px ${COLORS.cyan}44`; }}
                      onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.5'; e.currentTarget.style.borderColor = COLORS.panelBorder; e.currentTarget.style.boxShadow = 'none'; }}
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
                    paddingLeft: 36,
                    paddingRight: 16,
                    borderBottom: `1px solid ${COLORS.panelBorder}`,
                  }}
                >
                  <span
                    style={{
                      fontFamily: FONT_BODY,
                      fontSize: 11,
                      color: COLORS.textDim,
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
                borderBottom: `1px solid ${COLORS.panelBorder}`,
              }}
            >
              <button
                onClick={() => addTask()}
                style={{
                  background: 'transparent',
                  border: `1px dashed ${COLORS.panelBorder}`,
                  borderRadius: 6,
                  color: COLORS.cyan,
                  fontFamily: FONT_HEADER,
                  fontSize: 11,
                  letterSpacing: '0.1em',
                  padding: '6px 16px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  opacity: 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.borderColor = COLORS.cyan; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.5'; e.currentTarget.style.borderColor = COLORS.panelBorder; }}
              >
                + ADD TASK
              </button>
            </div>
          </div>
        </div>

        {/* Right panel — timeline */}
        <div
          ref={scrollContainerRef}
          className="noir-scrollbar"
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
          onWheel={handleWheel}
          onScroll={syncScroll}
        >
          <div
            style={{
              width: totalWidth,
              height: chartHeight,
              position: 'relative',
              backgroundImage: blueprintGrid,
              backgroundSize: `${pxPerDay}px ${TASK_ROW_H}px`,
              backgroundPosition: '0 0',
            }}
          >
            {/* Day column grid lines */}
            {dayColumns.map((col, i) =>
              col.isWeekStart ? (
                <div
                  key={`dg-${i}`}
                  style={{
                    position: 'absolute',
                    left: col.x,
                    top: 0,
                    width: 1,
                    height: chartHeight,
                    background: COLORS.panelBorder,
                  }}
                />
              ) : null,
            )}

            {/* Row separators */}
            {rows.map((row, i) => (
              <div
                key={`rs-${i}`}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: row.y + row.h - 1,
                  width: '100%',
                  height: 1,
                  background: COLORS.panelBorder,
                }}
              />
            ))}

            {/* Task bars */}
            {rows.map((row) => {
              if (row.type === 'task') {
                const task = row.task
                const bs = barStyle(task.startDate, task.endDate)
                const barY = row.y + (TASK_ROW_H - 28) / 2
                return (
                  <div
                    key={`tb-${task.id}`}
                    className="noir-bar"
                    style={{
                      position: 'absolute',
                      left: bs.left,
                      top: barY,
                      width: bs.width,
                      height: 28,
                      border: `1.5px solid ${COLORS.barBorder}`,
                      borderRadius: 4,
                      background: COLORS.barFill,
                      backgroundImage: crosshatchSvg,
                      cursor: drag.isDragging ? 'grabbing' : 'grab',
                      boxSizing: 'border-box',
                      overflow: 'hidden',
                      zIndex: 2,
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
                        background: COLORS.progressFill,
                        borderRadius: '3px 0 0 3px',
                        transition: 'width 0.3s ease',
                      }}
                    />
                    {bs.width > 60 && (
                      <span
                        style={{
                          position: 'relative',
                          zIndex: 1,
                          fontFamily: FONT_HEADER,
                          fontSize: 10,
                          color: COLORS.textPrimary,
                          padding: '0 8px',
                          lineHeight: '26px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: 'block',
                        }}
                      >
                        {task.name}
                      </span>
                    )}
                  </div>
                )
              }

              const sub = row.task.subtasks[row.subtaskIndex!]
              const bs = barStyle(sub.startDate, sub.endDate)
              const barY = row.y + (SUBTASK_ROW_H - 18) / 2
              return (
                <div
                  key={`sb-${row.task.id}-${sub.id}`}
                  className="noir-bar"
                  style={{
                    position: 'absolute',
                    left: bs.left,
                    top: barY,
                    width: bs.width,
                    height: 18,
                    border: `1px dashed ${COLORS.subtaskDash}`,
                    borderRadius: 3,
                    background: `${COLORS.barFill}99`,
                    backgroundImage: crosshatchSvg,
                    cursor: drag.isDragging ? 'grabbing' : 'grab',
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    zIndex: 2,
                  }}
                  onPointerDown={(e) => drag.startDrag(e, row.task.id, sub.id)}
                >
                  {bs.width > 50 && (
                    <span
                      style={{
                        fontFamily: FONT_BODY,
                        fontSize: 9,
                        color: COLORS.textDim,
                        padding: '0 6px',
                        lineHeight: '16px',
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

            {/* Markers */}
            {markers.map((marker) => {
              const x = timeline.dateToX(marker.date)
              if (x < 0 || x > totalWidth) return null
              return (
                <div key={`mk-${marker.id}`} style={{ position: 'absolute', left: x, top: 0, height: chartHeight, zIndex: 3 }}>
                  <div
                    className="noir-marker-line"
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      width: 2,
                      height: '100%',
                      background: `linear-gradient(180deg, ${COLORS.cyan}, ${COLORS.cyan}44)`,
                      boxShadow: `0 0 8px ${COLORS.cyan}66`,
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      left: 4,
                      top: 4,
                      background: COLORS.headerBg,
                      border: `1px solid ${COLORS.cyan}66`,
                      borderRadius: 3,
                      padding: '2px 8px',
                      fontFamily: FONT_HEADER,
                      fontSize: 9,
                      color: COLORS.cyan,
                      whiteSpace: 'nowrap',
                      letterSpacing: '0.05em',
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
                  background: COLORS.cyan,
                  boxShadow: `0 0 12px ${COLORS.cyan}, 0 0 4px ${COLORS.cyan}`,
                  zIndex: 20,
                  pointerEvents: 'none',
                  transition: 'top 0.1s ease',
                }}
              />
            )}

            {/* Coordinate readout badge */}
            {hoverDate && (
              <div
                style={{
                  position: 'fixed',
                  left: hoverX + (scrollContainerRef.current?.getBoundingClientRect().left ?? 0),
                  top: hoverY + (scrollContainerRef.current?.getBoundingClientRect().top ?? 0) - 32,
                  background: COLORS.headerBg,
                  border: `1px solid ${COLORS.cyan}88`,
                  borderRadius: 4,
                  padding: '3px 10px',
                  fontFamily: FONT_HEADER,
                  fontSize: 10,
                  color: COLORS.cyan,
                  pointerEvents: 'none',
                  zIndex: 100,
                  boxShadow: `0 0 12px ${COLORS.cyan}33`,
                  letterSpacing: '0.08em',
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
  )
}
