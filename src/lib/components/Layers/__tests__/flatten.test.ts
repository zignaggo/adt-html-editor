import { describe, expect, it } from 'vitest'
import { parseHtml } from '../../../core/html/parse'
import { serializeHtml } from '../../../core/html/serialize'
import { childrenOf, isLayoutWhitespace } from '../../../core/model'
import { flattenTree } from '../flatten'

// Quebras de linha entre inlines são preservadas pelo parser (afetam o espaçamento no canvas).
const NAV = '<nav>\n  <a href="#a">A</a>\n  <a href="#b">B</a>\n</nav>'

describe('flattenTree', () => {
  it('não mostra whitespace de layout como linha', () => {
    const doc = parseHtml(NAV)
    const nav = childrenOf(doc, doc.rootId)[0]
    expect(childrenOf(doc, nav).some((id) => isLayoutWhitespace(doc.nodes[id]))).toBe(true)

    const rows = flattenTree(doc, {})
    expect(rows.some((row) => isLayoutWhitespace(doc.nodes[row.id]))).toBe(false)
    const labels = rows.map((row) => {
      const node = doc.nodes[row.id]
      return node.kind === 'element' ? node.tag : node.kind
    })
    // nav > a > "A", a > "B" — os textos dos links são conteúdo e continuam aparecendo.
    expect(labels).toEqual(['nav', 'a', 'text', 'a', 'text'])
    expect(rows.filter((row) => row.level === 1)).toHaveLength(2)
    expect(rows.at(-1)?.mode).toBe('last-in-group')
  })

  it('elemento cujos únicos filhos são whitespace não ganha chevron', () => {
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

  it('mantém texto com conteúdo como linha', () => {
    const doc = parseHtml('<p>olá <b>mundo</b></p>')
    const rows = flattenTree(doc, {})
    expect(rows.map((row) => doc.nodes[row.id].kind)).toEqual(['element', 'text', 'element', 'text'])
  })

  it('esconder no painel não altera o HTML de saída', () => {
    expect(serializeHtml(parseHtml(NAV))).toBe(NAV)
  })
})
