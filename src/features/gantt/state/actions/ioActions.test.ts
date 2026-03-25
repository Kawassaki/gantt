import { createStore } from "jotai";
import { describe, expect, it } from "vitest";

import {
  markersAtom,
  redoStackAtom,
  tasksAtom,
  timelineConfigAtom,
  undoStackAtom,
} from "../store";

import { exportDataAtom, importDataAtom } from "./ioActions";

const task = {
  id: "t-1",
  name: "Task",
  startDate: "2026-01-01",
  endDate: "2026-01-02",
  color: "#111111",
  subtasks: [],
  progress: 0,
};

const marker = {
  id: "m-1",
  date: "2026-01-01",
  label: "Milestone",
  color: "#222222",
};

const timelineConfig = {
  startDate: "2026-01-01",
  endDate: "2026-02-01",
  zoomLevel: 40,
  viewMode: "week" as const,
  customDateRange: false,
};

describe("ioActions", () => {
  it("exports state as payload with version", () => {
    const store = createStore();
    store.set(tasksAtom, [task]);
    store.set(markersAtom, [marker]);
    store.set(timelineConfigAtom, timelineConfig);

    const exported = store.get(exportDataAtom);
    expect(exported.version).toBe(1);
    expect(exported.tasks).toEqual([task]);
    expect(exported.markers).toEqual([marker]);
    expect(exported.timelineConfig).toEqual(timelineConfig);
  });

  it("imports payload and resets history stacks", () => {
    const store = createStore();
    store.set(undoStackAtom, [{ tasks: [task], markers: [marker] }]);
    store.set(redoStackAtom, [{ tasks: [], markers: [] }]);

    store.set(importDataAtom, {
      version: 1,
      tasks: [{ ...task, id: "t-2" }],
      markers: [{ ...marker, id: "m-2" }],
      timelineConfig: { ...timelineConfig, zoomLevel: 55 },
    });

    expect(store.get(tasksAtom).map((value) => value.id)).toEqual(["t-2"]);
    expect(store.get(markersAtom).map((value) => value.id)).toEqual(["m-2"]);
    expect(store.get(timelineConfigAtom).zoomLevel).toBe(55);
    expect(store.get(undoStackAtom)).toEqual([]);
    expect(store.get(redoStackAtom)).toEqual([]);
  });
});
