import type { NodeId } from '../core/ids'
import { isStyled } from '../core/model'
import { useInspectorContext } from '../components/Inspector/context'
import { InspectorSection } from '../components/Inspector/InspectorParts'
import {
  useAspectLocked,
  useEditor,
  useFixedLayout,
  useIsLocked,
  useLayoutMode,
  useNode,
} from '../components/Editor/context'
import type { Box, Point } from './geometry'
import { NumberField } from './NumberField'
import { positionDeclarations, sizeDeclarations } from './position'
import { styleOriginOf } from './transform/elementTransform'
import { readLayoutBox } from './transform/layoutBox'
import { useMeasured } from './useMeasured'
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

type Measured = { box: Box; origin: Point }

function measurePosition(element: HTMLElement, root: HTMLElement): Measured {
  return { box: readLayoutBox(element, root), origin: styleOriginOf(element, root) }
}

function sameMeasure(a: Measured, b: Measured): boolean {
  return (
    a.box.x === b.box.x &&
    a.box.y === b.box.y &&
    a.box.width === b.box.width &&
    a.box.height === b.box.height &&
    a.origin.x === b.origin.x &&
    a.origin.y === b.origin.y
  )
}

function PositionFields({ id }: { id: NodeId }) {
  const node = useNode(id)
  const locked = useIsLocked(id)
  const aspectLocked = useAspectLocked()
  const { placeNode, moveNode, setLocked } = useEditor()
  const { precision } = useFixedLayout()
  const measured = useMeasured(id, measurePosition, sameMeasure)
  const box = measured?.box

  if (!node || !isStyled(node)) return null
  const style = node.attrs.style

  const commitPosition = (axis: 'x' | 'y', value: number) => {
    if (!measured || !Number.isFinite(value)) return
    const x = (axis === 'x' ? value : measured.box.x) - measured.origin.x
    const y = (axis === 'y' ? value : measured.box.y) - measured.origin.y
    placeNode(id, { style: positionDeclarations(style, x, y, precision) })
  }

  const commitSize = (axis: 'width' | 'height', value: number) => {
    if (!Number.isFinite(value) || value <= 0) return
    let width = axis === 'width' ? value : null
    let height = axis === 'height' ? value : null
    if (aspectLocked && box && box.width > 0 && box.height > 0) {
      const ratio = box.width / box.height
      if (width !== null) height = width / ratio
      else if (height !== null) width = height * ratio
    }
    placeNode(id, { style: sizeDeclarations(style, width, height, precision) })
  }

  return (
    <div className={inspectorStyles.fields}>
      <div className={styles.grid}>
        <NumberField label="X" value={box?.x} disabled={locked} onCommit={(v) => commitPosition('x', v)} />
        <NumberField label="Y" value={box?.y} disabled={locked} onCommit={(v) => commitPosition('y', v)} />
        <NumberField label="W" value={box?.width} disabled={locked} onCommit={(v) => commitSize('width', v)} />
        <NumberField label="H" value={box?.height} disabled={locked} onCommit={(v) => commitSize('height', v)} />
      </div>
      <StackingOrder id={id} moveNode={moveNode} />
      <label className={styles.lock}>
        <input type="checkbox" checked={locked} onChange={(event) => setLocked(id, event.target.checked)} />
        <span>Lock position</span>
      </label>
    </div>
  )
}

function StackingOrder({
  id,
  moveNode,
}: {
  id: NodeId
  moveNode: (id: NodeId, at: { parentId: NodeId; index: number }) => boolean
}) {
  const node = useNode(id)
  const parent = useNode(node?.parentId ?? id)
  if (!node?.parentId || !parent || parent.kind !== 'element') return null
  const parentId = node.parentId
  const index = parent.children.indexOf(id)
  const last = parent.children.length - 1

  return (
    <div className={styles.order} role="group" aria-label="Stacking order">
      <button type="button" className={styles.orderButton} disabled={index <= 0} onClick={() => moveNode(id, { parentId, index: 0 })}>
        To back
      </button>
      <button type="button" className={styles.orderButton} disabled={index <= 0} onClick={() => moveNode(id, { parentId, index: index - 1 })}>
        Backward
      </button>
      <button type="button" className={styles.orderButton} disabled={index >= last} onClick={() => moveNode(id, { parentId, index: index + 2 })}>
        Forward
      </button>
      <button type="button" className={styles.orderButton} disabled={index >= last} onClick={() => moveNode(id, { parentId, index: last + 1 })}>
        To front
      </button>
    </div>
  )
}
