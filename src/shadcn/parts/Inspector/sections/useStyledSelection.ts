import { useNode } from '../../../../lib/components/Editor/context'
import { useInspectorContext } from '../../../../lib/components/Inspector/context'
import type { NodeId } from '../../../../lib/core/ids'
import { isStyled } from '../../../../lib/core/model'
import type { VariantId } from '../../../../lib/tailwind/categories'

export type StyledSelection = {
  id: NodeId
  variant: VariantId
  classes: readonly string[]
}

const NONE: readonly string[] = []

export function useStyledSelection(): StyledSelection | null {
  const { selectedId, variant } = useInspectorContext()
  const node = useNode(selectedId ?? ('' as NodeId))
  if (!selectedId || !node || !isStyled(node)) return null
  return { id: selectedId, variant, classes: node.classes ?? NONE }
}
