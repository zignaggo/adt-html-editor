import { RotateCcwIcon } from 'lucide-react'
import { useLayoutMode } from '../../../lib/components/Editor/context'
import { useInspectorContext } from '../../../lib/components/Inspector/context'
import type { NodeId } from '../../../lib/core/ids'
import { useTransformFields } from '../../../lib/fixed/useTransformFields'
import { Button } from '../../ui/button'
import { Checkbox } from '../../ui/checkbox'
import { Field, FieldLabel } from '../../ui/field'
import { NumberField } from './NumberField'

export function InspectorTransform({ title = 'Transform' }: { title?: string }) {
  const layout = useLayoutMode()
  const { selectedId } = useInspectorContext()
  if (layout !== 'fixed' || !selectedId) return null
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-medium text-muted-foreground">{title}</h3>
      <TransformFields id={selectedId} />
    </section>
  )
}

function TransformFields({ id }: { id: NodeId }) {
  const fields = useTransformFields(id)
  if (!fields.available) return null

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 items-center gap-2">
        <NumberField
          label="Angle"
          unit="degrees"
          unitLabel="°"
          value={fields.angle ?? undefined}
          step={1}
          disabled={fields.locked}
          onCommit={fields.commitAngle}
        />
        <Button
          variant="outline"
          size="xs"
          disabled={fields.locked || fields.angle === null || fields.angle === 0}
          onClick={fields.resetRotation}
        >
          <RotateCcwIcon data-icon="inline-start" />
          Reset rotation
        </Button>
      </div>
      <Field orientation="horizontal">
        <Checkbox
          id={`adt-aspect-${id}`}
          checked={fields.aspectLocked}
          onCheckedChange={(checked) => fields.setAspectLocked(checked === true)}
        />
        <FieldLabel htmlFor={`adt-aspect-${id}`} className="text-xs font-normal">
          Lock aspect ratio
        </FieldLabel>
      </Field>
      <Field orientation="horizontal">
        <Checkbox
          id={`adt-auto-height-${id}`}
          checked={fields.autoHeight}
          disabled={fields.locked}
          onCheckedChange={(checked) => fields.setAutoHeight(checked === true)}
        />
        <FieldLabel htmlFor={`adt-auto-height-${id}`} className="text-xs font-normal">
          Auto height
        </FieldLabel>
      </Field>
    </div>
  )
}
