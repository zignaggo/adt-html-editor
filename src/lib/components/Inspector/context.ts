import { createContext, useContext } from 'react'
import invariant from 'tiny-invariant'
import type { NodeId } from '../../core/ids'
import type { VariantId } from '../../tailwind/categories'

export type InspectorContextValue = {
  selectedId: NodeId | null
  variant: VariantId
  setVariant: (variant: VariantId) => void
  openCategory: string
  setOpenCategory: (id: string) => void
}

export const InspectorContext = createContext<InspectorContextValue | null>(null)

export function useInspectorContext(): InspectorContextValue {
  const value = useContext(InspectorContext)
  invariant(
    value,
    'As partes de <HtmlEditor.Inspector> precisam ficar dentro de <HtmlEditor.Inspector>',
  )
  return value
}
