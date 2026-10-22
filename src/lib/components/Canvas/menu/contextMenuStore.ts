import { Store } from '@tanstack/store'

export type ContextMenuState = {
  open: boolean
  x: number
  y: number
}

const CLOSED: ContextMenuState = { open: false, x: 0, y: 0 }

/** Opened from the canvas interactions, rendered by the menu part — different trees. */
export const contextMenu = new Store<ContextMenuState>(CLOSED)

export function openContextMenu(x: number, y: number): void {
  contextMenu.setState(() => ({ open: true, x, y }))
}

export function closeContextMenu(): void {
  contextMenu.setState((current) => (current.open ? CLOSED : current))
}
