import { createIdFactory, type NodeId } from '../ids'
import { extractOpaqueContent, restoreOpaqueContent } from './opaque'
import {
  INLINE_TAGS,
  OPAQUE_TAGS,
  PRESERVE_WHITESPACE_TAGS,
  ROOT_TAG,
  type AnyNode,
  type EditorDocument,
  type ElementNode,
  type Envelope,
} from '../model'

const FULL_DOCUMENT = /<(?:html|head|body)[\s>]/i

export function looksLikeFullDocument(html: string): boolean {
  return FULL_DOCUMENT.test(html)
}

function readAttrs(el: Element) {
  const attrs: Record<string, string> = {}
  const attrOrder: string[] = []
  let classes: string[] = []
  for (const attr of el.attributes) {
    attrOrder.push(attr.name)
    if (attr.name === 'class') {
      classes = attr.value.trim().split(/\s+/).filter(Boolean)
    } else {
      attrs[attr.name] = attr.value
    }
  }
  if (classes.length === 0) {
    const index = attrOrder.indexOf('class')
    if (index !== -1) attrOrder.splice(index, 1)
  }
  return { attrs, attrOrder, classes }
}

function isInlineish(node: Node | null): boolean {
  if (!node) return false
  if (node.nodeType === Node.TEXT_NODE) return true
  if (node.nodeType !== Node.ELEMENT_NODE) return false
  return INLINE_TAGS.has((node as Element).tagName.toLowerCase())
}

function isDroppableWhitespace(node: Text, parentTag: string): boolean {
  if (node.data.trim().length > 0) return false
  if (PRESERVE_WHITESPACE_TAGS.has(parentTag)) return false
  return !isInlineish(node.previousSibling) && !isInlineish(node.nextSibling)
}

function serializeAttrs(el: Element): string {
  let out = ''
  for (const attr of el.attributes) {
    out += ` ${attr.name}="${attr.value.replaceAll('&', '&amp;').replaceAll('"', '&quot;')}"`
  }
  return out
}

export function parseHtml(html: string): EditorDocument {
  const nextId = createIdFactory()
  const nodes: Record<NodeId, AnyNode> = {}
  const rootId = nextId()

  const isFull = looksLikeFullDocument(html)
  const { html: tokenized, byToken } = extractOpaqueContent(html)
  let container: Element
  let envelope: Envelope

  if (isFull) {
    const parsed = new DOMParser().parseFromString(tokenized, 'text/html')
    const doctype = parsed.doctype
      ? `<!DOCTYPE ${parsed.doctype.name}${parsed.doctype.publicId ? ` PUBLIC "${parsed.doctype.publicId}"` : ''}${parsed.doctype.systemId ? ` "${parsed.doctype.systemId}"` : ''}>`
      : ''
    envelope = {
      kind: 'document',
      doctype,
      htmlAttrs: serializeAttrs(parsed.documentElement),
      head: restoreOpaqueContent(parsed.head.innerHTML, byToken),
      bodyAttrs: serializeAttrs(parsed.body),
    }
    container = parsed.body
  } else {
    const template = document.createElement('template')
    template.innerHTML = tokenized
    const holder = document.createElement('div')
    holder.append(template.content)
    envelope = { kind: 'fragment' }
    container = holder
  }

  const root: ElementNode = {
    id: rootId,
    kind: 'element',
    tag: ROOT_TAG,
    attrs: {},
    attrOrder: [],
    classes: [],
    parentId: null,
    children: [],
  }
  nodes[rootId] = root

  function visit(domNode: Node, parentId: NodeId, parentTag: string): NodeId | null {
    if (domNode.nodeType === Node.TEXT_NODE) {
      const text = domNode as Text
      if (isDroppableWhitespace(text, parentTag)) return null
      const id = nextId()
      nodes[id] = { id, kind: 'text', value: text.data, parentId }
      return id
    }

    if (domNode.nodeType === Node.COMMENT_NODE) {
      const id = nextId()
      nodes[id] = { id, kind: 'comment', value: (domNode as Comment).data, parentId }
      return id
    }

    if (domNode.nodeType !== Node.ELEMENT_NODE) return null

    const el = domNode as Element
    const tag = el.tagName.toLowerCase()
    const { attrs, attrOrder, classes } = readAttrs(el)
    const id = nextId()

    if (OPAQUE_TAGS.has(tag)) {
      nodes[id] = {
        id,
        kind: 'opaque',
        tag,
        attrs,
        attrOrder,
        classes,
        rawInnerHtml: restoreOpaqueContent(el.innerHTML, byToken),
        parentId,
      }
      return id
    }

    const element: ElementNode = {
      id,
      kind: 'element',
      tag,
      attrs,
      attrOrder,
      classes,
      parentId,
      children: [],
    }
    nodes[id] = element
    for (const child of Array.from(el.childNodes)) {
      const childId = visit(child, id, tag)
      if (childId) element.children.push(childId)
    }
    return id
  }

  for (const child of Array.from(container.childNodes)) {
    const childId = visit(child, rootId, isFull ? 'body' : 'div')
    if (childId) root.children.push(childId)
  }

  return { rootId, nodes, envelope }
}

export function createEmptyDocument(): EditorDocument {
  return parseHtml('')
}
