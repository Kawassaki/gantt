import { useMemo, useCallback } from 'react'
import { useAtom } from 'jotai'
import { differenceInDays, addDays, parseISO, format, startOfWeek, startOfMonth } from 'date-fns'
import { timelineConfigAtom } from './store'

export interface ColumnHeader {
  label: string
  x: number
  width: number
  isWeekStart?: boolean
  isMonthStart?: boolean
}

export function useTimeline() {
  const [config, setConfig] = useAtom(timelineConfigAtom)
  const pxPerDay = config.zoomLevel

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

  const setZoom = useCallback(
    (level: number) => {
      const clamped = Math.max(15, Math.min(120, level))
      setConfig({ ...config, zoomLevel: clamped })
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
    pxPerDay,
    totalWidth,
    totalDays,
    dateToX,
    xToDate,
    dayColumns,
    weekHeaders,
    monthHeaders,
    setZoom,
    barStyle,
  }
}
