import { describe, expect, it } from 'vitest'
import { parseHtml } from '../html/parse'
import { childrenOf } from '../model'
import { hasLockedDescendant, isLockedAnywhere, isLockedDeep, type LockMap } from '../lock'

function tree() {
  const doc = parseHtml('<section><div><p>text</p></div></section>')
  const section = childrenOf(doc, doc.rootId)[0]
  const div = childrenOf(doc, section)[0]
  const paragraph = childrenOf(doc, div)[0]
  return { doc, section, div, paragraph }
}

describe('isLockedDeep', () => {
  it('is false when nothing is locked', () => {
    const { doc, paragraph } = tree()
    expect(isLockedDeep(doc, {}, paragraph)).toBe(false)
  })

  it('is true for the locked node itself', () => {
    const { doc, paragraph } = tree()
    const locked: LockMap = { [paragraph]: true }
    expect(isLockedDeep(doc, locked, paragraph)).toBe(true)
  })

  it('is true when an ancestor is locked', () => {
    const { doc, section, paragraph } = tree()
    const locked: LockMap = { [section]: true }
    expect(isLockedDeep(doc, locked, paragraph)).toBe(true)
  })

  it('is false for a missing node', () => {
    const { doc } = tree()
    expect(isLockedDeep(doc, {}, 'nope' as never)).toBe(false)
  })
})

describe('hasLockedDescendant', () => {
  it('ignores the node itself', () => {
    const { doc, div } = tree()
    expect(hasLockedDescendant(doc, { [div]: true }, div)).toBe(false)
  })

  it('finds a lock further down', () => {
    const { doc, section, paragraph } = tree()
    expect(hasLockedDescendant(doc, { [paragraph]: true }, section)).toBe(true)
  })
})

describe('isLockedAnywhere', () => {
  it('covers both directions', () => {
    const { doc, section, div, paragraph } = tree()
    expect(isLockedAnywhere(doc, { [paragraph]: true }, div)).toBe(true)
    expect(isLockedAnywhere(doc, { [section]: true }, div)).toBe(true)
    expect(isLockedAnywhere(doc, {}, div)).toBe(false)
  })
})
