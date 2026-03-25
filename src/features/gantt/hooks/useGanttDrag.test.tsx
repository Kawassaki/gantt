import { act, renderHook } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { tasksAtom } from "../state/store";

import { useGanttDrag } from "./useGanttDrag";

const baseTask = {
  id: "t-1",
  name: "Task",
  startDate: "2026-01-01",
  endDate: "2026-01-03",
  color: "#111111",
  subtasks: [],
  progress: 0,
};

const createPointerEvent = (
  currentTarget: HTMLElement,
  clientX: number,
  clientY: number
): ReactPointerEvent => {
  return {
    currentTarget,
    clientX,
    clientY,
    pointerId: 1,
    preventDefault: () => {},
  } as unknown as ReactPointerEvent;
};

describe("useGanttDrag", () => {
  it("returns resize or grab cursor based on pointer position", () => {
    const store = createStore();
    store.set(tasksAtom, [baseTask]);

    const wrapper = ({ children }: { children: ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );
    const { result } = renderHook(() => useGanttDrag(10), { wrapper });

    const element = {
      getBoundingClientRect: () => ({ left: 0, width: 100 }),
    } as unknown as HTMLElement;

    const resizeCursor = result.current.getCursor(
      createPointerEvent(element, 2, 0),
      element
    );
    const grabCursor = result.current.getCursor(
      createPointerEvent(element, 50, 0),
      element
    );

    expect(resizeCursor).toBe("ew-resize");
    expect(grabCursor).toBe("grab");
  });

  it("starts drag, moves task dates, and ends drag", () => {
    const store = createStore();
    store.set(tasksAtom, [baseTask]);

    const wrapper = ({ children }: { children: ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );
    const { result } = renderHook(() => useGanttDrag(10), { wrapper });

    const dragElement = {
      setPointerCapture: () => {},
      getBoundingClientRect: () => ({ left: 0, width: 100 }),
    } as unknown as HTMLElement;

    act(() => {
      result.current.startDrag(
        createPointerEvent(dragElement, 50, 20),
        "t-1",
        undefined,
        "move"
      );
    });
    expect(result.current.isDragging).toBe(true);

    act(() => {
      result.current.onPointerMove(createPointerEvent(dragElement, 60, 20));
    });

    const movedTask = store.get(tasksAtom)[0];
    expect(movedTask.startDate).toBe("2026-01-02");
    expect(movedTask.endDate).toBe("2026-01-04");

    act(() => {
      result.current.endDrag();
    });
    expect(result.current.isDragging).toBe(false);
  });
});
