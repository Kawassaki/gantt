import { useRef, useState, useCallback, useMemo } from 'react'
import { useAtomValue, useSetAtom } from 'jotai'
import { tasksAtom, markersAtom } from '../../core/store'
import { addNewTaskAtom, addNewSubtaskAtom } from '../../core/actions'
import { useKeyboardShortcuts } from '../../core/useKeyboardShortcuts'
import { useTimeline } from '../../core/useTimeline'
import { useGanttDrag } from '../../core/useGanttDrag'
import { GanttToolbar } from '../../core/GanttToolbar'
import type { Task } from '../../core/types'

const TASK_ROW_H = 56
const SUBTASK_ROW_H = 36
const HEADER_H = 64
const LEFT_PANEL_W = 240

const NEON_CYCLE = ['#39ff14', '#ff2d6b', '#b026ff', '#00fff5']

const C = {
  bg: '#000000',
  grid: '#0a2a0a',
  green: '#39ff14',
  pink: '#ff2d6b',
  purple: '#b026ff',
  cyan: '#00fff5',
  textPrimary: '#39ff14',
  textDim: '#1a7a0a',
  headerBg: '#020602',
  panelBorder: '#0d3d0d',
}

const FONT_HEADER = "'Orbitron', sans-serif"
const FONT_BODY = "'IBM Plex Mono', monospace"

function neonColor(index: number): string {
  return NEON_CYCLE[index % NEON_CYCLE.length]
}

function neonGlow(color: string, spread = 15): string {
  const r = parseInt(color.slice(1, 3), 16)
  const g = parseInt(color.slice(3, 5), 16)
  const b = parseInt(color.slice(5, 7), 16)
  return `0 0 ${spread}px rgba(${r},${g},${b},0.5), 0 0 ${spread * 2}px rgba(${r},${g},${b},0.2)`
}

function brighten(hex: string, factor = 0.3): string {
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + Math.round(255 * factor))
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + Math.round(255 * factor))
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + Math.round(255 * factor))
  return `rgb(${r},${g},${b})`
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
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=IBM+Plex+Mono:wght@400;500;700&display=swap');

@keyframes neon-blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

@keyframes neon-flicker {
  0%, 90% { opacity: 1; }
  92% { opacity: 0.4; }
  94% { opacity: 1; }
  96% { opacity: 0.3; }
  100% { opacity: 1; }
}

@keyframes neon-crt-flicker {
  0% { opacity: 1; }
  5% { opacity: 0.97; }
  10% { opacity: 1; }
  15% { opacity: 0.985; }
  20% { opacity: 1; }
  80% { opacity: 1; }
  85% { opacity: 0.98; }
  90% { opacity: 1; }
  95% { opacity: 0.975; }
  100% { opacity: 1; }
}

@keyframes neon-subtask-cursor {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

@keyframes neon-scanline-scroll {
  0% { background-position: 0 0; }
  100% { background-position: 0 4px; }
}

.neon-bar {
  transition: box-shadow 0.15s ease, filter 0.15s ease;
}
.neon-bar:hover {
  filter: brightness(1.4) !important;
}

.neon-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
.neon-scrollbar::-webkit-scrollbar-track { background: #010201; }
.neon-scrollbar::-webkit-scrollbar-thumb { background: #0d3d0d; border-radius: 3px; }
.neon-scrollbar::-webkit-scrollbar-thumb:hover { background: #39ff1466; }
`

export default function GanttNeon() {
  const tasks = useAtomValue(tasksAtom)
  const markers = useAtomValue(markersAtom)
  const timeline = useTimeline()
  const { pxPerDay, totalWidth, barStyle, weekHeaders, monthHeaders, dayColumns, xToDate } = timeline
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const leftPanelRef = useRef<HTMLDivElement>(null)
  const headerScrollRef = useRef<HTMLDivElement>(null)
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

  const syncScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget
    if (leftPanelRef.current) {
      leftPanelRef.current.scrollTop = target.scrollTop
    }
    if (headerScrollRef.current) {
      headerScrollRef.current.scrollLeft = target.scrollLeft
    }
  }, [])

  return (
    <div
      style={{
        background: C.bg,
        color: C.textPrimary,
        fontFamily: FONT_BODY,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderRadius: 12,
        boxShadow: `inset 0 0 60px rgba(0,0,0,0.6), 0 0 30px rgba(57,255,20,0.08)`,
        position: 'relative',
        animation: 'neon-crt-flicker 8s ease-in-out infinite',
      }}
    >
      <style>{STYLE_TAG_CONTENT}</style>

      {/* Scanline overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)',
          pointerEvents: 'none',
          zIndex: 50,
          borderRadius: 12,
          animation: 'neon-scanline-scroll 0.3s linear infinite',
        }}
      />

      {/* CRT vignette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          boxShadow: 'inset 0 0 100px rgba(0,0,0,0.5)',
          pointerEvents: 'none',
          zIndex: 51,
          borderRadius: 12,
        }}
      />

      {/* Toolbar */}
      <div style={{ position: 'relative', zIndex: 10 }}>
        <GanttToolbar
          className="px-4 py-3"
          buttonClass="bg-[#0a1a0a] text-[#39ff14] border border-[#0d3d0d] hover:bg-[#0d3d0d] hover:border-[#39ff1466] hover:shadow-[0_0_10px_rgba(57,255,20,0.3)]"
          title="NEON TERMINAL_"
          titleClass="text-sm tracking-[0.25em] uppercase"
          accentColor={C.green}
        />
      </div>

      {/* Header: month + week rows */}
      <div
        style={{
          borderTop: `1px solid ${C.panelBorder}`,
          borderBottom: `1px solid ${C.panelBorder}`,
          background: C.headerBg,
          display: 'flex',
          position: 'relative',
          zIndex: 10,
        }}
      >
        {/* Left header spacer */}
        <div
          style={{
            width: LEFT_PANEL_W,
            minWidth: LEFT_PANEL_W,
            borderRight: `1px solid ${C.panelBorder}`,
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
          }}
        >
          <span
            style={{
              fontFamily: FONT_HEADER,
              fontSize: 10,
              letterSpacing: '0.2em',
              color: C.green,
              textTransform: 'uppercase',
              textShadow: `0 0 8px rgba(57,255,20,0.4)`,
            }}
          >
            {'>'} TASKS
          </span>
        </div>

        {/* Timeline headers */}
        <div
          ref={headerScrollRef}
          style={{ flex: 1, overflow: 'hidden' }}
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
                    fontWeight: 700,
                    letterSpacing: '0.15em',
                    color: C.green,
                    textTransform: 'uppercase',
                    borderLeft: `1px solid ${C.panelBorder}`,
                    borderBottom: `1px solid ${C.panelBorder}`,
                    boxSizing: 'border-box',
                    textShadow: `0 0 10px rgba(57,255,20,0.3)`,
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
                    color: C.textDim,
                    borderLeft: `1px solid ${C.panelBorder}`,
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
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative', zIndex: 10 }}>
        {/* Left panel — task names */}
        <div
          ref={leftPanelRef}
          className="neon-scrollbar"
          style={{
            width: LEFT_PANEL_W,
            minWidth: LEFT_PANEL_W,
            borderRight: `1px solid ${C.panelBorder}`,
            overflowY: 'hidden',
            overflowX: 'hidden',
            background: C.headerBg,
          }}
        >
          <div style={{ height: chartHeight }}>
            {rows.map((row) => {
              if (row.type === 'task') {
                const color = neonColor(row.taskIndex)
                return (
                  <div
                    key={`tl-${row.task.id}`}
                    style={{
                      height: TASK_ROW_H,
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 16px',
                      borderBottom: `1px solid ${C.panelBorder}`,
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: FONT_BODY,
                        fontSize: 12,
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        color,
                        textShadow: `0 0 8px ${color}66`,
                      }}
                    >
                      {'> '}{row.task.name}
                    </span>
                    <button
                      onClick={() => addSubtask(row.task.id)}
                      style={{
                        marginLeft: 'auto',
                        flexShrink: 0,
                        width: 20,
                        height: 20,
                        borderRadius: 3,
                        border: `1px solid ${C.panelBorder}`,
                        background: 'transparent',
                        color,
                        fontSize: 14,
                        lineHeight: '18px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s ease',
                        opacity: 0.4,
                        textShadow: `0 0 6px ${color}44`,
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.borderColor = color; e.currentTarget.style.boxShadow = `0 0 10px ${color}44`; }}
                      onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.4'; e.currentTarget.style.borderColor = C.panelBorder; e.currentTarget.style.boxShadow = 'none'; }}
                      title="Add subtask"
                    >
                      +
                    </button>
                  </div>
                )
              }
              const sub = row.task.subtasks[row.subtaskIndex!]
              const color = neonColor(row.taskIndex)
              return (
                <div
                  key={`sl-${row.task.id}-${sub.id}`}
                  style={{
                    height: SUBTASK_ROW_H,
                    display: 'flex',
                    alignItems: 'center',
                    paddingLeft: 36,
                    paddingRight: 16,
                    borderBottom: `1px solid ${C.panelBorder}`,
                  }}
                >
                  <span
                    style={{
                      fontFamily: FONT_BODY,
                      fontSize: 11,
                      color: `${color}88`,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {'  '}{sub.name}
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
                borderBottom: `1px solid ${C.panelBorder}`,
              }}
            >
              <button
                onClick={() => addTask()}
                style={{
                  background: 'transparent',
                  border: `1px dashed ${C.panelBorder}`,
                  borderRadius: 3,
                  color: C.green,
                  fontFamily: FONT_BODY,
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '6px 16px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  opacity: 0.4,
                  letterSpacing: '0.08em',
                  textShadow: `0 0 6px ${C.green}44`,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.borderColor = C.green; e.currentTarget.style.boxShadow = `0 0 10px ${C.green}33`; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.4'; e.currentTarget.style.borderColor = C.panelBorder; e.currentTarget.style.boxShadow = 'none'; }}
              >
                {'>'} ADD_TASK
              </button>
            </div>
          </div>
        </div>

        {/* Right panel — timeline */}
        <div
          ref={scrollContainerRef}
          className="neon-scrollbar"
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
              background: C.bg,
            }}
          >
            {/* Oscilloscope grid — vertical lines */}
            {dayColumns.map((col, i) => (
              <div
                key={`vg-${i}`}
                style={{
                  position: 'absolute',
                  left: col.x,
                  top: 0,
                  width: 1,
                  height: chartHeight,
                  background: col.isWeekStart ? '#0d4d0d' : C.grid,
                }}
              />
            ))}

            {/* Oscilloscope grid — horizontal lines */}
            {rows.map((row, i) => (
              <div
                key={`hg-${i}`}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: row.y + row.h - 1,
                  width: '100%',
                  height: 1,
                  background: C.grid,
                }}
              />
            ))}

            {/* Task bars & subtask bars */}
            {rows.map((row) => {
              if (row.type === 'task') {
                const task = row.task
                const color = neonColor(row.taskIndex)
                const bs = barStyle(task.startDate, task.endDate)
                const barY = row.y + (TASK_ROW_H - 30) / 2

                return (
                  <div
                    key={`tb-${task.id}`}
                    className="neon-bar"
                    style={{
                      position: 'absolute',
                      left: bs.left,
                      top: barY,
                      width: bs.width,
                      height: 30,
                      background: `${color}22`,
                      border: `2px solid ${color}`,
                      borderRadius: 3,
                      cursor: drag.isDragging ? 'grabbing' : 'grab',
                      boxSizing: 'border-box',
                      overflow: 'hidden',
                      zIndex: 2,
                      boxShadow: neonGlow(color),
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
                        background: `${color}44`,
                        boxShadow: `inset 0 0 10px ${color}33`,
                        transition: 'width 0.3s ease',
                      }}
                    />
                    {bs.width > 60 && (
                      <span
                        style={{
                          position: 'relative',
                          zIndex: 1,
                          fontFamily: FONT_BODY,
                          fontSize: 10,
                          fontWeight: 700,
                          color: brighten(color, 0.2),
                          padding: '0 8px',
                          lineHeight: '26px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: 'block',
                          textShadow: `0 0 6px ${color}88`,
                        }}
                      >
                        {task.name}
                      </span>
                    )}
                  </div>
                )
              }

              const sub = row.task.subtasks[row.subtaskIndex!]
              const color = neonColor(row.taskIndex)
              const bs = barStyle(sub.startDate, sub.endDate)
              const barY = row.y + (SUBTASK_ROW_H - 18) / 2

              return (
                <div
                  key={`sb-${row.task.id}-${sub.id}`}
                  className="neon-bar"
                  style={{
                    position: 'absolute',
                    left: bs.left,
                    top: barY,
                    width: bs.width,
                    height: 18,
                    background: `${color}18`,
                    border: `1px solid ${color}88`,
                    borderRadius: 2,
                    cursor: drag.isDragging ? 'grabbing' : 'grab',
                    boxSizing: 'border-box',
                    overflow: 'visible',
                    zIndex: 2,
                    boxShadow: `0 0 8px ${color}33`,
                  }}
                  onPointerDown={(e) => drag.startDrag(e, row.task.id, sub.id)}
                >
                  {bs.width > 50 && (
                    <span
                      style={{
                        fontFamily: FONT_BODY,
                        fontSize: 9,
                        color: `${color}aa`,
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
                  {/* Blinking cursor at end of subtask bar */}
                  <div
                    style={{
                      position: 'absolute',
                      right: -6,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: 4,
                      height: 12,
                      background: color,
                      animation: 'neon-subtask-cursor 1s step-end infinite',
                      boxShadow: `0 0 4px ${color}`,
                    }}
                  />
                </div>
              )
            })}

            {/* Markers — flickering vertical lines */}
            {markers.map((marker) => {
              const x = timeline.dateToX(marker.date)
              if (x < 0 || x > totalWidth) return null
              const markerColor = marker.color || C.pink
              return (
                <div
                  key={`mk-${marker.id}`}
                  style={{
                    position: 'absolute',
                    left: x,
                    top: 0,
                    height: chartHeight,
                    zIndex: 3,
                    animation: 'neon-flicker 2s ease-in-out infinite',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      width: 2,
                      height: '100%',
                      background: `linear-gradient(180deg, ${markerColor}, ${markerColor}33)`,
                      boxShadow: `0 0 12px ${markerColor}88, 0 0 24px ${markerColor}44`,
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      left: 6,
                      top: 6,
                      background: '#000000ee',
                      border: `1px solid ${markerColor}`,
                      borderRadius: 2,
                      padding: '2px 8px',
                      fontFamily: FONT_HEADER,
                      fontSize: 9,
                      fontWeight: 700,
                      color: markerColor,
                      whiteSpace: 'nowrap',
                      letterSpacing: '0.1em',
                      textShadow: `0 0 6px ${markerColor}66`,
                      boxShadow: `0 0 10px ${markerColor}33`,
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
                  background: C.green,
                  boxShadow: `0 0 12px ${C.green}, 0 0 24px ${C.green}66`,
                  zIndex: 20,
                  pointerEvents: 'none',
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
                  top: hoverY + (scrollContainerRef.current?.getBoundingClientRect().top ?? 0) - 32,
                  background: '#000000ee',
                  border: `1px solid ${C.green}`,
                  borderRadius: 2,
                  padding: '3px 10px',
                  fontFamily: FONT_BODY,
                  fontSize: 10,
                  fontWeight: 700,
                  color: C.green,
                  pointerEvents: 'none',
                  zIndex: 100,
                  boxShadow: neonGlow(C.green, 10),
                  letterSpacing: '0.08em',
                  transform: 'translateX(-50%)',
                  textShadow: `0 0 6px ${C.green}88`,
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
