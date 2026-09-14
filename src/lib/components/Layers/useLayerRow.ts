import { useState, type FocusEvent, type MouseEvent } from 'react'
import type { ItemMode } from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item'
import type { NodeId } from '../../core/ids'
import { isRoot, labelOf, type AnyNode } from '../../core/model'
import { useNodeDraggable } from '../../dnd/useNodeDraggable'
import { INDENT_PER_LEVEL, useTreeDropTarget } from '../../dnd/useTreeDropTarget'
import { useEditor, useIsCollapsed, useIsSelected, useNode } from '../Editor/context'

export type UseLayerRowOptions = {
  id: NodeId
  level: number
  mode: ItemMode
  hasChildren: boolean
  isFocusable?: boolean
}

export type LayerRowAria = {
  role: 'treeitem'
  'aria-level': number
  'aria-selected': boolean
  'aria-expanded': boolean | undefined
  tabIndex: number
  'data-node-id': NodeId
  'data-kind': AnyNode['kind']
  'data-dragging': true | undefined
  'data-selected': true | undefined
  onClick: (event: MouseEvent<HTMLElement>) => void
  onFocus: (event: FocusEvent<HTMLElement>) => void
}

export type LayerRowChevron = {
  type: 'button'
  tabIndex: -1
  'aria-label': string
  'data-collapsed': true | undefined
  onClick: (event: MouseEvent<HTMLElement>) => void
}

export type LayerRow = {
  setElement: (element: HTMLElement | null) => void
  node: AnyNode | undefined
  label: string
  classes: string[]
  isDragging: boolean
  isSelected: boolean
  isCollapsed: boolean
  indent: number
  select: () => void
  toggleCollapsed: () => void
  rowProps: LayerRowAria
  chevronProps: LayerRowChevron
}

export function useLayerRow({
  id,
  level,
  mode,
  hasChildren,
  isFocusable = false,
}: UseLayerRowOptions): LayerRow {
  const [element, setElement] = useState<HTMLElement | null>(null)
  const node = useNode(id)
  const isSelected = useIsSelected(id)
  const isCollapsed = useIsCollapsed(id)
  const { select, toggleCollapsed } = useEditor()

  const isDragging = useNodeDraggable(element, id, 'tree', node ? !isRoot(node) : false)
  useTreeDropTarget(element, id, level, mode)

  const selectSelf = () => select(id)
  const toggleSelf = () => toggleCollapsed(id)

  const label = node ? labelOf(node) : id

  return {
    setElement,
    node,
    label,
    classes: node && 'classes' in node ? node.classes : EMPTY_CLASSES,
    isDragging,
    isSelected,
    isCollapsed,
    indent: level * INDENT_PER_LEVEL + 4,
    select: selectSelf,
    toggleCollapsed: toggleSelf,
    rowProps: {
      role: 'treeitem',
      'aria-level': level + 1,
      'aria-selected': isSelected,
      'aria-expanded': hasChildren ? !isCollapsed : undefined,
      tabIndex: isFocusable ? 0 : -1,
      'data-node-id': id,
      'data-kind': node?.kind ?? 'element',
      'data-dragging': isDragging || undefined,
      'data-selected': isSelected || undefined,
      onClick: selectSelf,
      onFocus: selectSelf,
    },
    chevronProps: {
      type: 'button',
      tabIndex: -1,
      'aria-label': isCollapsed ? `Expand ${label}` : `Collapse ${label}`,
      'data-collapsed': isCollapsed || undefined,
      onClick: (event) => {
        event.stopPropagation()
        toggleSelf()
      },
    },
  }
}

const EMPTY_CLASSES: string[] = []
