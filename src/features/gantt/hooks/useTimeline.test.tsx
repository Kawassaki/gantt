import { act, renderHook } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { timelineConfigAtom } from "../state/store";

import { useTimeline } from "./useTimeline";

describe("useTimeline", () => {
  it("exposes computed values and helpers", () => {
    const store = createStore();
    store.set(timelineConfigAtom, {
      startDate: "2026-01-01",
      endDate: "2026-01-11",
      zoomLevel: 20,
      viewMode: "week",
      customDateRange: false,
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );
    const { result } = renderHook(() => useTimeline(), { wrapper });

    expect(result.current.totalDays).toBe(10);
    expect(result.current.totalWidth).toBe(200);
    expect(result.current.dateToX("2026-01-06")).toBe(100);
    expect(result.current.xToDate(100)).toBe("2026-01-06");
    expect(result.current.dayColumns.length).toBe(10);
    expect(result.current.topHeaders.length).toBeGreaterThan(0);
    expect(result.current.bottomHeaders.length).toBeGreaterThan(0);
    expect(result.current.barStyle("2026-01-01", "2026-01-03")).toEqual({
      left: 0,
      width: 40,
    });
  });

  it("clamps zoom, switches view mode, and normalizes date range", () => {
    const store = createStore();
    store.set(timelineConfigAtom, {
      startDate: "2026-01-01",
      endDate: "2026-01-11",
      zoomLevel: 20,
      viewMode: "week",
      customDateRange: false,
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );
    const { result } = renderHook(() => useTimeline(), { wrapper });

    act(() => {
      result.current.setZoom(999);
    });
    expect(store.get(timelineConfigAtom).zoomLevel).toBe(120);

    act(() => {
      result.current.setZoom(1);
    });
    expect(store.get(timelineConfigAtom).zoomLevel).toBe(15);

    act(() => {
      result.current.setViewMode("month");
    });
    expect(store.get(timelineConfigAtom).viewMode).toBe("month");

    act(() => {
      result.current.setDateRange("2026-03-10", "2026-03-01");
    });
    expect(store.get(timelineConfigAtom).startDate).toBe("2026-03-01");
    expect(store.get(timelineConfigAtom).endDate).toBe("2026-03-10");
    expect(store.get(timelineConfigAtom).customDateRange).toBe(true);
  });

  it("falls back to today when given invalid date range values", () => {
    const store = createStore();
    store.set(timelineConfigAtom, {
      startDate: "2026-01-01",
      endDate: "2026-01-11",
      zoomLevel: 20,
      viewMode: "year",
      customDateRange: false,
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );
    const { result } = renderHook(() => useTimeline(), { wrapper });

    act(() => {
      result.current.setDateRange("bad", "bad");
    });

    const currentConfig = store.get(timelineConfigAtom);
    expect(currentConfig.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(currentConfig.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("defaults view mode to week when unset", () => {
    const store = createStore();
    store.set(timelineConfigAtom, {
      startDate: "2026-01-01",
      endDate: "2026-01-11",
      zoomLevel: 20,
      customDateRange: false,
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );
    const { result } = renderHook(() => useTimeline(), { wrapper });

    expect(result.current.viewMode).toBe("week");
  });

  it("uses day mode header branches", () => {
    const store = createStore();
    store.set(timelineConfigAtom, {
      startDate: "2026-01-01",
      endDate: "2026-01-11",
      zoomLevel: 20,
      viewMode: "day",
      customDateRange: false,
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );
    const { result } = renderHook(() => useTimeline(), { wrapper });

    expect(result.current.topHeaders.length).toBe(
      result.current.weekHeaders.length
    );
    expect(result.current.bottomHeaders.length).toBe(
      result.current.dayColumns.length
    );
  });
});
