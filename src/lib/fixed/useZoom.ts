import { useCanvasContext, type CanvasZoom } from '../components/Canvas/context'
import { DEFAULT_ZOOM_LEVELS, type CanvasZoomLevel } from './zoomLevels'

export type ZoomControl = {
  levels: CanvasZoomLevel[]
  zoom: CanvasZoom
  activeId: string | null
  isActive: (id: string) => boolean
  setZoom: (zoom: CanvasZoom) => void
  selectLevel: (id: string) => void
}

export function useZoom(levels: CanvasZoomLevel[] = DEFAULT_ZOOM_LEVELS): ZoomControl {
  const { zoom, setZoom } = useCanvasContext()
  const active = levels.find((level) => level.zoom === zoom) ?? null
  return {
    levels,
    zoom,
    activeId: active?.id ?? null,
    isActive: (id) => active?.id === id,
    setZoom,
    selectLevel: (id) => {
      const level = levels.find((entry) => entry.id === id)
      if (level) setZoom(level.zoom)
    },
  }
}
