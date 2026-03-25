import { createStore } from "jotai";
import { describe, expect, it } from "vitest";

import { tasksAtom } from "../store";

import {
  addNewTaskAtom,
  addTaskAtom,
  deleteTaskAtom,
  updateTaskAtom,
} from "./taskActions";

const baseTask = {
  id: "t-1",
  name: "Task 1",
  startDate: "2026-01-01",
  endDate: "2026-01-02",
  color: "#111111",
  subtasks: [],
  progress: 0,
};

describe("taskActions", () => {
  it("adds a task with generated id", () => {
    const store = createStore();
    store.set(tasksAtom, []);

    store.set(addTaskAtom, {
      name: "Task",
      startDate: "2026-01-01",
      endDate: "2026-01-05",
      color: "#333333",
      subtasks: [],
      progress: 10,
    });

    const tasks = store.get(tasksAtom);
    expect(tasks).toHaveLength(1);
    expect(tasks[0].id.startsWith("t-")).toBe(true);
    expect(tasks[0].name).toBe("Task");
  });

  it("adds a default new task", () => {
    const store = createStore();
    store.set(tasksAtom, [baseTask]);

    store.set(addNewTaskAtom);

    const tasks = store.get(tasksAtom);
    expect(tasks).toHaveLength(2);
    expect(tasks[1].name).toBe("New Task");
    expect(tasks[1].subtasks).toEqual([]);
  });

  it("updates an existing task", () => {
    const store = createStore();
    store.set(tasksAtom, [
      baseTask,
      { ...baseTask, id: "t-2", name: "Keep Me" },
    ]);

    store.set(updateTaskAtom, { ...baseTask, name: "Updated" });

    expect(store.get(tasksAtom)[0].name).toBe("Updated");
    expect(store.get(tasksAtom)[1].name).toBe("Keep Me");
  });

  it("deletes a task by id", () => {
    const store = createStore();
    store.set(tasksAtom, [baseTask, { ...baseTask, id: "t-2" }]);

    store.set(deleteTaskAtom, "t-1");

    expect(store.get(tasksAtom).map((task) => task.id)).toEqual(["t-2"]);
  });
});
