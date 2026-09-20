import type { NodeId } from '../core/ids'
import { isStyled } from '../core/model'
import {
  useAspectLocked,
  useEditor,
  useEditorContext,
  useFixedLayout,
  useIsLocked,
  useNode,
} from '../components/Editor/context'
import { formatInlineStyle, parseInlineStyle } from '../style/adapter'
import { sizeDeclarations } from './position'
import { readElementTransform } from './transform/elementTransform'
import { readLayoutBox } from './transform/layoutBox'
import { withRotation } from './transform/transformValue'
import { useMeasured } from './useMeasured'

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

export type TransformFields = {
  available: boolean
  angle: number | null
  locked: boolean
  autoHeight: boolean
  aspectLocked: boolean
  commitAngle: (value: number) => void
  resetRotation: () => void
  setAutoHeight: (enabled: boolean) => void
  setAspectLocked: (locked: boolean) => void
}

export function useTransformFields(id: NodeId): TransformFields {
  const node = useNode(id)
  const locked = useIsLocked(id)
  const aspectLocked = useAspectLocked()
  const { aspectLock } = useEditorContext()
  const { placeNode } = useEditor()
  const { precision } = useFixedLayout()
  const measured = useMeasured(id, measureTransform, sameMeasure)

  const styled = node && isStyled(node) ? node : null
  const style = styled?.attrs.style

  const commitAngle = (value: number) => {
    if (!styled || !measured || !Number.isFinite(value)) return
    placeNode(id, { style: withRotation(style, value - measured.base) })
  }

  return {
    available: styled !== null,
    angle: measured?.angle ?? null,
    locked,
    autoHeight: !parseInlineStyle(style ?? '').has('height'),
    aspectLocked,
    commitAngle,
    resetRotation: () => commitAngle(0),
    setAutoHeight: (enabled) => {
      if (!styled) return
      if (enabled) {
        placeNode(id, { style: withoutHeight(style) })
        return
      }
      if (measured && measured.height > 0) {
        placeNode(id, { style: sizeDeclarations(style, null, measured.height, precision) })
      }
    },
    setAspectLocked: (value) => aspectLock.setState(() => value),
  }
}
