import type { Input } from '@atlaskit/pragmatic-drag-and-drop/types'
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/utils/set-custom-native-drag-preview'
import { pointerOutsideOfPreview } from '@atlaskit/pragmatic-drag-and-drop/utils/pointer-outside-of-preview'
import {
  DRAG_CHIP_CLASS,
  DRAG_CHIP_DETAIL_CLASS,
  DRAG_CHIP_TAG_CLASS,
  DRAG_GHOST_CLASS,
} from './previewStyles'
import { cloneForPreview, scaledWrapper, type PreviewSize } from './snapshot'

export type PreviewContent = {
  label: string
  detail?: string
}

export type ElementPreview = {
  element: HTMLElement
  input: Input
}

type NativeSetDragImage = ((element: Element, x: number, y: number) => void) | null

const MIN_GHOST_PIXELS = 8
const GHOST_WIDTH_RATIO = 0.75
const GHOST_HEIGHT_RATIO = 0.5
const GHOST_WIDTH_FLOOR = 320
const GHOST_HEIGHT_FLOOR = 240

const INHERITED_PROPERTIES = [
  'color',
  'direction',
  'font-family',
  'font-size',
  'font-style',
  'font-weight',
  'letter-spacing',
  'line-height',
  'text-align',
  'text-transform',
  'white-space',
] as const

export function renderDragPreview(
  nativeSetDragImage: NativeSetDragImage,
  content: PreviewContent,
) {
  setCustomNativeDragPreview({
    nativeSetDragImage,
    getOffset: pointerOutsideOfPreview({ x: '12px', y: '8px' }),
    render({ container }) {
      const chip = document.createElement('div')
      chip.className = DRAG_CHIP_CLASS

      const tag = document.createElement('span')
      tag.className = DRAG_CHIP_TAG_CLASS
      tag.textContent = content.label
      chip.appendChild(tag)

      if (content.detail) {
        const detail = document.createElement('span')
        detail.className = DRAG_CHIP_DETAIL_CLASS
        detail.textContent = content.detail
        chip.appendChild(detail)
      }

      container.appendChild(chip)
      return () => chip.remove()
    },
  })
}

export function renderElementPreview(
  nativeSetDragImage: NativeSetDragImage,
  { element, input }: ElementPreview,
): boolean {
  const rect = element.getBoundingClientRect()
  const size = { width: rect.width, height: rect.height }
  if (size.width < MIN_GHOST_PIXELS || size.height < MIN_GHOST_PIXELS) return false

  const scale = ghostScale(size)

  setCustomNativeDragPreview({
    nativeSetDragImage,
    getOffset: () => ({
      x: (input.clientX - rect.left) * scale,
      y: (input.clientY - rect.top) * scale,
    }),
    render({ container }) {
      const ghost = document.createElement('div')
      ghost.className = DRAG_GHOST_CLASS
      ghost.setAttribute('data-adt-styles', 'ready')
      if (element.closest('.adt-dark')) ghost.classList.add('adt-dark')
      ghost.style.width = `${size.width * scale}px`
      ghost.style.height = `${size.height * scale}px`
      inheritFrom(ghost, element)

      const scaled = scaledWrapper(size, scale)
      scaled.appendChild(cloneForPreview(element, size))
      ghost.appendChild(scaled)
      container.appendChild(ghost)
      return () => ghost.remove()
    },
  })

  return true
}

function ghostScale(size: PreviewSize): number {
  const maxWidth = Math.max(GHOST_WIDTH_FLOOR, window.innerWidth * GHOST_WIDTH_RATIO)
  const maxHeight = Math.max(GHOST_HEIGHT_FLOOR, window.innerHeight * GHOST_HEIGHT_RATIO)
  return Math.min(1, maxWidth / size.width, maxHeight / size.height)
}

function inheritFrom(ghost: HTMLElement, element: HTMLElement) {
  const source = element.parentElement ?? element
  const style = getComputedStyle(source)
  for (const property of INHERITED_PROPERTIES) {
    ghost.style.setProperty(property, style.getPropertyValue(property))
  }
}
