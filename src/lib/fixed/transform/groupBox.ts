import type { NodeId } from '../../core/ids'
import type { Box, Size } from '../geometry'
import { readLayoutBox } from './layoutBox'

export function unionBoxes(boxes: readonly Box[]): Box | null {
  if (boxes.length === 0) return null
  let left = Infinity
  let top = Infinity
  let right = -Infinity
  let bottom = -Infinity
  for (const box of boxes) {
    left = Math.min(left, box.x)
    top = Math.min(top, box.y)
    right = Math.max(right, box.x + box.width)
    bottom = Math.max(bottom, box.y + box.height)
  }
  return { x: left, y: top, width: right - left, height: bottom - top }
}

export function scaleBoxWithin(member: Box, from: Box, to: Box): Box {
  const scaleX = from.width > 0 ? to.width / from.width : 1
  const scaleY = from.height > 0 ? to.height / from.height : 1
  return {
    x: to.x + (member.x - from.x) * scaleX,
    y: to.y + (member.y - from.y) * scaleY,
    width: member.width * scaleX,
    height: member.height * scaleY,
  }
}

export function minGroupSize(members: readonly Box[], group: Box, min: number): Size {
  let width = min
  let height = min
  for (const member of members) {
    if (member.width > 0 && group.width > 0) {
      width = Math.max(width, (min * group.width) / member.width)
    }
    if (member.height > 0 && group.height > 0) {
      height = Math.max(height, (min * group.height) / member.height)
    }
  }
  return { width, height }
}

export function readGroupBox(
  root: HTMLElement,
  ids: readonly NodeId[],
): { box: Box; elements: HTMLElement[] } | null {
  const elements: HTMLElement[] = []
  const boxes: Box[] = []
  for (const id of ids) {
    const element = root.querySelector<HTMLElement>(`[data-adt-id="${id}"]`)
    if (!element) continue
    elements.push(element)
    boxes.push(readLayoutBox(element, root))
  }
  const box = unionBoxes(boxes)
  return box ? { box, elements } : null
}
