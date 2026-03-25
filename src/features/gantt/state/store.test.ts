import { createStore } from "jotai";
import { describe, expect, it } from "vitest";

import {
  defaultMarkers,
  defaultTasks,
  defaultTimelineConfig,
} from "./sampleData";
import {
  markersAtom,
  redoStackAtom,
  tasksAtom,
  timelineConfigAtom,
  undoStackAtom,
} from "./store";

describe("gantt state store", () => {
  it("provides meaningful sample data defaults", () => {
    expect(defaultTasks.length).toBeGreaterThan(0);
    expect(defaultMarkers.length).toBeGreaterThan(0);
    expect(defaultTimelineConfig.zoomLevel).toBeGreaterThan(0);
  });

  it("initializes atoms with defaults and empty history", () => {
    const store = createStore();
    const tasks = store.get(tasksAtom);
    const markers = store.get(markersAtom);
    const timelineConfig = store.get(timelineConfigAtom);
    const undoStack = store.get(undoStackAtom);
    const redoStack = store.get(redoStackAtom);

    expect(tasks).toEqual(defaultTasks);
    expect(markers).toEqual(defaultMarkers);
    expect(timelineConfig).toEqual(defaultTimelineConfig);
    expect(undoStack).toEqual([]);
    expect(redoStack).toEqual([]);
  });
});
