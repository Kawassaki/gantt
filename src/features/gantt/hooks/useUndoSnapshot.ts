import { useAtom } from "jotai";
import { useCallback } from "react";

import {
  markersAtom,
  redoStackAtom,
  tasksAtom,
  undoStackAtom,
} from "../state/store";

const MAX_UNDO_STACK_SIZE = 30;

export const usePushUndoSnapshot = () => {
  const [tasks] = useAtom(tasksAtom);
  const [markers] = useAtom(markersAtom);
  const [undoStack, setUndoStack] = useAtom(undoStackAtom);
  const [, setRedoStack] = useAtom(redoStackAtom);

  return useCallback(() => {
    setUndoStack([
      ...undoStack.slice(-MAX_UNDO_STACK_SIZE),
      { tasks, markers },
    ]);
    setRedoStack([]);
  }, [markers, setRedoStack, setUndoStack, tasks, undoStack]);
};
