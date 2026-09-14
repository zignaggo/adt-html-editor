import type { Size } from '../geometry'

export function cloneForPreview(element: HTMLElement, size: Size, scale: number): HTMLElement {
  const clone = element.cloneNode(true) as HTMLElement
  clone.removeAttribute('data-adt-id')
  clone.removeAttribute('data-adt-fixed-dragging')
  clone.removeAttribute('contenteditable')
  clone.removeAttribute('draggable')
  clone.removeAttribute('id')
  for (const node of clone.querySelectorAll('[data-adt-id]')) node.removeAttribute('data-adt-id')
  for (const image of clone.querySelectorAll('img')) image.draggable = false

  clone.style.position = 'absolute'
  clone.style.left = '0'
  clone.style.top = '0'
  clone.style.right = 'auto'
  clone.style.bottom = 'auto'
  clone.style.margin = '0'
  clone.style.boxSizing = 'border-box'
  clone.style.width = `${size.width}px`
  clone.style.height = `${size.height}px`
  clone.style.transformOrigin = '0 0'
  clone.style.transform = scale === 1 ? '' : `scale(${scale})`
  clone.style.pointerEvents = 'none'
  return clone
}
