import styles from '../components/Canvas/Canvas.module.css'
import { useZoom } from './useZoom'
import type { CanvasZoomLevel } from './zoomLevels'

export function Zoom({ levels }: { levels?: CanvasZoomLevel[] }) {
  const control = useZoom(levels)
  return (
    <div className={styles.presets} role="group" aria-label="Zoom">
      {control.levels.map((level) => (
        <button
          key={level.id}
          type="button"
          className={styles.presetButton}
          data-active={control.isActive(level.id) || undefined}
          aria-pressed={control.isActive(level.id)}
          onClick={() => control.selectLevel(level.id)}
        >
          {level.label}
        </button>
      ))}
    </div>
  )
}
