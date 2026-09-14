import type { EditorDocument } from '../core/model'
import { parseInlineStyle } from '../style/adapter'
import { pageContainerOf } from './pageContainer'

export type PageSize = { width: number; height: number }

const META_TAG = /<meta\b[^>]*>/gi
const ATTRIBUTE = /([a-zA-Z-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g

function attributesOf(tag: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const match of tag.matchAll(ATTRIBUTE)) {
    out[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? ''
  }
  return out
}

function dimension(content: string, name: string): number | null {
  for (const part of content.split(/[,;]/)) {
    const separator = part.indexOf('=')
    if (separator === -1) continue
    if (part.slice(0, separator).trim().toLowerCase() !== name) continue
    const value = Number.parseFloat(part.slice(separator + 1).trim())
    return Number.isFinite(value) && value > 0 ? value : null
  }
  return null
}

export function readViewportMeta(head: string): PageSize | null {
  for (const match of head.matchAll(META_TAG)) {
    const attrs = attributesOf(match[0])
    if (attrs.name?.toLowerCase() !== 'viewport' || !attrs.content) continue
    const width = dimension(attrs.content, 'width')
    const height = dimension(attrs.content, 'height')
    return width && height ? { width, height } : null
  }
  return null
}

export function pageSizeOf(doc: EditorDocument): PageSize | null {
  return doc.envelope.kind === 'document' ? readViewportMeta(doc.envelope.head) : null
}

const ABSOLUTE_RATIO = 0.8

export function detectLayout(doc: EditorDocument): 'fixed' | 'flow' {
  if (pageSizeOf(doc)) return 'fixed'
  const container = doc.nodes[pageContainerOf(doc)]
  if (!container || container.kind !== 'element') return 'flow'

  let elements = 0
  let positioned = 0
  for (const childId of container.children) {
    const child = doc.nodes[childId]
    if (!child || (child.kind !== 'element' && child.kind !== 'opaque')) continue
    elements += 1
    const position = parseInlineStyle(child.attrs.style ?? '').get('position')
    if (position === 'absolute' || position === 'fixed') positioned += 1
  }
  return elements > 0 && positioned / elements >= ABSOLUTE_RATIO ? 'fixed' : 'flow'
}
