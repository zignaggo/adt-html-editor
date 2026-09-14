import { createContext, useContext } from 'react'
import invariant from 'tiny-invariant'
import type { NodeId } from '../../core/ids'
import type { BreakpointId, StateVariant, StyleTarget } from '../../tailwind/variants'

export type InspectorContextValue = {
  selectedId: NodeId | null
  breakpoint: BreakpointId
  state: StateVariant | null
  setState: (state: StateVariant | null) => void
  target: StyleTarget
  openCategory: string
  setOpenCategory: (id: string) => void
}

export const InspectorContext = createContext<InspectorContextValue | null>(null)

export function useInspectorContext(): InspectorContextValue {
  const value = useContext(InspectorContext)
  invariant(
    value,
    '<HtmlEditor.Inspector> parts must be rendered inside <HtmlEditor.Inspector>',
  )
  return value
}
