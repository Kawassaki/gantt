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
const SUBTASK_ROW_H = 36
const LEFT_PANEL_W = 240
const HEADER_H = 72

const C = {
  cream: '#faf5eb',
  terracotta: '#c4613a',
  sage: '#7d9a6f',
  charcoal: '#2d2a26',
  ivory: '#f5edd8',
  ruleLight: 'rgba(45,42,38,0.07)',
  ruleVert: 'rgba(45,42,38,0.04)',
  barShadow: '0 2px 8px rgba(45,42,38,0.15)',
}

function rowHeight(task: Task) {
  return TASK_ROW_H + task.subtasks.length * SUBTASK_ROW_H
}

function totalHeight(tasks: Task[]) {
  return tasks.reduce((h, t) => h + rowHeight(t), 0)
}

function darkenHex(hex: string, amount = 0.18): string {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, ((n >> 16) & 0xff) - Math.round(255 * amount))
  const g = Math.max(0, ((n >> 8) & 0xff) - Math.round(255 * amount))
  const b = Math.max(0, (n & 0xff) - Math.round(255 * amount))
  return `rgb(${r},${g},${b})`
}

const GrainFilter = () => (
  <svg style={{ position: 'absolute', width: 0, height: 0 }} aria-hidden="true">
    <defs>
      <filter id="earth-grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
        <feBlend in="SourceGraphic" mode="multiply" />
      </filter>
      <filter id="earth-paper-tex">
        <feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="2" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
        <feBlend in="SourceGraphic" mode="soft-light" />
      </filter>
    </defs>
  </svg>
)

const GrainOverlay = () => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      filter: 'url(#earth-grain)',
      opacity: 0.045,
      pointerEvents: 'none',
      zIndex: 50,
    }}
  />
)

function WavyConnector({ parentLeft, parentWidth, childLeft, childWidth, parentBottom, childTop }: {
  parentLeft: number; parentWidth: number; childLeft: number; childWidth: number
  parentBottom: number; childTop: number
}) {
  const x1 = parentLeft + parentWidth * 0.15
  const y1 = parentBottom
  const x2 = childLeft + 8
  const y2 = childTop
  const midY = (y1 + y2) / 2
  const waveAmp = 4
  return (
    <path
      d={`M${x1},${y1} C${x1 + waveAmp},${midY - 3} ${x2 - waveAmp},${midY + 3} ${x2},${y2}`}
      fill="none"
      stroke={C.charcoal}
      strokeWidth={1.5}
      strokeDasharray="4 3"
      opacity={0.3}
    />
  )
}

function FlagPennant({ x, color }: { x: number; color: string }) {
  return (
    <svg
      width="14"
      height="16"
      viewBox="0 0 14 16"
      style={{ position: 'absolute', left: x - 7, top: 2, pointerEvents: 'none' }}
    >
      <polygon points="2,0 14,5 2,10" fill={color} opacity={0.85} />
      <line x1="2" y1="0" x2="2" y2="16" stroke={color} strokeWidth="1.5" />
    </svg>
  )
}

const globalStyles = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..900&family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');

.earth-bar {
  transition: transform 0.18s cubic-bezier(.4,0,.2,1), box-shadow 0.18s ease;
}
.earth-bar:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 14px rgba(45,42,38,0.22) !important;
}
.earth-subtask-bar {
  transition: transform 0.18s cubic-bezier(.4,0,.2,1), box-shadow 0.18s ease;
}
.earth-subtask-bar:hover {
  transform: scale(1.03);
  box-shadow: 0 3px 10px rgba(45,42,38,0.18) !important;
}
.earth-row {
  transition: background-color 0.15s ease;
}
.earth-row:hover {
  background-color: rgba(196,97,58,0.04);
}
.earth-toolbar-btn {
  background: rgba(45,42,38,0.06);
  border: 1px solid rgba(45,42,38,0.1);
  color: ${C.charcoal};
  transition: all 0.15s ease;
}
.earth-toolbar-btn:hover {
  background: rgba(196,97,58,0.12);
  border-color: rgba(196,97,58,0.25);
}
.earth-toolbar-btn:disabled {
  opacity: 0.35;
}
.earth-title {
  font-family: 'Fraunces', serif !important;
  font-style: italic;
  color: ${C.terracotta};
}
`

export default function GanttEarth() {
  const tasks = useAtomValue(tasksAtom)
  const markers = useAtomValue(markersAtom)
  const {
    pxPerDay, totalWidth, dayColumns, weekHeaders, monthHeaders, barStyle, dateToX,
  } = useTimeline()
  const leftRef = useRef<HTMLDivElement>(null)
  const rightRef = useRef<HTMLDivElement>(null)
  const headerRightRef = useRef<HTMLDivElement>(null)
  const { isDragging, startDrag, onPointerMove, endDrag, getCursor, dropIndicatorY } = useGanttDrag(
    pxPerDay,
    { taskRowH: TASK_ROW_H, subtaskRowH: SUBTASK_ROW_H },
    rightRef,
  )
  const addTask = useSetAtom(addNewTaskAtom)
  const addSubtask = useSetAtom(addNewSubtaskAtom)
  useKeyboardShortcuts()

  const syncScroll = useCallback((source: 'left' | 'right') => {
    const l = leftRef.current
    const r = rightRef.current
    const h = headerRightRef.current
    if (!l || !r) return
    if (source === 'left') {
      r.scrollTop = l.scrollTop
    } else {
      l.scrollTop = r.scrollTop
      if (h) h.scrollLeft = r.scrollLeft
    }
  }, [])

  const chartHeight = totalHeight(tasks)

  const rowOffsets = useMemo(() => {
    const offsets: number[] = []
    let y = 0
    for (const t of tasks) {
      offsets.push(y)
      y += rowHeight(t)
    }
    return offsets
  }, [tasks])

  return (
    <div
      style={{
        fontFamily: "'DM Sans', sans-serif",
        background: C.cream,
        color: C.charcoal,
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <style>{globalStyles}</style>
      <GrainFilter />
      <GrainOverlay />

      {/* Toolbar */}
      <div
        style={{
          padding: '12px 20px',
          borderBottom: `1px solid ${C.ruleLight}`,
          background: 'rgba(250,245,235,0.92)',
          backdropFilter: 'blur(8px)',
          zIndex: 30,
          position: 'relative',
        }}
      >
        <GanttToolbar
          className="flex-wrap gap-2"
          buttonClass="earth-toolbar-btn"
          title="Warm Earth"
          titleClass="text-xl tracking-tight earth-title"
          accentColor={C.terracotta}
        />
      </div>

      {/* Header */}
      <div style={{ display: 'flex', flexShrink: 0, borderBottom: `1px solid ${C.ruleLight}`, zIndex: 20, position: 'relative' }}>
        {/* Left header */}
        <div
          style={{
            width: LEFT_PANEL_W,
            minWidth: LEFT_PANEL_W,
            height: HEADER_H,
            display: 'flex',
            alignItems: 'flex-end',
            padding: '0 20px 10px',
            borderRight: `1px solid ${C.ruleLight}`,
            background: C.cream,
          }}
        >
          <span
            style={{
              fontFamily: "'Fraunces', serif",
              fontStyle: 'italic',
              fontWeight: 500,
              fontSize: 13,
              opacity: 0.45,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            Tasks
          </span>
        </div>
        {/* Right header */}
        <div
          ref={headerRightRef}
          style={{ flex: 1, overflow: 'hidden', height: HEADER_H, background: C.cream }}
        >
          <div style={{ width: totalWidth, height: HEADER_H, position: 'relative' }}>
            {/* Month headers */}
            {monthHeaders.map((m, i) => (
              <div
                key={`m${i}`}
                style={{
                  position: 'absolute',
                  left: m.x,
                  top: 0,
                  width: m.width,
                  height: HEADER_H / 2,
                  display: 'flex',
                  alignItems: 'center',
                  paddingLeft: 14,
                  fontFamily: "'Fraunces', serif",
                  fontWeight: 600,
                  fontSize: 13,
                  color: C.charcoal,
                  opacity: 0.7,
                  borderLeft: i > 0 ? `1px solid ${C.ruleLight}` : 'none',
                }}
              >
                {m.label}
              </div>
            ))}
            {/* Week headers */}
            {weekHeaders.map((w, i) => (
              <div
                key={`w${i}`}
                style={{
                  position: 'absolute',
                  left: w.x,
                  top: HEADER_H / 2,
                  width: w.width,
                  height: HEADER_H / 2,
                  display: 'flex',
                  alignItems: 'center',
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
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        {/* Left task names */}
        <div
          ref={leftRef}
          onScroll={() => syncScroll('left')}
          style={{
            width: LEFT_PANEL_W,
            minWidth: LEFT_PANEL_W,
            overflowY: 'auto',
            overflowX: 'hidden',
            borderRight: `1px solid ${C.ruleLight}`,
            background: C.cream,
            scrollbarWidth: 'none',
          }}
        >
          <div style={{ height: chartHeight }}>
            {tasks.map((task, ti) => {
              const y = rowOffsets[ti]
              return (
                <div key={task.id} style={{ position: 'relative' }}>
                  {/* Task name row */}
                  <div
                    className="earth-row"
                    style={{
                      height: TASK_ROW_H,
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 20px',
                      borderBottom: `1px solid ${C.ruleLight}`,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'Fraunces', serif",
                        fontStyle: 'italic',
                        fontWeight: 500,
                        fontSize: 14,
                        color: C.charcoal,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: LEFT_PANEL_W - 40,
                      }}
                    >
                      {task.name}
                    </span>
                    <button
                      onClick={() => addSubtask(task.id)}
                      style={{
                        marginLeft: 'auto',
                        flexShrink: 0,
                        width: 22,
                        height: 22,
                        borderRadius: 999,
                        border: `1px solid ${C.ruleLight}`,
                        background: 'transparent',
                        color: C.terracotta,
                        fontSize: 15,
                        lineHeight: '20px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s ease',
                        opacity: 0.4,
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = 'rgba(196,97,58,0.08)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.4'; e.currentTarget.style.background = 'transparent'; }}
                      title="Add subtask"
                    >
                      +
                    </button>
                  </div>
                  {/* Subtask names */}
                  {task.subtasks.map((sub) => (
                    <div
                      key={sub.id}
                      className="earth-row"
                      style={{
                        height: SUBTASK_ROW_H,
                        display: 'flex',
                        alignItems: 'center',
                        paddingLeft: 40,
                        paddingRight: 20,
                        borderBottom: `1px solid ${C.ruleLight}`,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          color: C.charcoal,
                          opacity: 0.55,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: LEFT_PANEL_W - 70,
                        }}
                      >
                        {sub.name}
                      </span>
                    </div>
                  ))}
                </div>
              )
            })}
            <div
              style={{
                height: TASK_ROW_H,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderBottom: `1px solid ${C.ruleLight}`,
              }}
            >
              <button
                onClick={() => addTask()}
                style={{
                  background: 'transparent',
                  border: `1px dashed rgba(45,42,38,0.15)`,
                  borderRadius: 999,
                  color: C.terracotta,
                  fontFamily: "'Fraunces', serif",
                  fontStyle: 'italic',
                  fontSize: 13,
                  padding: '6px 20px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  opacity: 0.5,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = 'rgba(196,97,58,0.06)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.5'; e.currentTarget.style.background = 'transparent'; }}
              >
                + Add Task
              </button>
            </div>
          </div>
        </div>

        {/* Right chart area */}
        <div
          ref={rightRef}
          onScroll={() => syncScroll('right')}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          style={{
            flex: 1,
            overflow: 'auto',
            position: 'relative',
            cursor: isDragging ? 'grabbing' : 'default',
          }}
        >
          <div style={{ width: totalWidth, height: chartHeight, position: 'relative' }}>
            {/* Vertical day separators */}
            {dayColumns.map((col, i) => (
              <div
                key={`dc${i}`}
                style={{
                  position: 'absolute',
                  left: col.x,
                  top: 0,
                  width: 1,
                  height: chartHeight,
                  background: col.isWeekStart ? C.ruleLight : C.ruleVert,
                }}
              />
            ))}

            {/* Horizontal ruled lines per row */}
            {tasks.map((task, ti) => {
              const y = rowOffsets[ti]
              const lines = []
              lines.push(
                <div
                  key={`rl-${task.id}`}
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: y + TASK_ROW_H - 1,
                    width: totalWidth,
                    height: 1,
                    background: C.ruleLight,
                  }}
                />,
              )
              task.subtasks.forEach((sub, si) => {
                lines.push(
                  <div
                    key={`rl-${sub.id}`}
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: y + TASK_ROW_H + (si + 1) * SUBTASK_ROW_H - 1,
                      width: totalWidth,
                      height: 1,
                      background: C.ruleLight,
                    }}
                  />,
                )
              })
              return lines
            })}

            {/* Connector SVG layer */}
            <svg
              style={{ position: 'absolute', inset: 0, width: totalWidth, height: chartHeight, pointerEvents: 'none', zIndex: 5 }}
            >
              {tasks.map((task, ti) => {
                const y = rowOffsets[ti]
                const parentBar = barStyle(task.startDate, task.endDate)
                return task.subtasks.map((sub, si) => {
                  const childBar = barStyle(sub.startDate, sub.endDate)
                  return (
                    <WavyConnector
                      key={`conn-${sub.id}`}
                      parentLeft={parentBar.left}
                      parentWidth={parentBar.width}
                      childLeft={childBar.left}
                      childWidth={childBar.width}
                      parentBottom={y + TASK_ROW_H - 6}
                      childTop={y + TASK_ROW_H + si * SUBTASK_ROW_H + SUBTASK_ROW_H / 2}
                    />
                  )
                })
              })}
            </svg>

            {/* Markers */}
            {markers.map((marker) => {
              const x = dateToX(marker.date)
              return (
                <div key={marker.id} style={{ position: 'absolute', left: x, top: 0, height: chartHeight, zIndex: 8 }}>
                  <div
                    style={{
                      position: 'absolute',
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
                      position: 'absolute',
                      left: 10,
                      top: 4,
                      fontSize: 10,
                      fontWeight: 600,
                      color: marker.color || C.terracotta,
                      whiteSpace: 'nowrap',
                      fontFamily: "'DM Sans', sans-serif",
                      letterSpacing: '0.02em',
                    }}
                  >
                    {marker.label}
                  </div>
                </div>
              )
            })}

            {/* Task bars */}
            {tasks.map((task, ti) => {
              const y = rowOffsets[ti]
              const bs = barStyle(task.startDate, task.endDate)
              const barH = 30
              const barTop = y + (TASK_ROW_H - barH) / 2

              return (
                <div key={task.id}>
                  {/* Parent bar */}
                  <div
                    className="earth-bar"
                    onPointerDown={(e) => startDrag(e, task.id)}
                    onPointerMove={(e) => {
                      if (!isDragging) {
                        const el = e.currentTarget as HTMLElement
                        el.style.cursor = getCursor(e, el)
                      }
                    }}
                    style={{
                      position: 'absolute',
                      left: bs.left,
                      top: barTop,
                      width: bs.width,
                      height: barH,
                      borderRadius: 999,
                      background: task.color || C.terracotta,
                      boxShadow: C.barShadow,
                      zIndex: 10,
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {/* Paper texture overlay */}
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        filter: 'url(#earth-paper-tex)',
                        opacity: 0.08,
                        borderRadius: 999,
                        pointerEvents: 'none',
                      }}
                    />
                    {/* Progress fill */}
                    {task.progress > 0 && (
                      <div
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          height: '100%',
                          width: `${Math.min(task.progress, 100)}%`,
                          borderRadius: 999,
                          background: darkenHex(task.color || C.terracotta, 0.12),
                          opacity: 0.4,
                          pointerEvents: 'none',
                        }}
                      />
                    )}
                    {/* Label */}
                    <span
                      style={{
                        position: 'relative',
                        zIndex: 2,
                        paddingLeft: 14,
                        paddingRight: 14,
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#fff',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        textShadow: '0 1px 3px rgba(0,0,0,0.2)',
                        fontFamily: "'DM Sans', sans-serif",
                        letterSpacing: '0.01em',
                      }}
                    >
                      {task.name}
                    </span>
                  </div>

                  {/* Subtask bars */}
                  {task.subtasks.map((sub, si) => {
                    const sbs = barStyle(sub.startDate, sub.endDate)
                    const subBarH = 22
                    const subY = y + TASK_ROW_H + si * SUBTASK_ROW_H + (SUBTASK_ROW_H - subBarH) / 2

                    return (
                      <div
                        key={sub.id}
                        className="earth-subtask-bar"
                        onPointerDown={(e) => startDrag(e, task.id, sub.id)}
                        onPointerMove={(e) => {
                          if (!isDragging) {
                            const el = e.currentTarget as HTMLElement
                            el.style.cursor = getCursor(e, el)
                          }
                        }}
                        style={{
                          position: 'absolute',
                          left: sbs.left,
                          top: subY,
                          width: sbs.width,
                          height: subBarH,
                          borderRadius: 999,
                          background: sub.color || C.sage,
                          boxShadow: '0 1px 5px rgba(45,42,38,0.1)',
                          zIndex: 10,
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            filter: 'url(#earth-paper-tex)',
                            opacity: 0.06,
                            borderRadius: 999,
                            pointerEvents: 'none',
                          }}
                        />
                        <span
                          style={{
                            position: 'relative',
                            zIndex: 2,
                            paddingLeft: 10,
                            paddingRight: 10,
                            fontSize: 10,
                            fontWeight: 500,
                            color: '#fff',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            textShadow: '0 1px 2px rgba(0,0,0,0.15)',
                            fontFamily: "'DM Sans', sans-serif",
                          }}
                        >
                          {sub.name}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )
            })}
            {dropIndicatorY !== null && (
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: dropIndicatorY,
                  width: '100%',
                  height: 2,
                  background: C.terracotta,
                  boxShadow: `0 0 6px rgba(196,97,58,0.3)`,
                  zIndex: 20,
                  pointerEvents: 'none',
                  borderRadius: 1,
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
