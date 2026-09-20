import { createContext, use } from 'react'

export const STAGE_PADDING = 16

export type CanvasStageSize = { width: number; height: number }

export const EMPTY_STAGE_SIZE: CanvasStageSize = { width: 0, height: 0 }

export const CanvasStageContext = createContext<CanvasStageSize>(EMPTY_STAGE_SIZE)

export function useCanvasStage(): CanvasStageSize {
  return use(CanvasStageContext)
}
