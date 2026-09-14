import { VARIANTS, type VariantId } from '../../tailwind/categories'
import type { NodeId } from '../../core/ids'
import { useInspectorContext } from './context'

export type VariantBar = {
  selectedId: NodeId | null
  variants: readonly VariantId[]
  active: VariantId
  isActive: (variant: VariantId) => boolean
  setActive: (variant: VariantId) => void
}

export function useVariantBar(): VariantBar {
  const { selectedId, variant, setVariant } = useInspectorContext()
  return {
    selectedId,
    variants: VARIANTS,
    active: variant,
    isActive: (entry) => entry === variant,
    setActive: setVariant,
  }
}
