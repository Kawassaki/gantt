import { act, renderHook } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import {
  markersAtom,
  redoStackAtom,
  tasksAtom,
  undoStackAtom,
} from "../state/store";

import { useKeyboardShortcuts } from "./useKeyboardShortcuts";

const taskA = {
  id: "t-a",
  name: "A",
  startDate: "2026-01-01",
  endDate: "2026-01-02",
  color: "#111111",
  subtasks: [],
  progress: 0,
};

const taskB = {
  ...taskA,
  id: "t-b",
  name: "B",
};

describe("useKeyboardShortcuts", () => {
  it("handles undo and redo via keyboard shortcuts", () => {
    const store = createStore();
    store.set(tasksAtom, [taskB]);
    store.set(markersAtom, []);
    store.set(undoStackAtom, [{ tasks: [taskA], markers: [] }]);
    store.set(redoStackAtom, []);

    const wrapper = ({ children }: { children: ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );
    renderHook(() => useKeyboardShortcuts(), { wrapper });

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "z", ctrlKey: true })
      );
    });
    expect(store.get(tasksAtom)[0].id).toBe("t-a");

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "z",
          ctrlKey: true,
          shiftKey: true,
        })
      );
    });
    expect(store.get(tasksAtom)[0].id).toBe("t-b");
  });

  it("supports meta key shortcut and ignores unrelated keys", () => {
    const store = createStore();
    store.set(tasksAtom, [taskB]);
    store.set(markersAtom, []);
    store.set(undoStackAtom, [{ tasks: [taskA], markers: [] }]);
    store.set(redoStackAtom, []);

    const wrapper = ({ children }: { children: ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );
    renderHook(() => useKeyboardShortcuts(), { wrapper });

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "x", ctrlKey: true })
      );
    });
    expect(store.get(tasksAtom)[0].id).toBe("t-b");

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "z", metaKey: true })
      );
    });
    expect(store.get(tasksAtom)[0].id).toBe("t-a");
  });
});
