import type { NodeId } from '../../core/ids'
import {
  STATE_VARIANTS,
  breakpointOf,
  type Breakpoint,
  type StateVariant,
  type StyleTarget,
} from '../../tailwind/variants'
import { useInspectorContext } from './context'

export type VariantBar = {
  selectedId: NodeId | null
  states: readonly StateVariant[]
  active: StateVariant | null
  breakpoint: Breakpoint
  target: StyleTarget
  isActive: (state: StateVariant) => boolean
  setActive: (state: StateVariant | null) => void
  toggle: (state: StateVariant) => void
  clear: () => void
}

export function useVariantBar(): VariantBar {
  const { selectedId, breakpoint, state, setState, target } = useInspectorContext()
  return {
    selectedId,
    states: STATE_VARIANTS,
    active: state,
    breakpoint: breakpointOf(breakpoint),
    target,
    isActive: (entry) => entry === state,
    setActive: setState,
    toggle: (entry) => setState(entry === state ? null : entry),
    clear: () => setState(null),
  }
}
