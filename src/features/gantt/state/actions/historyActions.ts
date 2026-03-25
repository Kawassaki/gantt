import { atom } from "jotai";

import { markersAtom, redoStackAtom, tasksAtom, undoStackAtom } from "../store";

const MAX_UNDO_STACK_SIZE = 30;

export const pushUndoAtom = atom(null, (get, set) => {
  const snapshot = { tasks: get(tasksAtom), markers: get(markersAtom) };
  const nextUndoStack = [
    ...get(undoStackAtom).slice(-MAX_UNDO_STACK_SIZE),
    snapshot,
  ];
  set(undoStackAtom, nextUndoStack);
  set(redoStackAtom, []);
});

export const undoAtom = atom(null, (get, set) => {
  const undoStack = get(undoStackAtom);
  if (undoStack.length === 0) return;

  const previousSnapshot = undoStack[undoStack.length - 1];
  const redoSnapshot = { tasks: get(tasksAtom), markers: get(markersAtom) };

  set(redoStackAtom, [...get(redoStackAtom), redoSnapshot]);
  set(undoStackAtom, undoStack.slice(0, -1));
  set(tasksAtom, previousSnapshot.tasks);
  set(markersAtom, previousSnapshot.markers);
});

export const redoAtom = atom(null, (get, set) => {
  const redoStack = get(redoStackAtom);
  if (redoStack.length === 0) return;

  const nextSnapshot = redoStack[redoStack.length - 1];
  const undoSnapshot = { tasks: get(tasksAtom), markers: get(markersAtom) };

  set(undoStackAtom, [...get(undoStackAtom), undoSnapshot]);
  set(redoStackAtom, redoStack.slice(0, -1));
  set(tasksAtom, nextSnapshot.tasks);
  set(markersAtom, nextSnapshot.markers);
});
