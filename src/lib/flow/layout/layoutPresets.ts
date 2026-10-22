import { MOBILE_TARGET } from '../../tailwind/variants'
import type { StyleReader } from '../capabilities'
import { layoutChildren } from '../component/componentLayout'
import {
  CHILD_BOX_FAMILIES,
  classFamilies,
  LAYOUT_FAMILIES,
  WIDTH_FAMILIES,
  type LayoutEdit,
} from './layoutOperations'

export type RowAlign = 'centres' | 'tops' | 'bottoms'

export const WIDE_SHARE = 0.65

const ROW_ITEMS: Record<RowAlign, string> = {
  centres: 'items-center',
  tops: 'items-start',
  bottoms: 'items-end',
}

const CENTRE_TAGS = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'])

const CENTRE_LIMIT = 4

export const COLUMN_LIMIT = 12

const defaultReader: StyleReader = (element) => getComputedStyle(element)

const layoutRemove = classFamilies(LAYOUT_FAMILIES)

const childRemove = classFamilies(CHILD_BOX_FAMILIES)

const widthRemove = classFamilies(WIDTH_FAMILIES)

export function layoutContainerOf(
  element: HTMLElement,
  read: StyleReader = defaultReader,
): HTMLElement {
  let current = element
  for (;;) {
    const children = layoutChildren(current, read)
    const only = children.length === 1 ? children[0] : null
    if (!only || only.tagName !== 'DIV') return current
    current = only
  }
}

export function widthShareOf(child: HTMLElement, containerWidth: number): number {
  if (containerWidth <= 0) return 1
  return child.getBoundingClientRect().width / containerWidth
}

export function rowContainerEdits(align: RowAlign): LayoutEdit[] {
  return [
    {
      remove: layoutRemove,
      add: ['flex', 'flex-row', 'justify-between', ROW_ITEMS[align], 'gap-6'],
    },
    {
      remove: layoutRemove,
      add: ['flex-col', 'items-center'],
      at: MOBILE_TARGET,
    },
  ]
}

export function rowChildEdits(share: number): LayoutEdit[] {
  const width = share >= WIDE_SHARE ? 'w-auto' : `w-[${Math.max(1, Math.round(share * 100))}%]`
  return [
    { remove: childRemove, add: [width, 'min-w-0', 'max-w-full', 'shrink'] },
    { remove: widthRemove, add: ['w-full'], at: MOBILE_TARGET },
  ]
}

export function canCentreContents(children: readonly HTMLElement[]): boolean {
  if (children.length === 0 || children.length > CENTRE_LIMIT) return false
  return children.every((child) => CENTRE_TAGS.has(child.tagName))
}

export function centreContainerEdits(): LayoutEdit[] {
  return [{ remove: layoutRemove, add: ['flex', 'flex-col', 'items-center', 'justify-center', 'gap-0'] }]
}

export function centreChildEdits(): LayoutEdit[] {
  return [
    {
      remove: classFamilies([...CHILD_BOX_FAMILIES, /^text-(left|center|right|justify)$/, /^-?m[xytrbl]?-/]),
      add: ['block', 'w-full', 'text-center', 'break-words', 'm-0'],
    },
  ]
}

export function columnsContainerEdits(count = 2): LayoutEdit[] {
  const columns = Math.min(Math.max(2, Math.round(count)), COLUMN_LIMIT)
  return [
    { remove: layoutRemove, add: ['grid', `grid-cols-${columns}`, 'gap-6', 'items-start'] },
    { remove: layoutRemove, add: ['grid-cols-1'], at: MOBILE_TARGET },
  ]
}

export function stackContainerEdits(): LayoutEdit[] {
  return [{ remove: layoutRemove, add: ['grid', 'grid-cols-1', 'gap-6', 'items-start'] }]
}
