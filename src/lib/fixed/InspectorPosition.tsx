import type { NodeId } from '../core/ids'
import { useInspectorContext } from '../components/Inspector/context'
import { InspectorSection } from '../components/Inspector/InspectorParts'
import { useLayoutMode } from '../components/Editor/context'
import { NumberField } from './NumberField'
import { usePositionFields, type StackingOrder } from './usePositionFields'
import inspectorStyles from '../components/Inspector/InspectorPanel.module.css'
import styles from './InspectorPosition.module.css'

export function InspectorPosition({ title = 'Position' }: { title?: string }) {
  const layout = useLayoutMode()
  const { selectedId } = useInspectorContext()
  if (layout !== 'fixed' || !selectedId) return null
  return (
    <InspectorSection title={title}>
      <PositionFields id={selectedId} />
    </InspectorSection>
  )
}

function PositionFields({ id }: { id: NodeId }) {
  const fields = usePositionFields(id)
  if (!fields.available) return null
  const { box, locked, commitPosition, commitSize, stacking, setLocked } = fields

  return (
    <div className={inspectorStyles.fields}>
      <div className={styles.grid}>
        <NumberField label="X" value={box?.x} disabled={locked} onCommit={(v) => commitPosition('x', v)} />
        <NumberField label="Y" value={box?.y} disabled={locked} onCommit={(v) => commitPosition('y', v)} />
        <NumberField label="W" value={box?.width} disabled={locked} onCommit={(v) => commitSize('width', v)} />
        <NumberField label="H" value={box?.height} disabled={locked} onCommit={(v) => commitSize('height', v)} />
      </div>
      {stacking ? <StackingButtons stacking={stacking} /> : null}
      <label className={styles.lock}>
        <input type="checkbox" checked={locked} onChange={(event) => setLocked(event.target.checked)} />
        <span>Lock position</span>
      </label>
    </div>
  )
}

function StackingButtons({ stacking }: { stacking: StackingOrder }) {
  const { index, last } = stacking
  return (
    <div className={styles.order} role="group" aria-label="Stacking order">
      <button type="button" className={styles.orderButton} disabled={index <= 0} onClick={stacking.toBack}>
        To back
      </button>
      <button type="button" className={styles.orderButton} disabled={index <= 0} onClick={stacking.backward}>
        Backward
      </button>
      <button type="button" className={styles.orderButton} disabled={index >= last} onClick={stacking.forward}>
        Forward
      </button>
      <button type="button" className={styles.orderButton} disabled={index >= last} onClick={stacking.toFront}>
        To front
      </button>
    </div>
  )
}
