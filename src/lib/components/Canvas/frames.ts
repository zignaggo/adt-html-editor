import { createContext, use } from 'react'
import type { CanvasWidthPreset } from './context'

export const DEFAULT_FRAME_WIDTH = 1280

export const FRAME_GAP = 48

export const FRAME_ROW_PADDING = 32

export const FRAME_MIN_HEIGHT = 320

export type CanvasFrame = {
  id: string
  label: string
  width: number
}

export function frameWidthOf(preset: CanvasWidthPreset): number {
  return preset.frameWidth ?? (preset.width > 0 ? preset.width : DEFAULT_FRAME_WIDTH)
}

export function resolveFrames(presets: readonly CanvasWidthPreset[]): CanvasFrame[] {
  const frames: CanvasFrame[] = []
  const seen = new Set<string>()
  for (const preset of presets) {
    if (seen.has(preset.id)) continue
    seen.add(preset.id)
    frames.push({ id: preset.id, label: preset.label, width: frameWidthOf(preset) })
  }
  return frames.sort((a, b) => b.width - a.width)
}

export function framesWidth(frames: readonly CanvasFrame[]): number {
  if (frames.length === 0) return 0
  let total = FRAME_ROW_PADDING * 2 + FRAME_GAP * (frames.length - 1)
  for (const frame of frames) total += frame.width
  return total
}

export const CanvasFrameActive = createContext(true)

export function useIsActiveFrame(): boolean {
  return use(CanvasFrameActive)
}
