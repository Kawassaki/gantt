import { useRef, useCallback, useMemo } from 'react'
import { useAtomValue, useSetAtom } from 'jotai'
import { tasksAtom, markersAtom } from '../../core/store'
import { addNewTaskAtom, addNewSubtaskAtom } from '../../core/actions'
import { useTimeline } from '../../core/useTimeline'
import { useGanttDrag } from '../../core/useGanttDrag'
import { useKeyboardShortcuts } from '../../core/useKeyboardShortcuts'
import { GanttToolbar } from '../../core/GanttToolbar'
import type { Task } from '../../core/types'

const TASK_ROW_H = 56
const SUBTASK_ROW_H = 40
const HEADER_H = 72
const LEFT_PANEL_W = 260

const C = {
  bg: '#f8f6f2',
  black: '#111',
  red: '#e63226',
  grey: '#888',
  lightGrey: '#d0cec8',
  ruleGrey: '#c8c5be',
  headerBg: '#111',
  headerText: '#fff',
  panelBg: '#f8f6f2',
  rowBorder: '#e0ddd6',
  barBorder: '#111',
  subtaskConnector: '#e63226',
  progressRed: '#e63226',
  dateMeta: '#888',
  rowNumber: '#b8b5ae',
} as const

const FONT_HEADING = "'Newsreader', 'Georgia', serif"
const FONT_BODY = "'Hanken Grotesk', 'Inter', 'Helvetica Neue', sans-serif"

function desaturate(hex: string, amount = 0.55): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const grey = Math.round(r * 0.299 + g * 0.587 + b * 0.114)
  const mix = (c: number) => Math.round(c + (grey - c) * amount)
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`
}

function lighten(hex: string, amount = 0.35): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const l = (c: number) => Math.round(c + (255 - c) * amount)
  return `rgb(${l(r)}, ${l(g)}, ${l(b)})`
}

function formatDateShort(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[d.getMonth()]} ${d.getDate()}`
}

function padRowNumber(n: number): string {
  return n < 10 ? `0${n}.` : `${n}.`
}

function computeRows(tasks: Task[]) {
  const rows: { type: 'task' | 'subtask'; task: Task; subtaskIndex?: number; y: number; h: number; taskNumber: number }[] = []
  let y = 0
  let taskNum = 0
  for (const task of tasks) {
    taskNum++
    rows.push({ type: 'task', task, y, h: TASK_ROW_H, taskNumber: taskNum })
    y += TASK_ROW_H
    for (let si = 0; si < task.subtasks.length; si++) {
      rows.push({ type: 'subtask', task, subtaskIndex: si, y, h: SUBTASK_ROW_H, taskNumber: taskNum })
      y += SUBTASK_ROW_H
    }
  }
  return { rows, totalHeight: y }
}

export default function GanttSwiss() {
  const tasks = useAtomValue(tasksAtom)
  const markers = useAtomValue(markersAtom)
  const timeline = useTimeline()
  const { pxPerDay, totalWidth, barStyle, weekHeaders, monthHeaders, dayColumns, dateToX } = timeline

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const leftPanelRef = useRef<HTMLDivElement>(null)
  const headerTimelineRef = useRef<HTMLDivElement>(null)

  const drag = useGanttDrag(pxPerDay, { taskRowH: TASK_ROW_H, subtaskRowH: SUBTASK_ROW_H }, scrollContainerRef)

  const addTask = useSetAtom(addNewTaskAtom)
  const addSubtask = useSetAtom(addNewSubtaskAtom)
  useKeyboardShortcuts()

  const { rows, totalHeight } = useMemo(() => computeRows(tasks), [tasks])
  const chartHeight = Math.max(totalHeight, 320)

  const handleTimelinePointerMove = useCallback(
    (e: React.PointerEvent) => {
      drag.onPointerMove(e)
    },
    [drag],
  )

  const syncScroll = useCallback(() => {
    const el = scrollContainerRef.current
    if (!el) return
    if (leftPanelRef.current) leftPanelRef.current.scrollTop = el.scrollTop
    if (headerTimelineRef.current) headerTimelineRef.current.scrollLeft = el.scrollLeft
  }, [])

  return (
    <div
      style={{
        background: C.bg,
        color: C.black,
        fontFamily: FONT_BODY,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,700;1,6..72,400;1,6..72,700&family=Hanken+Grotesk:wght@300;400;500;600;700&display=swap');

        @keyframes expandUnderline {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }

        .swiss-bar { position: relative; transition: filter 0.15s ease; }
        .swiss-bar::after {
          content: '';
          position: absolute;
          left: 0;
          bottom: -3px;
          width: 100%;
          height: 2px;
          background: ${C.red};
          transform: scaleX(0);
          transform-origin: center;
          transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .swiss-bar:hover::after {
          transform: scaleX(1);
          animation: expandUnderline 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .swiss-bar:hover { filter: brightness(0.95); }

        .swiss-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
        .swiss-scroll::-webkit-scrollbar-track { background: ${C.bg}; }
        .swiss-scroll::-webkit-scrollbar-thumb { background: ${C.lightGrey}; }
        .swiss-scroll::-webkit-scrollbar-thumb:hover { background: ${C.grey}; }
      `}</style>

      {/* Toolbar */}
      <div
        style={{
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          borderBottom: `1px solid ${C.rowBorder}`,
        }}
      >
        <span
          style={{
            fontFamily: FONT_HEADING,
            fontStyle: 'italic',
            fontSize: 18,
            fontWeight: 400,
            color: C.black,
            letterSpacing: '0.02em',
            marginRight: 'auto',
          }}
        >
          Swiss Editorial
        </span>
        <GanttToolbar
          buttonClass="bg-[#111] text-white border-none hover:bg-[#333]"
          accentColor={C.red}
        />
      </div>

      {/* Header band — the defining visual element */}
      <div
        style={{
          background: C.headerBg,
          display: 'flex',
          height: HEADER_H,
          flexShrink: 0,
        }}
      >
        {/* Left header */}
        <div
          style={{
            width: LEFT_PANEL_W,
            minWidth: LEFT_PANEL_W,
            display: 'flex',
            alignItems: 'flex-end',
            padding: '0 24px 8px',
            borderRight: `1px solid #333`,
          }}
        >
          <span
            style={{
              fontFamily: FONT_BODY,
              fontSize: 10,
              fontWeight: 600,
              color: C.headerText,
              textTransform: 'uppercase',
              letterSpacing: '0.2em',
            }}
          >
            Tasks
          </span>
        </div>

        {/* Timeline header */}
        <div
          ref={headerTimelineRef}
          style={{ flex: 1, overflow: 'hidden' }}
        >
          <div style={{ width: totalWidth, position: 'relative', height: HEADER_H }}>
            {/* Month row */}
            <div style={{ height: 40, position: 'relative' }}>
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
                    paddingLeft: 16,
                    fontFamily: FONT_HEADING,
                    fontSize: 14,
                    fontWeight: 700,
                    color: C.headerText,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    borderLeft: i > 0 ? '1px solid #444' : 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  {m.label}
                </div>
              ))}
            </div>

            {/* Week row */}
            <div style={{ height: 32, position: 'relative' }}>
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
                    paddingLeft: 16,
                    fontFamily: FONT_BODY,
                    fontSize: 10,
                    fontWeight: 500,
                    color: '#999',
                    letterSpacing: '0.04em',
                    borderLeft: '1px solid #333',
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

      {/* Body: left panel + timeline */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left panel — task names with row numbers */}
        <div
          ref={leftPanelRef}
          style={{
            width: LEFT_PANEL_W,
            minWidth: LEFT_PANEL_W,
            borderRight: `1px solid ${C.rowBorder}`,
            overflowY: 'hidden',
            overflowX: 'hidden',
            background: C.panelBg,
          }}
        >
          <div style={{ height: chartHeight }}>
            {rows.map((row) => {
              if (row.type === 'task') {
                return (
                  <div
                    key={`tl-${row.task.id}`}
                    style={{
                      height: TASK_ROW_H,
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 24px',
                      borderBottom: `1px solid ${C.rowBorder}`,
                      gap: 16,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: FONT_HEADING,
                        fontSize: 24,
                        fontWeight: 400,
                        color: C.rowNumber,
                        lineHeight: 1,
                        minWidth: 40,
                        flexShrink: 0,
                      }}
                    >
                      {padRowNumber(row.taskNumber)}
                    </span>
                    <span
                      style={{
                        fontFamily: FONT_HEADING,
                        fontSize: 14,
                        fontWeight: 400,
                        color: C.black,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        lineHeight: 1.3,
                      }}
                    >
                      {row.task.name}
                    </span>
                    <button
                      onClick={() => addSubtask(row.task.id)}
                      style={{
                        marginLeft: 'auto',
                        flexShrink: 0,
                        width: 24,
                        height: 24,
                        borderRadius: 0,
                        border: `1px solid ${C.rowBorder}`,
                        background: 'transparent',
                        color: C.red,
                        fontSize: 16,
                        lineHeight: '22px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s ease',
                        opacity: 0.3,
                        fontFamily: FONT_BODY,
                        fontWeight: 300,
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.borderColor = C.red; }}
                      onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.3'; e.currentTarget.style.borderColor = C.rowBorder; }}
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
                    paddingLeft: 80,
                    paddingRight: 24,
                    borderBottom: `1px solid ${C.rowBorder}`,
                    position: 'relative',
                  }}
                >
                  {/* Red vertical connector */}
                  <div
                    style={{
                      position: 'absolute',
                      left: 48,
                      top: 0,
                      width: 1,
                      height: SUBTASK_ROW_H,
                      background: C.subtaskConnector,
                    }}
                  />
                  <span
                    style={{
                      fontFamily: FONT_BODY,
                      fontSize: 11,
                      fontWeight: 400,
                      color: C.grey,
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
                borderBottom: `1px solid ${C.rowBorder}`,
              }}
            >
              <button
                onClick={() => addTask()}
                style={{
                  background: 'transparent',
                  border: `1px solid ${C.rowBorder}`,
                  borderRadius: 0,
                  color: C.black,
                  fontFamily: FONT_HEADING,
                  fontSize: 12,
                  fontWeight: 400,
                  padding: '8px 24px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  opacity: 0.4,
                  letterSpacing: '0.04em',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.borderColor = C.red; e.currentTarget.style.color = C.red; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.4'; e.currentTarget.style.borderColor = C.rowBorder; e.currentTarget.style.color = C.black; }}
              >
                + Add Task
              </button>
            </div>
          </div>
        </div>

        {/* Right panel — scrollable timeline */}
        <div
          ref={scrollContainerRef}
          className="swiss-scroll"
          style={{
            flex: 1,
            overflowX: 'auto',
            overflowY: 'auto',
            position: 'relative',
            cursor: drag.isDragging ? 'grabbing' : 'default',
          }}
          onPointerMove={handleTimelinePointerMove}
          onPointerUp={drag.endDrag}
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
            {/* Day boundary grid lines */}
            {dayColumns.map((col, i) => (
              <div
                key={`dg-${i}`}
                style={{
                  position: 'absolute',
                  left: col.x,
                  top: 0,
                  width: 1,
                  height: chartHeight,
                  background: col.isWeekStart ? C.ruleGrey : C.rowBorder,
                  opacity: col.isWeekStart ? 1 : 0.5,
                }}
              />
            ))}

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
                  background: C.rowBorder,
                }}
              />
            ))}

            {/* Subtask connector lines (red vertical rules in the timeline) */}
            {rows.map((row) => {
              if (row.type !== 'subtask') return null
              const sub = row.task.subtasks[row.subtaskIndex!]
              const parentBs = barStyle(row.task.startDate, row.task.endDate)
              const subBs = barStyle(sub.startDate, sub.endDate)
              const connectorX = Math.max(parentBs.left, subBs.left)
              return (
                <div
                  key={`conn-${row.task.id}-${sub.id}`}
                  style={{
                    position: 'absolute',
                    left: connectorX,
                    top: row.y - 4,
                    width: 1,
                    height: 12,
                    background: C.subtaskConnector,
                    zIndex: 1,
                  }}
                />
              )
            })}

            {/* Task bars */}
            {rows.map((row) => {
              if (row.type === 'task') {
                const task = row.task
                const bs = barStyle(task.startDate, task.endDate)
                const barH = 32
                const barY = row.y + (TASK_ROW_H - barH) / 2
                const mutedColor = desaturate(task.color)
                const dateLabel = `${formatDateShort(task.startDate)} – ${formatDateShort(task.endDate)}`

                return (
                  <div key={`tb-${task.id}`} style={{ position: 'absolute', left: bs.left, top: barY, zIndex: 2 }}>
                    <div
                      className="swiss-bar"
                      style={{
                        width: bs.width,
                        height: barH,
                        background: mutedColor,
                        border: `1px solid ${C.barBorder}`,
                        borderRadius: 0,
                        cursor: drag.isDragging ? 'grabbing' : 'grab',
                        boxSizing: 'border-box',
                        overflow: 'hidden',
                        position: 'relative',
                      }}
                      onPointerDown={(e) => drag.startDrag(e, task.id)}
                      onPointerMove={(e) => {
                        const el = e.currentTarget as HTMLElement
                        el.style.cursor = drag.isDragging ? 'grabbing' : drag.getCursor(e, el)
                      }}
                    >
                      {/* Task name inside bar */}
                      {bs.width > 48 && (
                        <span
                          style={{
                            position: 'absolute',
                            left: 8,
                            top: 0,
                            lineHeight: `${barH}px`,
                            fontFamily: FONT_BODY,
                            fontSize: 11,
                            fontWeight: 600,
                            color: C.black,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: bs.width - 16,
                          }}
                        >
                          {task.name}
                        </span>
                      )}

                      {/* Progress indicator — thin red line at bottom */}
                      {task.progress > 0 && (
                        <div
                          style={{
                            position: 'absolute',
                            left: 0,
                            bottom: 0,
                            height: 2,
                            width: `${task.progress}%`,
                            background: C.progressRed,
                            transition: 'width 0.3s ease',
                          }}
                        />
                      )}
                    </div>

                    {/* Date range metadata to the right of the bar */}
                    {bs.width > 30 && (
                      <span
                        style={{
                          position: 'absolute',
                          left: bs.width + 8,
                          top: 0,
                          lineHeight: `${barH}px`,
                          fontFamily: FONT_BODY,
                          fontSize: 9,
                          fontWeight: 400,
                          color: C.dateMeta,
                          whiteSpace: 'nowrap',
                          letterSpacing: '0.02em',
                        }}
                      >
                        {dateLabel}
                        {task.progress > 0 && (
                          <span style={{ color: C.red, marginLeft: 8, fontWeight: 600 }}>
                            {task.progress}%
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                )
              }

              const sub = row.task.subtasks[row.subtaskIndex!]
              const bs = barStyle(sub.startDate, sub.endDate)
              const barH = 24
              const barY = row.y + (SUBTASK_ROW_H - barH) / 2
              const lightColor = lighten(sub.color, 0.45)
              const mutedLight = desaturate(lightColor, 0.3)

              return (
                <div key={`sb-${row.task.id}-${sub.id}`} style={{ position: 'absolute', left: bs.left, top: barY, zIndex: 2 }}>
                  <div
                    className="swiss-bar"
                    style={{
                      width: bs.width,
                      height: barH,
                      background: mutedLight,
                      border: `1px solid ${C.barBorder}`,
                      borderRadius: 0,
                      cursor: drag.isDragging ? 'grabbing' : 'grab',
                      boxSizing: 'border-box',
                      overflow: 'hidden',
                      position: 'relative',
                    }}
                    onPointerDown={(e) => drag.startDrag(e, row.task.id, sub.id)}
                    onPointerMove={(e) => {
                      const el = e.currentTarget as HTMLElement
                      el.style.cursor = drag.isDragging ? 'grabbing' : drag.getCursor(e, el)
                    }}
                  >
                    {bs.width > 48 && (
                      <span
                        style={{
                          position: 'absolute',
                          left: 8,
                          top: 0,
                          lineHeight: `${barH}px`,
                          fontFamily: FONT_BODY,
                          fontSize: 10,
                          fontWeight: 400,
                          color: C.black,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: bs.width - 16,
                        }}
                      >
                        {sub.name}
                      </span>
                    )}
                  </div>

                  {/* Subtask date metadata */}
                  <span
                    style={{
                      position: 'absolute',
                      left: bs.width + 8,
                      top: 0,
                      lineHeight: `${barH}px`,
                      fontFamily: FONT_BODY,
                      fontSize: 9,
                      fontWeight: 400,
                      color: C.dateMeta,
                      whiteSpace: 'nowrap',
                      letterSpacing: '0.02em',
                      opacity: 0.7,
                    }}
                  >
                    {formatDateShort(sub.startDate)} – {formatDateShort(sub.endDate)}
                  </span>
                </div>
              )
            })}

            {/* Markers — hairline red vertical rules with rotated labels */}
            {markers.map((marker) => {
              const x = dateToX(marker.date)
              if (x < 0 || x > totalWidth) return null
              return (
                <div
                  key={`mk-${marker.id}`}
                  style={{
                    position: 'absolute',
                    left: x,
                    top: 0,
                    height: chartHeight,
                    zIndex: 5,
                    pointerEvents: 'none',
                  }}
                >
                  {/* Hairline red rule */}
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      width: 1,
                      height: '100%',
                      background: C.red,
                    }}
                  />
                  {/* Rotated label */}
                  <div
                    style={{
                      position: 'absolute',
                      left: -4,
                      top: 8,
                      transformOrigin: 'left bottom',
                      transform: 'rotate(-90deg) translateX(-100%)',
                      fontFamily: FONT_BODY,
                      fontSize: 9,
                      fontWeight: 600,
                      color: C.red,
                      textTransform: 'uppercase',
                      letterSpacing: '0.12em',
                      whiteSpace: 'nowrap',
                      paddingBottom: 4,
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
                  background: C.red,
                  zIndex: 20,
                  pointerEvents: 'none',
                  transition: 'top 0.1s ease',
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
