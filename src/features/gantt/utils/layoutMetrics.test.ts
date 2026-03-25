import { describe, expect, it } from "vitest";

import type { Task } from "../types";

import { rowHeight, totalHeight } from "./layoutMetrics";

const createTask = (subtasksCount: number): Task => ({
  id: "task",
  name: "Task",
  startDate: "2026-03-01",
  endDate: "2026-03-10",
  color: "#000000",
  progress: 0,
  subtasks: Array.from({ length: subtasksCount }, (_, index) => ({
    id: `subtask-${index}`,
    name: `Subtask ${index}`,
    startDate: "2026-03-01",
    endDate: "2026-03-02",
    color: "#000000",
  })),
});

describe("layout metrics", () => {
  it("computes row height using task and subtask row sizes", () => {
    expect(rowHeight(createTask(2))).toBe(128);
  });

  it("computes total chart height for task list", () => {
    const tasks: Task[] = [createTask(0), createTask(1), createTask(2)];
    expect(totalHeight(tasks)).toBe(56 + 92 + 128);
  });
});
