import { describe, expect, it } from 'vitest'
import { parseHtml } from '../../../core/html/parse'
import { serializeHtml } from '../../../core/html/serialize'
import { childrenOf, isLayoutWhitespace } from '../../../core/model'
import { createLayerFilter, flattenTree, rowsBetween } from '../flatten'

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

const PAGE =
  '<section id="hero" class="flex"><h1>Title</h1><p class="lead">Intro</p></section><aside><span class="flex">x</span></aside>'

function labelsOf(html: string, query: string) {
  const doc = parseHtml(html)
  const rows = flattenTree(doc, {}, createLayerFilter(query) ?? undefined)
  return rows.map((row) => {
    const node = doc.nodes[row.id]
    const name = 'value' in node ? node.value : node.tag
    return row.isMatch ? name : `(${name})`
  })
}

describe('flattenTree with a filter', () => {
  it('returns null for a blank query', () => {
    expect(createLayerFilter('')).toBeNull()
    expect(createLayerFilter('   ')).toBeNull()
  })

  it('keeps ancestors of matches, muted', () => {
    expect(labelsOf(PAGE, 'lead')).toEqual(['(section)', 'p'])
  })

  it('matches tag, id, class and text', () => {
    expect(labelsOf(PAGE, 'h1')).toEqual(['(section)', 'h1'])
    expect(labelsOf(PAGE, 'hero')).toEqual(['section'])
    expect(labelsOf(PAGE, 'flex')).toEqual(['section', '(aside)', 'span'])
    expect(labelsOf(PAGE, 'intro')).toEqual(['(section)', '(p)', 'Intro'])
  })

  it('restricts to id or class with # and . prefixes', () => {
    expect(labelsOf(PAGE, '#hero')).toEqual(['section'])
    expect(labelsOf(PAGE, '.hero')).toEqual([])
    expect(labelsOf(PAGE, '.lead')).toEqual(['(section)', 'p'])
  })

  it('requires every word to match', () => {
    expect(labelsOf(PAGE, 'span flex')).toEqual(['(aside)', 'span'])
    expect(labelsOf(PAGE, 'span lead')).toEqual([])
  })

  it('ignores collapsed state while filtering', () => {
    const doc = parseHtml(PAGE)
    const section = childrenOf(doc, doc.rootId)[0]
    const rows = flattenTree(doc, { [section]: true }, createLayerFilter('lead') ?? undefined)
    expect(rows.map((row) => row.level)).toEqual([0, 1])
    expect(rows[0].mode).toBe('expanded')
  })

  it('keeps hasChildren for matched elements whose children are hidden', () => {
    const doc = parseHtml(PAGE)
    const rows = flattenTree(doc, {}, createLayerFilter('#hero') ?? undefined)
    expect(rows).toHaveLength(1)
    expect(rows[0].hasChildren).toBe(true)
    expect(rows[0].mode).toBe('last-in-group')
  })
})

describe('rowsBetween', () => {
  const rows = ['a', 'b', 'c', 'd'].map((id) => ({
    id,
    level: 0,
    mode: 'standard' as const,
    hasChildren: false,
    isMatch: true,
  }))

  it('walks forward from the anchor', () => {
    expect(rowsBetween(rows, 'b', 'd')).toEqual(['b', 'c', 'd'])
  })

  it('walks backward and keeps the anchor first', () => {
    expect(rowsBetween(rows, 'c', 'a')).toEqual(['c', 'a', 'b'])
  })

  it('falls back to the target when the anchor is not visible', () => {
    expect(rowsBetween(rows, 'zz', 'c')).toEqual(['c'])
    expect(rowsBetween(rows, null, 'c')).toEqual(['c'])
  })

  it('returns a single id when anchor and target match', () => {
    expect(rowsBetween(rows, 'b', 'b')).toEqual(['b'])
  })
})
