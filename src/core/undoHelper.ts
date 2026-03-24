import { useAtom } from 'jotai'
import { useCallback } from 'react'
import { tasksAtom, markersAtom, undoStackAtom, redoStackAtom } from './store'

export function usePushUndoSnapshot() {
  const [tasks] = useAtom(tasksAtom)
  const [markers] = useAtom(markersAtom)
  const [undoStack, setUndoStack] = useAtom(undoStackAtom)
  const [, setRedoStack] = useAtom(redoStackAtom)

  return useCallback(() => {
    setUndoStack([...undoStack.slice(-30), { tasks, markers }])
    setRedoStack([])
  }, [tasks, markers, undoStack, setUndoStack, setRedoStack])
}
