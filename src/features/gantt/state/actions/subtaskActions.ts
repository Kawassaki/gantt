import { atom } from "jotai";

import type { Subtask } from "../../types";
import { createSubtaskId } from "../../utils/ids";
import { tasksAtom } from "../store";

import { pushUndoAtom } from "./historyActions";

export const addNewSubtaskAtom = atom(null, (get, set, taskId: string) => {
  set(pushUndoAtom);
  const tasks = get(tasksAtom);
  const task = tasks.find((currentTask) => currentTask.id === taskId);
  if (!task) return;

  set(
    tasksAtom,
    tasks.map((currentTask) =>
      currentTask.id === taskId
        ? {
            ...currentTask,
            subtasks: [
              ...currentTask.subtasks,
              {
                id: createSubtaskId(),
                name: "New Subtask",
                startDate: currentTask.startDate,
                endDate: currentTask.endDate,
                color: currentTask.color,
              },
            ],
          }
        : currentTask
    )
  );
});

export const addSubtaskAtom = atom(
  null,
  (
    get,
    set,
    {
      taskId,
      subtask,
    }: {
      taskId: string;
      subtask: Omit<Subtask, "id">;
    }
  ) => {
    set(pushUndoAtom);
    set(
      tasksAtom,
      get(tasksAtom).map((task) =>
        task.id === taskId
          ? {
              ...task,
              subtasks: [
                ...task.subtasks,
                { ...subtask, id: createSubtaskId(), color: task.color },
              ],
            }
          : task
      )
    );
  }
);

export const updateSubtaskAtom = atom(
  null,
  (get, set, { taskId, subtask }: { taskId: string; subtask: Subtask }) => {
    set(pushUndoAtom);
    set(
      tasksAtom,
      get(tasksAtom).map((task) =>
        task.id === taskId
          ? {
              ...task,
              subtasks: task.subtasks.map((existingSubtask) =>
                existingSubtask.id === subtask.id ? subtask : existingSubtask
              ),
            }
          : task
      )
    );
  }
);

export const deleteSubtaskAtom = atom(
  null,
  (get, set, { taskId, subtaskId }: { taskId: string; subtaskId: string }) => {
    set(pushUndoAtom);
    set(
      tasksAtom,
      get(tasksAtom).map((task) =>
        task.id === taskId
          ? {
              ...task,
              subtasks: task.subtasks.filter(
                (subtask) => subtask.id !== subtaskId
              ),
            }
          : task
      )
    );
  }
);
