import { PRESET_BUTTON_CLASS, PRESET_GROUP_CLASS } from '../components/Canvas/canvasStyles'
import { useZoom } from './useZoom'
import type { CanvasZoomLevel } from './zoomLevels'

export function Zoom({ levels }: { levels?: CanvasZoomLevel[] }) {
  const control = useZoom(levels)
  return (
    <div className={PRESET_GROUP_CLASS} role="group" aria-label="Zoom">
      {control.levels.map((level) => (
        <button
          key={level.id}
          type="button"
          className={PRESET_BUTTON_CLASS}
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
