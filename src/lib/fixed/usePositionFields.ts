import type { NodeId } from '../core/ids'
import { isStyled } from '../core/model'
import {
  useAspectLocked,
  useEditor,
  useFixedLayout,
  useIsLocked,
  useNode,
} from '../components/Editor/context'
import type { Box, Point } from './geometry'
import { positionDeclarations, sizeDeclarations } from './position'
import { styleOriginOf } from './transform/elementTransform'
import { readLayoutBox } from './transform/layoutBox'
import { useMeasured } from './useMeasured'

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

export type StackingOrder = {
  index: number
  last: number
  toBack: () => void
  backward: () => void
  forward: () => void
  toFront: () => void
}

export type PositionFields = {
  available: boolean
  box: Box | null
  locked: boolean
  setLocked: (locked: boolean) => void
  commitPosition: (axis: 'x' | 'y', value: number) => void
  commitSize: (axis: 'width' | 'height', value: number) => void
  stacking: StackingOrder | null
}

export function usePositionFields(id: NodeId): PositionFields {
  const node = useNode(id)
  const parent = useNode(node?.parentId ?? id)
  const locked = useIsLocked(id)
  const aspectLocked = useAspectLocked()
  const { placeNode, moveNode, setLocked } = useEditor()
  const { precision } = useFixedLayout()
  const measured = useMeasured(id, measurePosition, sameMeasure)

  const styled = node && isStyled(node) ? node : null
  const style = styled?.attrs.style
  const box = measured?.box ?? null

  const stacking: StackingOrder | null =
    node?.parentId && parent && parent.kind === 'element'
      ? (() => {
          const parentId = node.parentId
          const index = parent.children.indexOf(id)
          const last = parent.children.length - 1
          return {
            index,
            last,
            toBack: () => moveNode(id, { parentId, index: 0 }),
            backward: () => moveNode(id, { parentId, index: index - 1 }),
            forward: () => moveNode(id, { parentId, index: index + 2 }),
            toFront: () => moveNode(id, { parentId, index: last + 1 }),
          }
        })()
      : null

  return {
    available: styled !== null,
    box,
    locked,
    setLocked: (value) => setLocked(id, value),
    commitPosition: (axis, value) => {
      if (!styled || !measured || !Number.isFinite(value)) return
      const x = (axis === 'x' ? value : measured.box.x) - measured.origin.x
      const y = (axis === 'y' ? value : measured.box.y) - measured.origin.y
      placeNode(id, { style: positionDeclarations(style, x, y, precision) })
    },
    commitSize: (axis, value) => {
      if (!styled || !Number.isFinite(value) || value <= 0) return
      let width = axis === 'width' ? value : null
      let height = axis === 'height' ? value : null
      if (aspectLocked && box && box.width > 0 && box.height > 0) {
        const ratio = box.width / box.height
        if (width !== null) height = width / ratio
        else if (height !== null) width = height * ratio
      }
      placeNode(id, { style: sizeDeclarations(style, width, height, precision) })
    },
    stacking,
  }
}
