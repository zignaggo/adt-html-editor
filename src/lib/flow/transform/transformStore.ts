import { Store } from '@tanstack/store'

export type TransformUi = {
  active: boolean
}

const INITIAL: TransformUi = { active: false }

/**
 * Shared by the inspector section and the canvas, which sit in different trees. Kept free of
 * imports so the reposition side can turn it off without the two stores depending on each other.
 */
export const transformUi = new Store<TransformUi>(INITIAL)

export function setTransformActive(active: boolean): void {
  transformUi.setState((current) => (current.active === active ? current : { active }))
}

export function resetTransform(): void {
  setTransformActive(false)
}
