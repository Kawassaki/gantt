import { createStore } from "jotai";
import { describe, expect, it } from "vitest";

import { tasksAtom } from "../store";

import {
  addNewSubtaskAtom,
  addSubtaskAtom,
  deleteSubtaskAtom,
  updateSubtaskAtom,
} from "./subtaskActions";

const taskWithSubtask = {
  id: "t-1",
  name: "Task 1",
  startDate: "2026-01-01",
  endDate: "2026-01-02",
  color: "#111111",
  subtasks: [
    {
      id: "s-1",
      name: "Subtask 1",
      startDate: "2026-01-01",
      endDate: "2026-01-02",
      color: "#111111",
    },
    {
      id: "s-2",
      name: "Subtask 2",
      startDate: "2026-01-02",
      endDate: "2026-01-03",
      color: "#111111",
    },
  ],
  progress: 0,
};

describe("subtaskActions", () => {
  it("does nothing when adding new subtask to missing task", () => {
    const store = createStore();
    store.set(tasksAtom, [taskWithSubtask]);

    store.set(addNewSubtaskAtom, "missing-id");

    expect(store.get(tasksAtom)).toEqual([taskWithSubtask]);
  });

  it("adds default subtask to a task", () => {
    const store = createStore();
    store.set(tasksAtom, [taskWithSubtask, { ...taskWithSubtask, id: "t-2" }]);

    store.set(addNewSubtaskAtom, "t-1");

    const [firstTask, secondTask] = store.get(tasksAtom);
    expect(firstTask.subtasks).toHaveLength(3);
    expect(firstTask.subtasks[2].name).toBe("New Subtask");
    expect(secondTask.subtasks).toHaveLength(2);
  });

  it("adds subtask payload and inherits task color", () => {
    const store = createStore();
    store.set(tasksAtom, [taskWithSubtask, { ...taskWithSubtask, id: "t-2" }]);

    store.set(addSubtaskAtom, {
      taskId: "t-1",
      subtask: {
        name: "Added",
        startDate: "2026-01-03",
        endDate: "2026-01-04",
        color: "#ffffff",
      },
    });

    const [firstTask, secondTask] = store.get(tasksAtom);
    const added = firstTask.subtasks[2];
    expect(added.name).toBe("Added");
    expect(added.color).toBe("#111111");
    expect(secondTask.subtasks).toHaveLength(2);
  });

  it("updates a subtask", () => {
    const store = createStore();
    store.set(tasksAtom, [taskWithSubtask, { ...taskWithSubtask, id: "t-2" }]);

    store.set(updateSubtaskAtom, {
      taskId: "t-1",
      subtask: {
        ...taskWithSubtask.subtasks[0],
        name: "Updated Subtask",
      },
    });

    const [firstTask, secondTask] = store.get(tasksAtom);
    expect(firstTask.subtasks[0].name).toBe("Updated Subtask");
    expect(secondTask.subtasks[0].name).toBe("Subtask 1");
  });

  it("deletes a subtask by id", () => {
    const store = createStore();
    store.set(tasksAtom, [taskWithSubtask, { ...taskWithSubtask, id: "t-2" }]);

    store.set(deleteSubtaskAtom, { taskId: "t-1", subtaskId: "s-1" });

    const [firstTask, secondTask] = store.get(tasksAtom);
    expect(firstTask.subtasks.map((subtask) => subtask.id)).toEqual(["s-2"]);
    expect(secondTask.subtasks).toHaveLength(2);
  });
});
