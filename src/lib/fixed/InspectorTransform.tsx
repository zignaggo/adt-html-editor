import type { NodeId } from '../core/ids'
import { isStyled } from '../core/model'
import { useInspectorContext } from '../components/Inspector/context'
import { InspectorSection } from '../components/Inspector/InspectorParts'
import {
  useAspectLocked,
  useEditor,
  useEditorContext,
  useFixedLayout,
  useIsLocked,
  useLayoutMode,
  useNode,
} from '../components/Editor/context'
import { formatInlineStyle, parseInlineStyle } from '../style/adapter'
import { NumberField } from './NumberField'
import { sizeDeclarations } from './position'
import { readElementTransform } from './transform/elementTransform'
import { readLayoutBox } from './transform/layoutBox'
import { withRotation } from './transform/transformValue'
import { useMeasured } from './useMeasured'
import inspectorStyles from '../components/Inspector/InspectorPanel.module.css'
import styles from './InspectorPosition.module.css'

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

type Measured = { angle: number; base: number; height: number }

function measureTransform(element: HTMLElement, root: HTMLElement): Measured {
  const box = readLayoutBox(element, root)
  const transform = readElementTransform(element, element.getAttribute('style') ?? undefined, box)
  return { angle: transform.angle, base: transform.base, height: box.height }
}

function sameMeasure(a: Measured, b: Measured): boolean {
  return a.angle === b.angle && a.base === b.base && a.height === b.height
}

function withoutHeight(style: string | undefined): string {
  const declarations = parseInlineStyle(style ?? '')
  declarations.delete('height')
  return formatInlineStyle(declarations)
}

function TransformFields({ id }: { id: NodeId }) {
  const node = useNode(id)
  const locked = useIsLocked(id)
  const aspectLocked = useAspectLocked()
  const { aspectLock } = useEditorContext()
  const { placeNode } = useEditor()
  const { precision } = useFixedLayout()
  const measured = useMeasured(id, measureTransform, sameMeasure)

  if (!node || !isStyled(node)) return null
  const style = node.attrs.style
  const autoHeight = !parseInlineStyle(style ?? '').has('height')

  const commitAngle = (value: number) => {
    if (!measured || !Number.isFinite(value)) return
    placeNode(id, { style: withRotation(style, value - measured.base) })
  }

  const toggleAutoHeight = (enabled: boolean) => {
    if (enabled) {
      placeNode(id, { style: withoutHeight(style) })
      return
    }
    if (measured && measured.height > 0) {
      placeNode(id, { style: sizeDeclarations(style, null, measured.height, precision) })
    }
  }

  return (
    <div className={inspectorStyles.fields}>
      <div className={styles.grid}>
        <NumberField
          label="Angle"
          unit="degrees"
          value={measured?.angle}
          step={1}
          disabled={locked}
          onCommit={commitAngle}
        />
        <button
          type="button"
          className={styles.orderButton}
          disabled={locked || !measured || measured.angle === 0}
          onClick={() => commitAngle(0)}
        >
          Reset rotation
        </button>
      </div>
      <label className={styles.lock}>
        <input
          type="checkbox"
          checked={aspectLocked}
          onChange={(event) => aspectLock.setState(() => event.target.checked)}
        />
        <span>Lock aspect ratio</span>
      </label>
      <label className={styles.lock}>
        <input
          type="checkbox"
          checked={autoHeight}
          disabled={locked}
          onChange={(event) => toggleAutoHeight(event.target.checked)}
        />
        <span>Auto height</span>
      </label>
    </div>
  )
}
