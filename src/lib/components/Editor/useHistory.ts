import { useCanRedo, useCanUndo, useEditor } from './context'

export type HistoryApi = {
  canUndo: boolean
  canRedo: boolean
  undo: () => void
  redo: () => void
}

/** Estado e ações do histórico, para quem quiser escrever partes próprias. */
export function useHistory(): HistoryApi {
  const { undo, redo } = useEditor()
  return { canUndo: useCanUndo(), canRedo: useCanRedo(), undo, redo }
}
