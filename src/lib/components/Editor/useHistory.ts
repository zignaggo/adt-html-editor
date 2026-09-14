import { useCanRedo, useCanUndo, useEditor } from './context'

export type HistoryApi = {
  canUndo: boolean
  canRedo: boolean
  undo: () => void
  redo: () => void
}

/** History state and actions, for consumers who want to write their own parts. */
export function useHistory(): HistoryApi {
  const { undo, redo } = useEditor()
  return { canUndo: useCanUndo(), canRedo: useCanRedo(), undo, redo }
}
