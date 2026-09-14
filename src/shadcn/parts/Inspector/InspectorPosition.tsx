import type { ReactNode } from 'react'
import { LockIcon } from 'lucide-react'
import { useLayoutMode } from '../../../lib/components/Editor/context'
import { useInspectorContext } from '../../../lib/components/Inspector/context'
import type { NodeId } from '../../../lib/core/ids'
import { usePositionFields, type StackingOrder } from '../../../lib/fixed/usePositionFields'
import { Button } from '../../ui/button'
import { Checkbox } from '../../ui/checkbox'
import { Field, FieldLabel } from '../../ui/field'
import { NumberField } from './NumberField'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-medium text-muted-foreground">{title}</h3>
      {children}
    </section>
  )
}

export function InspectorPosition({ title = 'Position' }: { title?: string }) {
  const layout = useLayoutMode()
  const { selectedId } = useInspectorContext()
  if (layout !== 'fixed' || !selectedId) return null
  return (
    <Section title={title}>
      <PositionFields id={selectedId} />
    </Section>
  )
}

function PositionFields({ id }: { id: NodeId }) {
  const fields = usePositionFields(id)
  if (!fields.available) return null
  const { box, locked, commitPosition, commitSize, stacking, setLocked } = fields

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <NumberField label="X" unit="px" value={box?.x} disabled={locked} onCommit={(v) => commitPosition('x', v)} />
        <NumberField label="Y" unit="px" value={box?.y} disabled={locked} onCommit={(v) => commitPosition('y', v)} />
        <NumberField label="W" unit="px" value={box?.width} disabled={locked} onCommit={(v) => commitSize('width', v)} />
        <NumberField label="H" unit="px" value={box?.height} disabled={locked} onCommit={(v) => commitSize('height', v)} />
      </div>
      {stacking ? <StackingButtons stacking={stacking} /> : null}
      <Field orientation="horizontal">
        <Checkbox
          id={`adt-lock-${id}`}
          checked={locked}
          onCheckedChange={(checked) => setLocked(checked === true)}
        />
        <FieldLabel htmlFor={`adt-lock-${id}`} className="text-xs font-normal">
          <LockIcon className="size-3" />
          Lock position
        </FieldLabel>
      </Field>
    </div>
  )
}

function StackingButtons({ stacking }: { stacking: StackingOrder }) {
  const { index, last } = stacking
  return (
    <div className="grid grid-cols-4 gap-1" role="group" aria-label="Stacking order">
      <Button variant="outline" size="xs" disabled={index <= 0} onClick={stacking.toBack}>
        To back
      </Button>
      <Button variant="outline" size="xs" disabled={index <= 0} onClick={stacking.backward}>
        Backward
      </Button>
      <Button variant="outline" size="xs" disabled={index >= last} onClick={stacking.forward}>
        Forward
      </Button>
      <Button variant="outline" size="xs" disabled={index >= last} onClick={stacking.toFront}>
        To front
      </Button>
    </div>
  )
}
