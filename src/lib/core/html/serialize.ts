import type { NodeId } from '../ids'
import { uniqueToken } from './token'
import { VOID_TAGS, type EditorDocument, type OpaqueNode, type StyledNode } from '../model'

function escapeAttrValue(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('\u00a0', '&nbsp;')
    .replaceAll('"', '&quot;')
}

function attrString(node: StyledNode): string {
  let out = ''
  for (const name of node.attrOrder) {
    if (name === 'class') {
      if (node.classes.length === 0) continue
      out += ` class="${escapeAttrValue(node.classes.join(' '))}"`
      continue
    }
    const value = node.attrs[name]
    if (value === undefined) continue
    out += ` ${name}="${escapeAttrValue(value)}"`
  }
  return out
}

function opaqueHtml(node: OpaqueNode): string {
  return `<${node.tag}${attrString(node)}>${node.rawInnerHtml}</${node.tag}>`
}

export function serializeHtml(doc: EditorDocument): string {
  const opaqueByToken = new Map<string, string>()

  function build(id: NodeId): Node | null {
    const node = doc.nodes[id]
    if (!node) return null

    if (node.kind === 'text') return document.createTextNode(node.value)
    if (node.kind === 'comment') return document.createComment(node.value)

    if (node.kind === 'opaque') {
      const html = opaqueHtml(node)
      const token = uniqueToken('OPQ', html)
      opaqueByToken.set(token, html)
      return document.createTextNode(token)
    }

    const el = document.createElement(node.tag)
    for (const name of node.attrOrder) {
      if (name === 'class') {
        if (node.classes.length > 0) el.setAttribute('class', node.classes.join(' '))
        continue
      }
      const value = node.attrs[name]
      if (value !== undefined) el.setAttribute(name, value)
    }
    if (!VOID_TAGS.has(node.tag)) {
      for (const childId of node.children) {
        const child = build(childId)
        if (child) el.appendChild(child)
      }
    }
    return el
  }

  const holder = document.createElement('div')
  const root = doc.nodes[doc.rootId]
  if (root && root.kind === 'element') {
    for (const childId of root.children) {
      const child = build(childId)
      if (child) holder.appendChild(child)
    }
  }

  let body = holder.innerHTML
  for (const [token, html] of opaqueByToken) body = body.replaceAll(token, html)

  if (doc.envelope.kind === 'fragment') return body

  const { doctype, htmlAttrs, head, bodyAttrs } = doc.envelope
  return `${doctype}<html${htmlAttrs}><head>${head}</head><body${bodyAttrs}>${body}</body></html>`
}
