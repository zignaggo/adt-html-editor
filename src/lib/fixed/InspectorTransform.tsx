import type { NodeId } from '../core/ids'
import { useInspectorContext } from '../components/Inspector/context'
import { InspectorSection } from '../components/Inspector/InspectorParts'
import { useLayoutMode } from '../components/Editor/context'
import { NumberField } from './NumberField'
import { useTransformFields } from './useTransformFields'
import { FIELDS_CLASS } from '../components/Inspector/inspectorStyles'
import { LOCK_CLASS, ORDER_BUTTON_CLASS, POSITION_GRID_CLASS } from './positionStyles'

export function InspectorTransform({ title = 'Transform' }: { title?: string }) {
  const layout = useLayoutMode()
  const { selectedId } = useInspectorContext()
  if (layout !== 'fixed' || !selectedId) return null
  return (
    <InspectorSection title={title}>
      <TransformFields id={selectedId} />
    </InspectorSection>
  )
}

function TransformFields({ id }: { id: NodeId }) {
  const fields = useTransformFields(id)
  if (!fields.available) return null

  return (
    <div className={FIELDS_CLASS}>
      <div className={POSITION_GRID_CLASS}>
        <NumberField
          label="Angle"
          unit="degrees"
          value={fields.angle ?? undefined}
          step={1}
          disabled={fields.locked}
          onCommit={fields.commitAngle}
        />
        <button
          type="button"
          className={ORDER_BUTTON_CLASS}
          disabled={fields.locked || fields.angle === null || fields.angle === 0}
          onClick={fields.resetRotation}
        >
          Reset rotation
        </button>
      </div>
      <label className={LOCK_CLASS}>
        <input
          type="checkbox"
          checked={fields.aspectLocked}
          onChange={(event) => fields.setAspectLocked(event.target.checked)}
        />
        <span>Lock aspect ratio</span>
      </label>
      <label className={LOCK_CLASS}>
        <input
          type="checkbox"
          checked={fields.autoHeight}
          disabled={fields.locked}
          onChange={(event) => fields.setAutoHeight(event.target.checked)}
        />
        <span>Auto height</span>
      </label>
    </div>
  )
}
