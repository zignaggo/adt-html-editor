import { describe, expect, it } from 'vitest'
import { parseHtml } from '../html/parse'
import {
  commonParentOf,
  normalizeSelection,
  sameSelection,
  sortByDocumentOrder,
} from '../selection'
import { childrenOf, type EditorDocument } from '../model'

const HTML = '<section id="a"><p id="p1">one</p><p id="p2">two</p></section><aside id="b"></aside>'

function ids(doc: EditorDocument) {
  const section = Object.values(doc.nodes).find((node) => 'tag' in node && node.tag === 'section')!.id
  const aside = Object.values(doc.nodes).find((node) => 'tag' in node && node.tag === 'aside')!.id
  const [p1, p2] = childrenOf(doc, section)
  return { section, aside, p1, p2 }
}

describe('normalizeSelection', () => {
  const doc = parseHtml(HTML)
  const { section, aside, p1, p2 } = ids(doc)

  it('removes duplicates keeping the first occurrence', () => {
    expect(normalizeSelection(doc, [p1, p2, p1])).toEqual([p1, p2])
  })

  it('drops the root and unknown ids', () => {
    expect(normalizeSelection(doc, [doc.rootId, 'missing', p1])).toEqual([p1])
  })

  it('drops descendants of a selected ancestor', () => {
    expect(normalizeSelection(doc, [p1, section])).toEqual([section])
    expect(normalizeSelection(doc, [section, p1])).toEqual([section])
  })

  it('keeps unrelated nodes in the given order', () => {
    expect(normalizeSelection(doc, [aside, p1])).toEqual([aside, p1])
  })
})

describe('sameSelection', () => {
  it('compares length and order', () => {
    expect(sameSelection(['a', 'b'], ['a', 'b'])).toBe(true)
    expect(sameSelection(['a', 'b'], ['b', 'a'])).toBe(false)
    expect(sameSelection(['a'], ['a', 'b'])).toBe(false)
  })
})

describe('sortByDocumentOrder', () => {
  const doc = parseHtml(HTML)
  const { section, aside, p2 } = ids(doc)

  it('returns ids in pre-order regardless of the input order', () => {
    expect(sortByDocumentOrder(doc, [aside, p2, section])).toEqual([section, p2, aside])
  })
})

describe('commonParentOf', () => {
  const doc = parseHtml(HTML)
  const { section, aside, p1, p2 } = ids(doc)

  it('returns the shared parent', () => {
    expect(commonParentOf(doc, [p1, p2])).toBe(section)
  })

  it('returns null when the parents differ', () => {
    expect(commonParentOf(doc, [p1, aside])).toBeNull()
  })

  it('returns null for an empty selection and for root children', () => {
    expect(commonParentOf(doc, [])).toBeNull()
    expect(commonParentOf(doc, [section, aside])).toBeNull()
  })
})
