import { describe, expect, it } from 'vitest'
import { parseHtml } from '../../../core/html/parse'
import { serializeHtml } from '../../../core/html/serialize'
import { childrenOf, isLayoutWhitespace } from '../../../core/model'
import { flattenTree } from '../flatten'

// Line breaks between inlines are preserved by the parser (they affect spacing on the canvas).
const NAV = '<nav>\n  <a href="#a">A</a>\n  <a href="#b">B</a>\n</nav>'

describe('flattenTree', () => {
  it('does not show layout whitespace as a row', () => {
    const doc = parseHtml(NAV)
    const nav = childrenOf(doc, doc.rootId)[0]
    expect(childrenOf(doc, nav).some((id) => isLayoutWhitespace(doc.nodes[id]))).toBe(true)

    const rows = flattenTree(doc, {})
    expect(rows.some((row) => isLayoutWhitespace(doc.nodes[row.id]))).toBe(false)
    const labels = rows.map((row) => {
      const node = doc.nodes[row.id]
      return node.kind === 'element' ? node.tag : node.kind
    })
    // nav > a > "A", a > "B" — link texts are content and keep showing up.
    expect(labels).toEqual(['nav', 'a', 'text', 'a', 'text'])
    expect(rows.filter((row) => row.level === 1)).toHaveLength(2)
    expect(rows.at(-1)?.mode).toBe('last-in-group')
  })

  it('element whose only children are whitespace gets no chevron', () => {
    const doc = parseHtml('<div>\n  <img src="x.png"> </div><p>\n</p>')
    const rows = flattenTree(doc, {})
    const byTag = Object.fromEntries(
      rows.map((row) => {
        const node = doc.nodes[row.id]
        return [node.kind === 'element' ? node.tag : node.kind, row]
      }),
    )
    expect(byTag.div.hasChildren).toBe(true)
    expect(byTag.p.hasChildren).toBe(false)
    expect(rows.map((row) => row.level)).toEqual([0, 1, 0])
  })

  it('keeps text with content as a row', () => {
    const doc = parseHtml('<p>hello <b>world</b></p>')
    const rows = flattenTree(doc, {})
    expect(rows.map((row) => doc.nodes[row.id].kind)).toEqual(['element', 'text', 'element', 'text'])
  })

  it('hiding in the panel does not change the output HTML', () => {
    expect(serializeHtml(parseHtml(NAV))).toBe(NAV)
  })
})
