import { act, renderHook } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { tasksAtom } from "../state/store";

import { dragInternals, useGanttDrag } from "./useGanttDrag";

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
    const resizeEndCursor = result.current.getCursor(
      createPointerEvent(element, 99, 0),
      element
    );
    const grabCursor = result.current.getCursor(
      createPointerEvent(element, 50, 0),
      element
    );

    expect(resizeCursor).toBe("ew-resize");
    expect(resizeEndCursor).toBe("ew-resize");
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

  it("resizes from start and clamps to minimum one-day duration", () => {
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
        "resize-start"
      );
    });
    act(() => {
      result.current.onPointerMove(createPointerEvent(dragElement, 100, 20));
    });
    act(() => {
      result.current.endDrag();
    });

    const resizedTask = store.get(tasksAtom)[0];
    expect(resizedTask.startDate).toBe("2026-01-02");
    expect(resizedTask.endDate).toBe("2026-01-03");
  });

  it("resizes from end and clamps to minimum one-day duration", () => {
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
        "resize-end"
      );
    });
    act(() => {
      result.current.onPointerMove(createPointerEvent(dragElement, 40, 20));
    });
    act(() => {
      result.current.endDrag();
    });

    const resizedTask = store.get(tasksAtom)[0];
    expect(resizedTask.startDate).toBe("2026-01-01");
    expect(resizedTask.endDate).toBe("2026-01-02");
  });

  it("reorders top-level tasks via vertical dragging", () => {
    const store = createStore();
    const secondTask = { ...baseTask, id: "t-2", name: "Task 2" };
    store.set(tasksAtom, [baseTask, secondTask]);

    const wrapper = ({ children }: { children: ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );
    const chartBodyRef = {
      current: {
        getBoundingClientRect: () => ({ top: 0 }),
        scrollTop: 0,
      } as unknown as HTMLElement,
    };
    const { result } = renderHook(
      () => useGanttDrag(10, undefined, chartBodyRef),
      {
        wrapper,
      }
    );

    const dragElement = {
      setPointerCapture: () => {},
      getBoundingClientRect: () => ({ left: 0, width: 100 }),
    } as unknown as HTMLElement;

    act(() => {
      result.current.startDrag(
        createPointerEvent(dragElement, 50, 10),
        "t-1",
        undefined,
        "move"
      );
    });
    act(() => {
      result.current.onPointerMove(createPointerEvent(dragElement, 50, 120));
    });

    expect(result.current.dropIndicatorY).not.toBeNull();

    act(() => {
      result.current.endDrag();
    });

    const reordered = store.get(tasksAtom);
    expect(reordered[0].id).toBe("t-2");
    expect(reordered[1].id).toBe("t-1");
  });

  it("moves subtasks across tasks and applies target task color", () => {
    const store = createStore();
    const tasksWithSubtasks = [
      {
        ...baseTask,
        id: "t-1",
        color: "#111111",
        subtasks: [
          {
            id: "s-1",
            name: "S1",
            startDate: "2026-01-01",
            endDate: "2026-01-02",
            color: "#111111",
          },
        ],
      },
      {
        ...baseTask,
        id: "t-2",
        color: "#222222",
        subtasks: [
          {
            id: "s-2",
            name: "S2",
            startDate: "2026-01-02",
            endDate: "2026-01-03",
            color: "#222222",
          },
        ],
      },
    ];
    store.set(tasksAtom, tasksWithSubtasks);

    const wrapper = ({ children }: { children: ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );
    const chartBodyRef = {
      current: {
        getBoundingClientRect: () => ({ top: 0 }),
        scrollTop: 0,
      } as unknown as HTMLElement,
    };
    const { result } = renderHook(
      () => useGanttDrag(10, undefined, chartBodyRef),
      {
        wrapper,
      }
    );

    const dragElement = {
      setPointerCapture: () => {},
      getBoundingClientRect: () => ({ left: 0, width: 100 }),
    } as unknown as HTMLElement;

    act(() => {
      result.current.startDrag(
        createPointerEvent(dragElement, 50, 10),
        "t-1",
        "s-1",
        "move"
      );
    });
    act(() => {
      result.current.onPointerMove(createPointerEvent(dragElement, 50, 126));
    });
    act(() => {
      result.current.endDrag();
    });

    const nextTasks = store.get(tasksAtom);
    expect(nextTasks[0].subtasks).toHaveLength(0);
    expect(nextTasks[1].subtasks[0].id).toBe("s-1");
    expect(nextTasks[1].subtasks[0].color).toBe("#222222");
  });

  it("handles missing task and missing subtask drag starts gracefully", () => {
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
        "missing-task",
        undefined,
        "move"
      );
      result.current.startDrag(
        createPointerEvent(dragElement, 50, 20),
        "t-1",
        "missing-subtask",
        "move"
      );
      result.current.onPointerMove(createPointerEvent(dragElement, 55, 22));
      result.current.endDrag();
    });

    expect(result.current.isDragging).toBe(false);
  });

  it("covers drag internals edge branches", () => {
    const tasks = [
      {
        ...baseTask,
        id: "t-1",
        subtasks: [
          {
            id: "s-1",
            name: "S1",
            startDate: "2026-01-01",
            endDate: "2026-01-02",
            color: "#111111",
          },
        ],
      },
      {
        ...baseTask,
        id: "t-2",
        subtasks: [],
      },
    ];

    const flatRows = dragInternals.buildFlatRows(tasks, 56, 36);
    expect(flatRows).toHaveLength(3);

    const groups = dragInternals.buildTaskGroups(tasks, 56, 36);
    expect(groups).toHaveLength(2);

    expect(
      dragInternals.computeDropTarget(10, tasks, "missing", undefined, 56, 36)
    ).toBeNull();
    expect(
      dragInternals.computeDropTarget(10, tasks, "t-1", "missing", 56, 36)
    ).toBeNull();

    expect(
      dragInternals.computeDropTarget(0, tasks, "t-1", undefined, 56, 36)
    ).toBeNull();

    const taskDropTarget = dragInternals.computeDropTarget(
      140,
      tasks,
      "t-1",
      undefined,
      56,
      36
    );
    expect(taskDropTarget).not.toBeNull();

    const subtaskNoOpTarget = dragInternals.computeDropTarget(
      74,
      tasks,
      "t-1",
      "s-1",
      56,
      36
    );
    expect(subtaskNoOpTarget).toBeNull();

    const subtaskMoveTarget = dragInternals.computeDropTarget(
      130,
      tasks,
      "t-1",
      "s-1",
      56,
      36
    );
    expect(subtaskMoveTarget).not.toBeNull();

    const unchanged = subtaskMoveTarget?.apply([
      { ...tasks[0], subtasks: [] },
      tasks[1],
    ]);
    expect(unchanged).toEqual([{ ...tasks[0], subtasks: [] }, tasks[1]]);

    const tasksForReorder = [
      {
        ...baseTask,
        id: "ta",
        color: "#111111",
        subtasks: [
          {
            id: "sa-1",
            name: "A1",
            startDate: "2026-01-01",
            endDate: "2026-01-02",
            color: "#111111",
          },
          {
            id: "sa-2",
            name: "A2",
            startDate: "2026-01-02",
            endDate: "2026-01-03",
            color: "#111111",
          },
        ],
      },
      {
        ...baseTask,
        id: "tb",
        color: "#222222",
        subtasks: [],
      },
    ];

    const moveToEndInSameTask = dragInternals.computeDropTarget(
      115,
      tasksForReorder,
      "ta",
      "sa-1",
      56,
      36
    );
    expect(moveToEndInSameTask).not.toBeNull();
    const reorderedSameTask = moveToEndInSameTask?.apply(tasksForReorder);
    expect(
      reorderedSameTask?.[0].subtasks.map((subtask) => subtask.id)
    ).toEqual(["sa-2", "sa-1"]);

    const moveTaskToTop = dragInternals.computeDropTarget(
      0,
      [tasksForReorder[1], tasksForReorder[0]],
      "ta",
      undefined,
      56,
      36
    );
    expect(moveTaskToTop).not.toBeNull();
  });
});
