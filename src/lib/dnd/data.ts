import type { NodeId } from '../core/ids'
import type { NodeTemplate } from '../core/store'
import type { LayoutAxis } from './canvasHitbox'

export type DragSurface = 'tree' | 'canvas'

const nodeDragKey = Symbol('adt:node-drag')
const paletteDragKey = Symbol('adt:palette-drag')
const treeTargetKey = Symbol('adt:tree-target')
const canvasTargetKey = Symbol('adt:canvas-target')
const surfaceTargetKey = Symbol('adt:surface-target')

export type NodeDrag = {
  [nodeDragKey]: true
  nodeId: NodeId
  surface: DragSurface
  label: string
}

export type PaletteDrag = {
  [paletteDragKey]: true
  template: NodeTemplate
  label: string
}

export type TreeTarget = {
  [treeTargetKey]: true
  nodeId: NodeId
  level: number
}

export type CanvasTarget = {
  [canvasTargetKey]: true
  nodeId: NodeId
  canNest: boolean
  nestAxis: LayoutAxis
}

export type SurfaceTarget = {
  [surfaceTargetKey]: true
  surface: DragSurface
}

type Data = Record<string | symbol, unknown>

export function nodeDrag(input: Omit<NodeDrag, typeof nodeDragKey>): NodeDrag {
  return { [nodeDragKey]: true, ...input }
}

export function isNodeDrag(data: Data): data is NodeDrag {
  return data[nodeDragKey] === true
}

export function paletteDrag(input: Omit<PaletteDrag, typeof paletteDragKey>): PaletteDrag {
  return { [paletteDragKey]: true, ...input }
}

export function isPaletteDrag(data: Data): data is PaletteDrag {
  return data[paletteDragKey] === true
}

export function treeTarget(input: Omit<TreeTarget, typeof treeTargetKey>): TreeTarget {
  return { [treeTargetKey]: true, ...input }
}

export function isTreeTarget(data: Data): data is TreeTarget {
  return data[treeTargetKey] === true
}

export function canvasTarget(input: Omit<CanvasTarget, typeof canvasTargetKey>): CanvasTarget {
  return { [canvasTargetKey]: true, ...input }
}

export function isCanvasTarget(data: Data): data is CanvasTarget {
  return data[canvasTargetKey] === true
}

export function surfaceTarget(input: Omit<SurfaceTarget, typeof surfaceTargetKey>): SurfaceTarget {
  return { [surfaceTargetKey]: true, ...input }
}

export function isSurfaceTarget(data: Data): data is SurfaceTarget {
  return data[surfaceTargetKey] === true
}

export function isEditorDrag(data: Data): boolean {
  return isNodeDrag(data) || isPaletteDrag(data)
}

export function dragLabel(data: Data): string {
  if (isNodeDrag(data)) return data.label
  if (isPaletteDrag(data)) return data.label
  return 'element'
}
