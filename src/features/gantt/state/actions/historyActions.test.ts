import { createStore } from "jotai";
import { describe, expect, it } from "vitest";

import { markersAtom, redoStackAtom, tasksAtom, undoStackAtom } from "../store";

import { pushUndoAtom, redoAtom, undoAtom } from "./historyActions";

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
  label: "Marker",
  color: "#222222",
};

describe("historyActions", () => {
  it("pushes undo snapshot and clears redo", () => {
    const store = createStore();
    store.set(tasksAtom, [task]);
    store.set(markersAtom, [marker]);
    store.set(redoStackAtom, [{ tasks: [], markers: [] }]);

    store.set(pushUndoAtom);

    expect(store.get(undoStackAtom)).toEqual([
      { tasks: [task], markers: [marker] },
    ]);
    expect(store.get(redoStackAtom)).toEqual([]);
  });

  it("undo does nothing with empty stack", () => {
    const store = createStore();
    store.set(tasksAtom, [task]);

    store.set(undoAtom);

    expect(store.get(tasksAtom)).toEqual([task]);
    expect(store.get(redoStackAtom)).toEqual([]);
  });

  it("undo restores previous snapshot and records redo", () => {
    const store = createStore();
    const nextTask = { ...task, id: "t-2" };
    store.set(tasksAtom, [nextTask]);
    store.set(markersAtom, []);
    store.set(undoStackAtom, [{ tasks: [task], markers: [marker] }]);

    store.set(undoAtom);

    expect(store.get(tasksAtom)).toEqual([task]);
    expect(store.get(markersAtom)).toEqual([marker]);
    expect(store.get(undoStackAtom)).toEqual([]);
    expect(store.get(redoStackAtom)).toEqual([
      { tasks: [nextTask], markers: [] },
    ]);
  });

  it("redo does nothing with empty stack", () => {
    const store = createStore();
    store.set(tasksAtom, [task]);

    store.set(redoAtom);

    expect(store.get(tasksAtom)).toEqual([task]);
    expect(store.get(undoStackAtom)).toEqual([]);
  });

  it("redo reapplies snapshot and appends undo snapshot", () => {
    const store = createStore();
    const previousTask = { ...task, id: "t-prev" };
    const redoTask = { ...task, id: "t-redo" };
    store.set(tasksAtom, [previousTask]);
    store.set(markersAtom, []);
    store.set(redoStackAtom, [{ tasks: [redoTask], markers: [marker] }]);

    store.set(redoAtom);

    expect(store.get(tasksAtom)).toEqual([redoTask]);
    expect(store.get(markersAtom)).toEqual([marker]);
    expect(store.get(redoStackAtom)).toEqual([]);
    expect(store.get(undoStackAtom)).toEqual([
      { tasks: [previousTask], markers: [] },
    ]);
  });
});
