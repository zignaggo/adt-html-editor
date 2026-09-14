import type { Box, Point } from '../geometry'

function offsetParentOf(element: HTMLElement, origin: Element): HTMLElement | null {
  const parent = element.offsetParent
  if (!(parent instanceof HTMLElement) || parent === origin || !origin.contains(parent)) return null
  return parent
}

export function readLayoutBox(element: HTMLElement, origin: Element): Box {
  let x = element.offsetLeft
  let y = element.offsetTop
  let parent = offsetParentOf(element, origin)
  while (parent) {
    x += parent.offsetLeft + parent.clientLeft
    y += parent.offsetTop + parent.clientTop
    parent = offsetParentOf(parent, origin)
  }
  return { x, y, width: element.offsetWidth, height: element.offsetHeight }
}

export function layoutOriginOf(element: HTMLElement, origin: Element): Point {
  const parent = offsetParentOf(element, origin)
  if (!parent) return { x: 0, y: 0 }
  const box = readLayoutBox(parent, origin)
  return { x: box.x + parent.clientLeft, y: box.y + parent.clientTop }
}

export function hasTransformedAncestor(element: HTMLElement, origin: Element): boolean {
  let current = element.parentElement
  while (current && current !== origin) {
    const transform = getComputedStyle(current).transform
    if (transform && transform !== 'none') return true
    current = current.parentElement
  }
  return false
}
