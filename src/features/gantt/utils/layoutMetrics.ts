import { SUBTASK_ROW_HEIGHT, TASK_ROW_HEIGHT } from "../constants";
import type { Task } from "../types";

export const rowHeight = (task: Task): number =>
  TASK_ROW_HEIGHT + task.subtasks.length * SUBTASK_ROW_HEIGHT;

export const totalHeight = (tasks: Task[]): number =>
  tasks.reduce((height, task) => height + rowHeight(task), 0);
