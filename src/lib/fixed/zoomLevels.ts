import type { CanvasZoom } from '../components/Canvas/context'

export type CanvasZoomLevel = { id: string; label: string; zoom: CanvasZoom }

export const DEFAULT_ZOOM_LEVELS: CanvasZoomLevel[] = [
  { id: 'fit', label: 'Fit', zoom: 'fit' },
  { id: '50', label: '50%', zoom: 0.5 },
  { id: '100', label: '100%', zoom: 1 },
  { id: '200', label: '200%', zoom: 2 },
]
