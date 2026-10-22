import { Store } from '@tanstack/store'

export type CopiedStyle = {
  classes: readonly string[]
  style: string | null
}

export const styleClipboard = new Store<CopiedStyle | null>(null)

export function copyStyle(style: CopiedStyle): void {
  styleClipboard.setState(() => style)
}

export function readStyleClipboard(): CopiedStyle | null {
  return styleClipboard.state
}

export function clearStyleClipboard(): void {
  styleClipboard.setState(() => null)
}
