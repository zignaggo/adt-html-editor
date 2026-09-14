import { useEffect, useState, type KeyboardEvent } from 'react'
import type { NodeId } from '../core/ids'
import { isStyled } from '../core/model'
import { useInspectorContext } from '../components/Inspector/context'
import { InspectorSection } from '../components/Inspector/InspectorParts'
import {
  useEditor,
  useEditorContext,
  useFixedLayout,
  useIsLocked,
  useLayoutMode,
  useNode,
} from '../components/Editor/context'
import { measureScale, offsetOriginOf, readBox, type Box, type Point } from './geometry'
import { positionDeclarations, sizeDeclarations } from './position'
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

function sameMeasure(a: Measured | null, b: Measured): boolean {
  return (
    a !== null &&
    a.box.x === b.box.x &&
    a.box.y === b.box.y &&
    a.box.width === b.box.width &&
    a.box.height === b.box.height &&
    a.origin.x === b.origin.x &&
    a.origin.y === b.origin.y
  )
}

function useMeasuredBox(id: NodeId): Measured | null {
  const { canvasRootRef } = useEditorContext()
  const { page } = useFixedLayout()
  const [measured, setMeasured] = useState<Measured | null>(null)

  useEffect(() => {
    const root = canvasRootRef.current
    if (!root) return
    let frame = 0

    const measure = () => {
      frame = 0
      const element = root.querySelector<HTMLElement>(`[data-adt-id="${id}"]`)
      if (!element) {
        setMeasured(null)
        return
      }
      const scale = measureScale(root.getBoundingClientRect(), page.width)
      const next: Measured = {
        box: readBox(element, root, scale),
        origin: offsetOriginOf(element, root, scale),
      }
      setMeasured((current) => (sameMeasure(current, next) ? current : next))
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure)
    }

    const mutations = new MutationObserver(schedule)
    mutations.observe(root, { attributes: true, childList: true, subtree: true })
    const resize = new ResizeObserver(schedule)
    resize.observe(root)
    measure()

    return () => {
      cancelAnimationFrame(frame)
      mutations.disconnect()
      resize.disconnect()
    }
  }, [id, canvasRootRef, page.width])

  return measured
}

function PositionFields({ id }: { id: NodeId }) {
  const node = useNode(id)
  const locked = useIsLocked(id)
  const { placeNode, moveNode, setLocked } = useEditor()
  const { precision } = useFixedLayout()
  const measured = useMeasuredBox(id)
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
    placeNode(id, {
      style: sizeDeclarations(
        style,
        axis === 'width' ? value : null,
        axis === 'height' ? value : null,
        precision,
      ),
    })
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

function NumberField({
  label,
  value,
  disabled,
  onCommit,
}: {
  label: string
  value: number | undefined
  disabled: boolean
  onCommit: (value: number) => void
}) {
  const shown = value === undefined ? '' : String(Math.round(value * 100) / 100)
  const commit = (raw: string) => {
    const parsed = Number.parseFloat(raw)
    if (Number.isFinite(parsed)) onCommit(parsed)
  }
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    commit(event.currentTarget.value)
  }
  return (
    <label className={styles.field}>
      <span className={inspectorStyles.fieldLabel}>{label}</span>
      <input
        key={shown}
        type="number"
        className={inspectorStyles.input}
        defaultValue={shown}
        disabled={disabled}
        step={1}
        onBlur={(event) => {
          if (event.target.value !== shown) commit(event.target.value)
        }}
        onKeyDown={onKeyDown}
      />
    </label>
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
