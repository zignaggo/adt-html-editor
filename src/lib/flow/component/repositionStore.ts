import { Store } from '@tanstack/store'

export type RepositionUi = {
  armed: boolean
  highlight: boolean
}

const INITIAL: RepositionUi = { armed: false, highlight: false }

/** Shared by the toolbar button and the canvas overlay, which sit in different trees. */
export const repositionUi = new Store<RepositionUi>(INITIAL)

export function setRepositionArmed(armed: boolean): void {
  repositionUi.setState((current) => (current.armed === armed ? current : { ...current, armed }))
}

export function setRepositionHighlight(highlight: boolean): void {
  repositionUi.setState((current) =>
    current.highlight === highlight ? current : { ...current, highlight },
  )
}

export function resetReposition(): void {
  repositionUi.setState((current) => (current === INITIAL ? current : INITIAL))
}
