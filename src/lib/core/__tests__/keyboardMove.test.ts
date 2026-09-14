import { describe, expect, it } from 'vitest'
import { parseHtml } from '../html/parse'
import { childrenOf } from '../model'
import { MOVE_KEYS, resolveKeyboardMove } from '../keyboardMove'
import { createEditorStore } from '../store'

const HTML =
  '<section id="s"><p id="p1">one</p><p id="p2">two</p><p id="p3">three</p></section><aside id="a"><img src="x.png"><span id="sp">t</span></aside>'

function ids(doc = parseHtml(HTML)) {
  const roots = childrenOf(doc, doc.rootId)
  const [section, aside] = roots
  const [p1, p2, p3] = childrenOf(doc, section)
  const [img, span] = childrenOf(doc, aside)
  return { doc, roots, section, aside, p1, p2, p3, img, span }
}

describe('MOVE_KEYS', () => {
  it('maps arrow keys to directions', () => {
    expect(MOVE_KEYS.ArrowUp).toBe('up')
    expect(MOVE_KEYS.ArrowDown).toBe('down')
    expect(MOVE_KEYS.ArrowLeft).toBe('out')
    expect(MOVE_KEYS.ArrowRight).toBe('in')
    expect(MOVE_KEYS.Enter).toBeUndefined()
  })
})

describe('resolveKeyboardMove', () => {
  it('moves up among siblings', () => {
    const { doc, section, p2 } = ids()
    expect(resolveKeyboardMove(doc, p2, 'up')).toEqual({ parentId: section, index: 0 })
  })

  it('moves down among siblings', () => {
    const { doc, section, p1 } = ids()
    expect(resolveKeyboardMove(doc, p1, 'down')).toEqual({ parentId: section, index: 2 })
  })

  it('does not move up past the first sibling', () => {
    const { doc, p1 } = ids()
    expect(resolveKeyboardMove(doc, p1, 'up')).toBeNull()
  })

  it('does not move down past the last sibling', () => {
    const { doc, p3 } = ids()
    expect(resolveKeyboardMove(doc, p3, 'down')).toBeNull()
  })

  it('moves out to the grandparent, right after the parent', () => {
    const { doc, roots, section, p1 } = ids()
    expect(resolveKeyboardMove(doc, p1, 'out')).toEqual({
      parentId: doc.rootId,
      index: roots.indexOf(section) + 1,
    })
  })

  it('does not move out when already at root level', () => {
    const { doc, section } = ids()
    expect(resolveKeyboardMove(doc, section, 'out')).toBeNull()
  })

  it('moves into the previous sibling as its last child', () => {
    const { doc, section, aside } = ids()
    expect(resolveKeyboardMove(doc, aside, 'in')).toEqual({
      parentId: section,
      index: childrenOf(doc, section).length,
    })
  })

  it('does not move in when there is no previous sibling', () => {
    const { doc, section } = ids()
    expect(resolveKeyboardMove(doc, section, 'in')).toBeNull()
  })

  it('does not move into a void tag', () => {
    const { doc, span } = ids()
    expect(resolveKeyboardMove(doc, span, 'in')).toBeNull()
  })

  it('does not move into a text node', () => {
    const textDoc = parseHtml('<div>loose text<p id="p">x</p></div>')
    const div = childrenOf(textDoc, textDoc.rootId)[0]
    const [, p] = childrenOf(textDoc, div)
    expect(resolveKeyboardMove(textDoc, p, 'in')).toBeNull()
  })

  it('refuses to move the root', () => {
    const { doc } = ids()
    for (const direction of ['up', 'down', 'out', 'in'] as const) {
      expect(resolveKeyboardMove(doc, doc.rootId, direction)).toBeNull()
    }
  })

  it('refuses a nonexistent id', () => {
    const { doc } = ids()
    expect(resolveKeyboardMove(doc, 'does-not-exist', 'up')).toBeNull()
  })
})

describe('keyboard move applied to the store', () => {
  it('moves an element down and the final order matches', () => {
    const store = createEditorStore(HTML)
    const { section, p1 } = ids(store.state.doc)
    const before = childrenOf(store.state.doc, section)
    const target = resolveKeyboardMove(store.state.doc, p1, 'down')
    expect(target).not.toBeNull()
    store.actions.moveNode(p1, target!)
    const after = childrenOf(store.state.doc, section)
    expect(after).toEqual([before[1], before[0], before[2]])
  })

  it('moving up then down returns to the original state', () => {
    const store = createEditorStore(HTML)
    const { section, p2 } = ids(store.state.doc)
    const original = store.actions.getHtml()

    store.actions.moveNode(p2, resolveKeyboardMove(store.state.doc, p2, 'up')!)
    expect(childrenOf(store.state.doc, section)[0]).toBe(p2)

    store.actions.moveNode(p2, resolveKeyboardMove(store.state.doc, p2, 'down')!)
    expect(store.actions.getHtml()).toBe(original)
  })

  it('moving out then back in returns to the original state', () => {
    const store = createEditorStore(HTML)
    const { p3 } = ids(store.state.doc)
    const original = store.actions.getHtml()

    store.actions.moveNode(p3, resolveKeyboardMove(store.state.doc, p3, 'out')!)
    expect(store.state.doc.nodes[p3].parentId).toBe(store.state.doc.rootId)

    store.actions.moveNode(p3, resolveKeyboardMove(store.state.doc, p3, 'in')!)
    expect(store.actions.getHtml()).toBe(original)
  })

  it('each move is an undoable history entry', () => {
    const store = createEditorStore(HTML)
    const { p1 } = ids(store.state.doc)
    const original = store.actions.getHtml()

    store.actions.moveNode(p1, resolveKeyboardMove(store.state.doc, p1, 'down')!)
    store.actions.moveNode(p1, resolveKeyboardMove(store.state.doc, p1, 'down')!)
    expect(store.state.history.past).toHaveLength(2)

    store.actions.undo()
    store.actions.undo()
    expect(store.actions.getHtml()).toBe(original)
  })

  it('moving out repeatedly climbs one level at a time', () => {
    const store = createEditorStore('<div id="a"><div id="b"><p id="p">x</p></div></div>')
    const doc = () => store.state.doc
    const outer = childrenOf(doc(), doc().rootId)[0]
    const inner = childrenOf(doc(), outer)[0]
    const p = childrenOf(doc(), inner)[0]

    store.actions.moveNode(p, resolveKeyboardMove(doc(), p, 'out')!)
    expect(doc().nodes[p].parentId).toBe(outer)

    store.actions.moveNode(p, resolveKeyboardMove(doc(), p, 'out')!)
    expect(doc().nodes[p].parentId).toBe(doc().rootId)

    expect(resolveKeyboardMove(doc(), p, 'out')).toBeNull()
  })
})

describe('resolveKeyboardMove with layout whitespace', () => {
  const NAV = '<nav>\n  <a id="a">A</a>\n  <a id="b">B</a>\n  <a id="c">C</a>\n</nav>'

  function navIds() {
    const doc = parseHtml(NAV)
    const nav = childrenOf(doc, doc.rootId)[0]
    const all = childrenOf(doc, nav)
    const links = all.filter((id) => doc.nodes[id].kind === 'element')
    return { doc, nav, all, links }
  }

  it('moves up skipping the whitespace between links', () => {
    const { doc, nav, all, links } = navIds()
    expect(resolveKeyboardMove(doc, links[1], 'up')).toEqual({ parentId: nav, index: all.indexOf(links[0]) })
  })

  it('moves down skipping the whitespace between links', () => {
    const { doc, nav, all, links } = navIds()
    expect(resolveKeyboardMove(doc, links[0], 'down')).toEqual({
      parentId: nav,
      index: all.indexOf(links[1]) + 1,
    })
  })

  it('does not move down from the last visible link even with trailing whitespace', () => {
    const { doc, links } = navIds()
    expect(resolveKeyboardMove(doc, links[2], 'down')).toBeNull()
  })

  it('moving actually changes the visible order', () => {
    const store = createEditorStore(NAV)
    const { nav, links } = (() => {
      const doc = store.state.doc
      const nav = childrenOf(doc, doc.rootId)[0]
      return { nav, links: childrenOf(doc, nav).filter((id) => doc.nodes[id].kind === 'element') }
    })()
    const target = resolveKeyboardMove(store.state.doc, links[1], 'up')
    expect(target).not.toBeNull()
    store.actions.moveNode(links[1], target!)
    const after = childrenOf(store.state.doc, nav).filter((id) => store.state.doc.nodes[id].kind === 'element')
    expect(after).toEqual([links[1], links[0], links[2]])
  })
})
