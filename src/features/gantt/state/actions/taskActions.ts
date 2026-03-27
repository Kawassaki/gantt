import { addDays, format } from "date-fns";
import { atom } from "jotai";

import { DEFAULT_TASK_COLORS } from "../../constants";
import type { Task } from "../../types";
import { createTaskId } from "../../utils/ids";
import { jiraIssueLinksAtom } from "../jiraStore";
import { tasksAtom } from "../store";

import { pushUndoAtom } from "./historyActions";

export const addTaskAtom = atom(
  null,
  (get, set, taskData: Omit<Task, "id">) => {
    set(pushUndoAtom);
    set(tasksAtom, [...get(tasksAtom), { ...taskData, id: createTaskId() }]);
  }
);

export const addNewTaskAtom = atom(null, (get, set) => {
  set(pushUndoAtom);
  const existingTasks = get(tasksAtom);
  const todayDate = new Date();
  const startDate = format(todayDate, "yyyy-MM-dd");
  const endDate = format(addDays(todayDate, 5), "yyyy-MM-dd");
  const color =
    DEFAULT_TASK_COLORS[existingTasks.length % DEFAULT_TASK_COLORS.length];

  set(tasksAtom, [
    ...existingTasks,
    {
      id: createTaskId(),
      name: "New Task",
      startDate,
      endDate,
      color,
      subtasks: [],
      progress: 0,
    },
  ]);
});

export const updateTaskAtom = atom(null, (get, set, updatedTask: Task) => {
  set(pushUndoAtom);
  set(
    tasksAtom,
    get(tasksAtom).map((task) =>
      task.id === updatedTask.id ? updatedTask : task
    )
  );
});

export const deleteTaskAtom = atom(null, (get, set, taskId: string) => {
  set(pushUndoAtom);
  set(
    tasksAtom,
    get(tasksAtom).filter((task) => task.id !== taskId)
  );

  const nextLinks = Object.fromEntries(
    Object.entries(get(jiraIssueLinksAtom)).filter(
      ([, link]) => link.taskId !== taskId
    )
  );
  set(jiraIssueLinksAtom, nextLinks);
});
