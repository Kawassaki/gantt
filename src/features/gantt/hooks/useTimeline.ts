import {
  addDays,
  differenceInDays,
  format,
  isValid,
  parseISO,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "date-fns";
import { useAtom } from "jotai";
import { useMemo, useCallback } from "react";

import { MAX_ZOOM_LEVEL, MIN_ZOOM_LEVEL } from "../constants";
import { timelineConfigAtom } from "../state/store";
import type { TimelineViewMode } from "../types";

export interface ColumnHeader {
  label: string;
  x: number;
  width: number;
  isWeekStart?: boolean;
  isMonthStart?: boolean;
}

const parseTimelineDate = (value: string, fallbackDate: Date): Date => {
  const parsedDate = parseISO(value);
  return isValid(parsedDate) ? parsedDate : fallbackDate;
};

const sortDateRange = (firstDate: Date, secondDate: Date): [Date, Date] =>
  firstDate.getTime() <= secondDate.getTime()
    ? [firstDate, secondDate]
    : [secondDate, firstDate];

export const useTimeline = () => {
  const [timelineConfig, setTimelineConfig] = useAtom(timelineConfigAtom);
  const viewMode: TimelineViewMode = timelineConfig.viewMode ?? "week";
  const pixelsPerDay = useMemo(
    () => timelineConfig.zoomLevel,
    [timelineConfig.zoomLevel]
  );

  const startDate = useMemo(
    () => parseISO(timelineConfig.startDate),
    [timelineConfig.startDate]
  );
  const endDate = useMemo(
    () => parseISO(timelineConfig.endDate),
    [timelineConfig.endDate]
  );
  const totalDays = useMemo(
    () => differenceInDays(endDate, startDate),
    [endDate, startDate]
  );
  const totalWidth = totalDays * pixelsPerDay;

  const dateToX = useCallback(
    (date: string): number =>
      differenceInDays(parseISO(date), startDate) * pixelsPerDay,
    [pixelsPerDay, startDate]
  );

  const xToDate = useCallback(
    (x: number): string =>
      format(addDays(startDate, Math.round(x / pixelsPerDay)), "yyyy-MM-dd"),
    [pixelsPerDay, startDate]
  );

  const dayColumns = useMemo(() => {
    const columns: ColumnHeader[] = [];
    for (let dayIndex = 0; dayIndex < totalDays; dayIndex += 1) {
      const day = addDays(startDate, dayIndex);
      const weekStart = startOfWeek(day, { weekStartsOn: 1 });
      const monthStart = startOfMonth(day);
      columns.push({
        label: format(day, "d"),
        x: dayIndex * pixelsPerDay,
        width: pixelsPerDay,
        isWeekStart: day.getTime() === weekStart.getTime(),
        isMonthStart: day.getTime() === monthStart.getTime(),
      });
    }
    return columns;
  }, [pixelsPerDay, startDate, totalDays]);

  const weekHeaders = useMemo(() => {
    const weeks: Array<{ label: string; x: number; width: number }> = [];
    let dayIndex = 0;
    while (dayIndex < totalDays) {
      const day = addDays(startDate, dayIndex);
      const weekStart = startOfWeek(day, { weekStartsOn: 1 });
      const daysIntoWeek = differenceInDays(day, weekStart);
      const remainingDaysInWeek = Math.min(
        7 - daysIntoWeek,
        totalDays - dayIndex
      );
      weeks.push({
        label: format(day, "MMM d"),
        x: dayIndex * pixelsPerDay,
        width: remainingDaysInWeek * pixelsPerDay,
      });
      dayIndex += remainingDaysInWeek;
    }
    return weeks;
  }, [pixelsPerDay, startDate, totalDays]);

  const monthHeaders = useMemo(() => {
    const months: Array<{ label: string; x: number; width: number }> = [];
    let dayIndex = 0;
    while (dayIndex < totalDays) {
      const day = addDays(startDate, dayIndex);
      const monthStart = startOfMonth(day);
      const nextMonthStart = startOfMonth(addDays(monthStart, 32));
      const daysUntilNextMonth = differenceInDays(nextMonthStart, day);
      const span = Math.min(daysUntilNextMonth, totalDays - dayIndex);
      months.push({
        label: format(day, "MMMM yyyy"),
        x: dayIndex * pixelsPerDay,
        width: span * pixelsPerDay,
      });
      dayIndex += span;
    }
    return months;
  }, [pixelsPerDay, startDate, totalDays]);

  const yearHeaders = useMemo(() => {
    const years: Array<{ label: string; x: number; width: number }> = [];
    let dayIndex = 0;
    while (dayIndex < totalDays) {
      const day = addDays(startDate, dayIndex);
      const yearStart = startOfYear(day);
      const nextYearStart = startOfYear(addDays(yearStart, 370));
      const span = Math.min(
        differenceInDays(nextYearStart, day),
        totalDays - dayIndex
      );
      years.push({
        label: format(day, "yyyy"),
        x: dayIndex * pixelsPerDay,
        width: span * pixelsPerDay,
      });
      dayIndex += span;
    }
    return years;
  }, [pixelsPerDay, startDate, totalDays]);

  const decadeHeaders = useMemo(() => {
    const decades: Array<{ label: string; x: number; width: number }> = [];
    let dayIndex = 0;
    while (dayIndex < totalDays) {
      const day = addDays(startDate, dayIndex);
      const year = Number(format(day, "yyyy"));
      const decadeStartYear = Math.floor(year / 10) * 10;
      const nextDecadeStart = new Date(decadeStartYear + 10, 0, 1);
      const span = Math.min(
        differenceInDays(nextDecadeStart, day),
        totalDays - dayIndex
      );
      decades.push({
        label: `${decadeStartYear}s`,
        x: dayIndex * pixelsPerDay,
        width: span * pixelsPerDay,
      });
      dayIndex += span;
    }
    return decades;
  }, [pixelsPerDay, startDate, totalDays]);

  const gridColumns = useMemo(() => {
    if (viewMode === "month") {
      return monthHeaders.map((monthHeader, index) => ({
        label: monthHeader.label,
        x: monthHeader.x,
        width: monthHeader.width,
        isWeekStart: index > 0,
      }));
    }
    if (viewMode === "year") {
      return yearHeaders.map((yearHeader, index) => ({
        label: yearHeader.label,
        x: yearHeader.x,
        width: yearHeader.width,
        isWeekStart: index > 0,
      }));
    }
    return dayColumns;
  }, [dayColumns, monthHeaders, viewMode, yearHeaders]);

  const topHeaders = useMemo(() => {
    if (viewMode === "day") return weekHeaders;
    if (viewMode === "month") return yearHeaders;
    if (viewMode === "year") return decadeHeaders;
    return monthHeaders;
  }, [decadeHeaders, monthHeaders, viewMode, weekHeaders, yearHeaders]);

  const bottomHeaders = useMemo(() => {
    if (viewMode === "day") return dayColumns;
    if (viewMode === "month") return monthHeaders;
    if (viewMode === "year") return yearHeaders;
    return weekHeaders;
  }, [dayColumns, monthHeaders, viewMode, weekHeaders, yearHeaders]);

  const setZoom = useCallback(
    (level: number) => {
      const clampedZoom = Math.max(
        MIN_ZOOM_LEVEL,
        Math.min(MAX_ZOOM_LEVEL, level)
      );
      setTimelineConfig({ ...timelineConfig, zoomLevel: clampedZoom });
    },
    [setTimelineConfig, timelineConfig]
  );

  const setViewMode = useCallback(
    (mode: TimelineViewMode) => {
      setTimelineConfig((currentConfig) => ({
        ...currentConfig,
        viewMode: mode,
      }));
    },
    [setTimelineConfig]
  );

  const setDateRange = useCallback(
    (nextStartDate: string, nextEndDate: string) => {
      setTimelineConfig((currentConfig) => {
        const today = new Date();
        const parsedStartDate = parseTimelineDate(nextStartDate, today);
        const parsedEndDate = parseTimelineDate(nextEndDate, today);
        const [safeStartDate, safeEndDate] = sortDateRange(
          parsedStartDate,
          parsedEndDate
        );

        return {
          ...currentConfig,
          startDate: format(safeStartDate, "yyyy-MM-dd"),
          endDate: format(safeEndDate, "yyyy-MM-dd"),
          customDateRange: true,
        };
      });
    },
    [setTimelineConfig]
  );

  const barStyle = useCallback(
    (barStartDate: string, barEndDate: string) => {
      const left = dateToX(barStartDate);
      const width = dateToX(barEndDate) - left;
      return { left, width: Math.max(width, pixelsPerDay * 0.5) };
    },
    [dateToX, pixelsPerDay]
  );

  return {
    config: timelineConfig,
    viewMode,
    pxPerDay: pixelsPerDay,
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
    setDateRange,
    setZoom,
    barStyle,
  };
};
