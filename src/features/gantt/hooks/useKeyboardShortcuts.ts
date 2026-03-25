import { useSetAtom } from "jotai";
import { useEffect } from "react";

import { redoAtom, undoAtom } from "../state/actions";

export const useKeyboardShortcuts = (): void => {
  const undo = useSetAtom(undoAtom);
  const redo = useSetAtom(redoAtom);

  useEffect(() => {
    const onKeydown = (event: KeyboardEvent) => {
      const hasModifierKey = event.ctrlKey || event.metaKey;
      if (hasModifierKey && event.key === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
      }
      if (hasModifierKey && event.key === "z" && event.shiftKey) {
        event.preventDefault();
        redo();
      }
    };

    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  }, [redo, undo]);
};
