import { useCanvasContext } from '../components/Canvas/context'
import styles from '../components/Canvas/Canvas.module.css'
import { DEFAULT_ZOOM_LEVELS, type CanvasZoomLevel } from './zoomLevels'

export function Zoom({ levels = DEFAULT_ZOOM_LEVELS }: { levels?: CanvasZoomLevel[] }) {
  const { zoom, setZoom } = useCanvasContext()
  return (
    <div className={styles.presets} role="group" aria-label="Zoom">
      {levels.map((level) => (
        <button
          key={level.id}
          type="button"
          className={styles.presetButton}
          data-active={level.zoom === zoom || undefined}
          aria-pressed={level.zoom === zoom}
          onClick={() => setZoom(level.zoom)}
        >
          {level.label}
        </button>
      ))}
    </div>
  )
}
