import { useNode } from '../../../../lib/components/Editor/context'
import { useInspectorContext } from '../../../../lib/components/Inspector/context'
import type { NodeId } from '../../../../lib/core/ids'
import { isStyled } from '../../../../lib/core/model'
import type { StyleTarget } from '../../../../lib/tailwind/variants'

export type StyledSelection = {
  id: NodeId
  target: StyleTarget
  classes: readonly string[]
}

const NONE: readonly string[] = []

export function useStyledSelection(): StyledSelection | null {
  const { selectedId, target } = useInspectorContext()
  const node = useNode(selectedId ?? ('' as NodeId))
  if (!selectedId || !node || !isStyled(node)) return null
  return { id: selectedId, target, classes: node.classes ?? NONE }
}
