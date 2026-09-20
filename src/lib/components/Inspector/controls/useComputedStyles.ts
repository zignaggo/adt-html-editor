import type { NodeId } from '../../../core/ids'
import { useMeasured } from '../../../fixed/useMeasured'

export type ComputedStyles = Record<string, string>

function sameStyles(a: ComputedStyles, b: ComputedStyles): boolean {
  for (const key in a) if (a[key] !== b[key]) return false
  for (const key in b) if (!(key in a)) return false
  return true
}

export function useComputedStyles(id: NodeId, properties: readonly string[]): ComputedStyles | null {
  const measure = (element: HTMLElement) => {
    const computed = getComputedStyle(element)
    const out: ComputedStyles = {}
    for (const property of properties) out[property] = computed.getPropertyValue(property)
    return out
  }
  return useMeasured(id, measure, sameStyles)
}
