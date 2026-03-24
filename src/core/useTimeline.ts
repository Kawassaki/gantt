import { useMemo, useCallback } from 'react'
import { useAtom } from 'jotai'
import { differenceInDays, addDays, parseISO, format, startOfWeek, startOfMonth, startOfYear } from 'date-fns'
import { timelineConfigAtom } from './store'

export interface ColumnHeader {
  label: string
  x: number
  width: number
  isWeekStart?: boolean
  isMonthStart?: boolean
}

export type TimelineViewMode = 'week' | 'month' | 'year'

export function useTimeline() {
  const [config, setConfig] = useAtom(timelineConfigAtom)
  const viewMode: TimelineViewMode = config.viewMode ?? 'week'
  const pxPerDay = useMemo(() => {
    if (viewMode === 'month') return Math.max(3, config.zoomLevel / 7)
    if (viewMode === 'year') return Math.max(1, config.zoomLevel / 30)
    return config.zoomLevel
  }, [config.zoomLevel, viewMode])

  const start = useMemo(() => parseISO(config.startDate), [config.startDate])
  const end = useMemo(() => parseISO(config.endDate), [config.endDate])
  const totalDays = useMemo(() => differenceInDays(end, start), [start, end])
  const totalWidth = totalDays * pxPerDay

  const dateToX = useCallback(
    (date: string) => differenceInDays(parseISO(date), start) * pxPerDay,
    [start, pxPerDay],
  )

  const xToDate = useCallback(
    (x: number) => format(addDays(start, Math.round(x / pxPerDay)), 'yyyy-MM-dd'),
    [start, pxPerDay],
  )

  const dayColumns = useMemo(() => {
    const cols: ColumnHeader[] = []
    for (let i = 0; i < totalDays; i++) {
      const day = addDays(start, i)
      const weekStart = startOfWeek(day, { weekStartsOn: 1 })
      const monthStart = startOfMonth(day)
      cols.push({
        label: format(day, 'd'),
        x: i * pxPerDay,
        width: pxPerDay,
        isWeekStart: day.getTime() === weekStart.getTime(),
        isMonthStart: day.getTime() === monthStart.getTime(),
      })
    }
    return cols
  }, [start, totalDays, pxPerDay])

  const weekHeaders = useMemo(() => {
    const weeks: { label: string; x: number; width: number }[] = []
    let i = 0
    while (i < totalDays) {
      const day = addDays(start, i)
      const wStart = startOfWeek(day, { weekStartsOn: 1 })
      const daysIntoWeek = differenceInDays(day, wStart)
      const remaining = Math.min(7 - daysIntoWeek, totalDays - i)
      weeks.push({
        label: format(day, 'MMM d'),
        x: i * pxPerDay,
        width: remaining * pxPerDay,
      })
      i += remaining
    }
    return weeks
  }, [start, totalDays, pxPerDay])

  const monthHeaders = useMemo(() => {
    const months: { label: string; x: number; width: number }[] = []
    let i = 0
    while (i < totalDays) {
      const day = addDays(start, i)
      const mStart = startOfMonth(day)
      const nextMonth = startOfMonth(addDays(mStart, 32))
      const daysUntilNext = differenceInDays(nextMonth, day)
      const span = Math.min(daysUntilNext, totalDays - i)
      months.push({
        label: format(day, 'MMMM yyyy'),
        x: i * pxPerDay,
        width: span * pxPerDay,
      })
      i += span
    }
    return months
  }, [start, totalDays, pxPerDay])

  const yearHeaders = useMemo(() => {
    const years: { label: string; x: number; width: number }[] = []
    let i = 0
    while (i < totalDays) {
      const day = addDays(start, i)
      const yStart = startOfYear(day)
      const nextYear = startOfYear(addDays(yStart, 370))
      const span = Math.min(differenceInDays(nextYear, day), totalDays - i)
      years.push({
        label: format(day, 'yyyy'),
        x: i * pxPerDay,
        width: span * pxPerDay,
      })
      i += span
    }
    return years
  }, [start, totalDays, pxPerDay])

  const decadeHeaders = useMemo(() => {
    const decades: { label: string; x: number; width: number }[] = []
    let i = 0
    while (i < totalDays) {
      const day = addDays(start, i)
      const year = Number(format(day, 'yyyy'))
      const decadeStartYear = Math.floor(year / 10) * 10
      const nextDecadeStart = new Date(decadeStartYear + 10, 0, 1)
      const span = Math.min(
        differenceInDays(nextDecadeStart, day),
        totalDays - i,
      )
      decades.push({
        label: `${decadeStartYear}s`,
        x: i * pxPerDay,
        width: span * pxPerDay,
      })
      i += span
    }
    return decades
  }, [start, totalDays, pxPerDay])

  const gridColumns = useMemo(() => {
    if (viewMode === 'month') {
      return monthHeaders.map((m, i) => ({
        label: m.label,
        x: m.x,
        width: m.width,
        isWeekStart: i > 0,
      }))
    }
    if (viewMode === 'year') {
      return yearHeaders.map((y, i) => ({
        label: y.label,
        x: y.x,
        width: y.width,
        isWeekStart: i > 0,
      }))
    }
    return dayColumns
  }, [viewMode, monthHeaders, yearHeaders, dayColumns])

  const topHeaders = useMemo(() => {
    if (viewMode === 'month') return yearHeaders
    if (viewMode === 'year') return decadeHeaders
    return monthHeaders
  }, [viewMode, yearHeaders, decadeHeaders, monthHeaders])

  const bottomHeaders = useMemo(() => {
    if (viewMode === 'month') return monthHeaders
    if (viewMode === 'year') return yearHeaders
    return weekHeaders
  }, [viewMode, monthHeaders, yearHeaders, weekHeaders])

  const setZoom = useCallback(
    (level: number) => {
      const clamped = Math.max(15, Math.min(120, level))
      setConfig({ ...config, zoomLevel: clamped })
    },
    [config, setConfig],
  )

  const setViewMode = useCallback(
    (mode: TimelineViewMode) => {
      setConfig({ ...config, viewMode: mode })
    },
    [config, setConfig],
  )

  const barStyle = useCallback(
    (startDate: string, endDate: string) => {
      const left = dateToX(startDate)
      const width = dateToX(endDate) - left
      return { left, width: Math.max(width, pxPerDay * 0.5) }
    },
    [dateToX, pxPerDay],
  )

  return {
    config,
    viewMode,
    pxPerDay,
    totalWidth,
    totalDays,
    dateToX,
    xToDate,
    dayColumns,
    gridColumns,
    topHeaders,
    bottomHeaders,
    weekHeaders,
    monthHeaders,
    setViewMode,
    setZoom,
    barStyle,
  }
}
