import { renderHook } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import {
  markersAtom,
  redoStackAtom,
  tasksAtom,
  undoStackAtom,
} from "../state/store";

import { usePushUndoSnapshot } from "./useUndoSnapshot";

describe("usePushUndoSnapshot", () => {
  it("pushes current tasks/markers and clears redo stack", () => {
    const store = createStore();
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
    store.set(tasksAtom, [task]);
    store.set(markersAtom, [marker]);
    store.set(redoStackAtom, [{ tasks: [], markers: [] }]);

    const wrapper = ({ children }: { children: ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );
    const { result } = renderHook(() => usePushUndoSnapshot(), { wrapper });

    result.current();

    expect(store.get(undoStackAtom)).toEqual([
      { tasks: [task], markers: [marker] },
    ]);
    expect(store.get(redoStackAtom)).toEqual([]);
  });
});
