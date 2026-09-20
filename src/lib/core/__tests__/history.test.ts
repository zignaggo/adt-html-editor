import { describe, expect, it } from 'vitest'
import { createEditorStore } from '../store'
import { childrenOf } from '../model'
import { COALESCE_WINDOW_MS, pushSnapshot, emptyHistory } from '../history'

const HTML = '<section id="a"><p id="p1">one</p><p id="p2">two</p></section><aside id="b"></aside>'

function firstByTag(store: ReturnType<typeof createEditorStore>, tag: string) {
  const { doc } = store.state
  const id = Object.values(doc.nodes).find((node) => 'tag' in node && node.tag === tag)?.id
  if (!id) throw new Error(`no <${tag}>`)
  return id
}

describe('pushSnapshot', () => {
  const snapshot = { doc: {} as never, selectedIds: [] }

  it('pushes when there is no coalesce key', () => {
    const one = pushSnapshot(emptyHistory(), snapshot, null, 1000)
    const two = pushSnapshot(one, snapshot, null, 1010)
    expect(two.past).toHaveLength(2)
  })

  it('coalesces equal keys within the window', () => {
    const one = pushSnapshot(emptyHistory(), snapshot, 'classes:x', 1000)
    const two = pushSnapshot(one, snapshot, 'classes:x', 1000 + COALESCE_WINDOW_MS - 1)
    expect(two.past).toHaveLength(1)
  })

  it('does not coalesce after the window expires', () => {
    const one = pushSnapshot(emptyHistory(), snapshot, 'classes:x', 1000)
    const two = pushSnapshot(one, snapshot, 'classes:x', 1000 + COALESCE_WINDOW_MS + 1)
    expect(two.past).toHaveLength(2)
  })

  it('does not coalesce different keys', () => {
    const one = pushSnapshot(emptyHistory(), snapshot, 'classes:x', 1000)
    const two = pushSnapshot(one, snapshot, 'classes:y', 1005)
    expect(two.past).toHaveLength(2)
  })

  it('clears the future even when coalescing', () => {
    const withFuture = {
      past: [{ snapshot, coalesceKey: 'classes:x', at: 1000 }],
      future: [{ snapshot, coalesceKey: null, at: 900 }],
    }
    expect(pushSnapshot(withFuture, snapshot, 'classes:x', 1100).future).toHaveLength(0)
  })
})

describe('action coalescing in the store', () => {
  it('a setClasses burst on the same node becomes one entry', () => {
    const store = createEditorStore(HTML)
    const section = firstByTag(store, 'section')
    for (let i = 0; i < 50; i += 1) store.actions.setClasses(section, [`p-${i}`])
    expect(store.state.history.past).toHaveLength(1)
  })

  it('one undo after the burst returns to the pre-burst state', () => {
    const store = createEditorStore(HTML)
    const section = firstByTag(store, 'section')
    const before = store.actions.getHtml()
    for (let i = 0; i < 50; i += 1) store.actions.setClasses(section, [`p-${i}`])
    expect(store.actions.getHtml()).toContain('p-49')
    store.actions.undo()
    expect(store.actions.getHtml()).toBe(before)
  })

  it('nodes outside the burst stay intact after undo', () => {
    const store = createEditorStore(HTML)
    const section = firstByTag(store, 'section')
    const aside = firstByTag(store, 'aside')
    store.actions.setClasses(aside, ['ring'])
    const asideHtml = store.actions.getHtml()
    for (let i = 0; i < 30; i += 1) store.actions.setClasses(section, [`m-${i}`])
    store.actions.undo()
    expect(store.actions.getHtml()).toBe(asideHtml)
  })

  it('different nodes do not coalesce with each other', () => {
    const store = createEditorStore(HTML)
    const section = firstByTag(store, 'section')
    const aside = firstByTag(store, 'aside')
    store.actions.setClasses(section, ['flex'])
    store.actions.setClasses(aside, ['grid'])
    expect(store.state.history.past).toHaveLength(2)
  })

  it('structural actions never coalesce', () => {
    const store = createEditorStore(HTML)
    const section = firstByTag(store, 'section')
    const [p1, p2] = childrenOf(store.state.doc, section)
    store.actions.moveNode(p2, { parentId: section, index: 0 })
    store.actions.moveNode(p1, { parentId: section, index: 0 })
    expect(store.state.history.past).toHaveLength(2)
  })

  it('redo after a coalesced burst restores the last value', () => {
    const store = createEditorStore(HTML)
    const section = firstByTag(store, 'section')
    for (let i = 0; i < 20; i += 1) store.actions.setClasses(section, [`p-${i}`])
    const burstResult = store.actions.getHtml()
    store.actions.undo()
    store.actions.redo()
    expect(store.actions.getHtml()).toBe(burstResult)
  })

  it('editing after an undo does not corrupt the discarded redo', () => {
    const store = createEditorStore(HTML)
    const section = firstByTag(store, 'section')
    const aside = firstByTag(store, 'aside')
    const original = store.actions.getHtml()

    store.actions.setClasses(section, ['flex'])
    store.actions.undo()
    expect(store.actions.getHtml()).toBe(original)

    for (let i = 0; i < 20; i += 1) store.actions.setClasses(aside, [`p-${i}`])
    store.actions.undo()
    expect(store.actions.getHtml()).toBe(original)
  })

  it('burst, undo and a new burst with the same key does not corrupt the snapshot', () => {
    const store = createEditorStore(HTML)
    const section = firstByTag(store, 'section')
    const original = store.actions.getHtml()

    for (let i = 0; i < 20; i += 1) store.actions.setClasses(section, [`p-${i}`])
    store.actions.undo()
    expect(store.actions.getHtml()).toBe(original)

    for (let i = 0; i < 20; i += 1) store.actions.setClasses(section, [`m-${i}`])
    expect(store.actions.getHtml()).toContain('m-19')
    store.actions.undo()
    expect(store.actions.getHtml()).toBe(original)
  })

  it('undo in the middle of a burst does not leak intermediate states', () => {
    const store = createEditorStore(HTML)
    const section = firstByTag(store, 'section')
    const original = store.actions.getHtml()

    for (let i = 0; i < 10; i += 1) store.actions.setClasses(section, [`p-${i}`])
    store.actions.undo()
    expect(store.actions.getHtml()).toBe(original)
    for (let i = 0; i < 10; i += 1) store.actions.setClasses(section, [`p-${i}`])
    store.actions.undo()
    expect(store.actions.getHtml()).toBe(original)
    expect(store.state.history.past).toHaveLength(0)
  })

  it('the snapshot node map is never the live map', () => {
    const store = createEditorStore(HTML)
    const section = firstByTag(store, 'section')
    store.actions.setClasses(section, ['flex'])
    for (let i = 0; i < 10; i += 1) store.actions.setClasses(section, [`p-${i}`])
    const snapshotNodes = store.state.history.past[0].snapshot.doc.nodes
    expect(snapshotNodes).not.toBe(store.state.doc.nodes)
    expect((snapshotNodes[section] as { classes: string[] }).classes).toEqual([])
  })

  it('repeated undo/redo converge to the same states', () => {
    const store = createEditorStore(HTML)
    const section = firstByTag(store, 'section')
    const aside = firstByTag(store, 'aside')
    const states = [store.actions.getHtml()]

    store.actions.setClasses(section, ['flex'])
    states.push(store.actions.getHtml())
    store.actions.moveNode(childrenOf(store.state.doc, section)[1], {
      parentId: aside,
      index: 0,
    })
    states.push(store.actions.getHtml())

    store.actions.undo()
    store.actions.undo()
    expect(store.actions.getHtml()).toBe(states[0])
    store.actions.redo()
    expect(store.actions.getHtml()).toBe(states[1])
    store.actions.redo()
    expect(store.actions.getHtml()).toBe(states[2])
    store.actions.undo()
    expect(store.actions.getHtml()).toBe(states[1])
  })
})
