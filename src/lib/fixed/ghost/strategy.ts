import type { Input } from '@atlaskit/pragmatic-drag-and-drop/types'
import type { Box, Point, Size } from '../geometry'
import styles from './ghost.module.css'

export type NativeSetDragImage = DataTransfer['setDragImage'] | null

export type GhostPreviewArgs = {
  nativeSetDragImage: NativeSetDragImage
  element: HTMLElement
  input: Input
  scale: number
}

export type GhostMember = {
  element: HTMLElement | null
  offset: Point
  size: Size
}

export type GhostStartArgs = {
  layer: HTMLElement
  origin: Box
  size: Size
  members: GhostMember[]
}

export type GhostStrategy = {
  id: string
  hidesNativePreview: boolean
  generatePreview: (args: GhostPreviewArgs) => void
  start: (args: GhostStartArgs) => void
  move: (position: Point) => void
  end: (args: { cancelled: boolean }) => void
}

export function createGhostBox(layer: HTMLElement, size: Size, className: string): HTMLDivElement {
  const box = document.createElement('div')
  box.className = `${styles.box} ${className}`
  box.style.width = `${size.width}px`
  box.style.height = `${size.height}px`
  layer.appendChild(box)
  return box
}

export function moveGhostBox(box: HTMLElement, position: Point) {
  box.style.transform = `translate3d(${position.x}px, ${position.y}px, 0)`
}

export function createOutlineStrategy(): GhostStrategy {
  let target: HTMLDivElement | null = null
  return {
    id: 'outline',
    hidesNativePreview: false,
    generatePreview() {},
    start({ layer, origin, size }) {
      target = createGhostBox(layer, size, styles.target)
      moveGhostBox(target, origin)
    },
    move(position) {
      if (target) moveGhostBox(target, position)
    },
    end() {
      target?.remove()
      target = null
    },
  }
}

export const outlineStrategy = createOutlineStrategy()
