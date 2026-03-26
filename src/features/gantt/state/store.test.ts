import { createStore } from "jotai";
import { describe, expect, it } from "vitest";

import {
  INITIAL_TIMELINE_TAB_ID,
  defaultTimelineDataByTab,
  defaultTimelineTabs,
} from "./sampleData";
import {
  activeTabIdAtom,
  markersAtom,
  redoStackAtom,
  tabsAtom,
  tasksAtom,
  timelineDataByTabAtom,
  timelineConfigAtom,
  undoStackAtom,
} from "./store";

describe("gantt state store", () => {
  it("provides meaningful sample data defaults", () => {
    expect(defaultTimelineTabs.length).toBeGreaterThan(0);
    expect(
      defaultTimelineDataByTab[INITIAL_TIMELINE_TAB_ID].tasks.length
    ).toBeGreaterThan(0);
    expect(
      defaultTimelineDataByTab[INITIAL_TIMELINE_TAB_ID].timelineConfig.zoomLevel
    ).toBeGreaterThan(0);
  });

  it("initializes atoms with defaults and empty history", () => {
    const store = createStore();
    const tabs = store.get(tabsAtom);
    const activeTabId = store.get(activeTabIdAtom);
    const timelineDataByTab = store.get(timelineDataByTabAtom);
    const tasks = store.get(tasksAtom);
    const markers = store.get(markersAtom);
    const timelineConfig = store.get(timelineConfigAtom);
    const undoStack = store.get(undoStackAtom);
    const redoStack = store.get(redoStackAtom);

    expect(tabs).toEqual(defaultTimelineTabs);
    expect(activeTabId).toBe(INITIAL_TIMELINE_TAB_ID);
    expect(timelineDataByTab).toEqual(defaultTimelineDataByTab);
    expect(tasks).toEqual(
      defaultTimelineDataByTab[INITIAL_TIMELINE_TAB_ID].tasks
    );
    expect(markers).toEqual(
      defaultTimelineDataByTab[INITIAL_TIMELINE_TAB_ID].markers
    );
    expect(timelineConfig).toEqual(
      defaultTimelineDataByTab[INITIAL_TIMELINE_TAB_ID].timelineConfig
    );
    expect(undoStack).toEqual([]);
    expect(redoStack).toEqual([]);
  });

  it("guards against invalid tab mutations and hydrates missing tab data", () => {
    const store = createStore();

    store.set(tabsAtom, []);
    expect(store.get(tabsAtom)).toEqual(defaultTimelineTabs);

    const originalActiveTab = store.get(activeTabIdAtom);
    store.set(activeTabIdAtom, "missing-tab");
    expect(store.get(activeTabIdAtom)).toBe(originalActiveTab);

    const existingTabs = store.get(tabsAtom);
    store.set(timelineDataByTabAtom, {});
    const hydratedData = store.get(timelineDataByTabAtom);
    expect(hydratedData[existingTabs[0].id]).toBeDefined();
  });

  it("falls back active tab when current active id is no longer present", () => {
    const store = createStore();

    store.set(tabsAtom, [
      { id: "tab-custom", title: "Custom", color: "#123456" },
    ]);

    expect(store.get(activeTabIdAtom)).toBe("tab-custom");
  });
});
