import { beforeEach, describe, expect, it } from 'vitest'
import { createEditorStore, type EditorStore } from '../store'
import { childrenOf, isDescendantOf } from '../model'

function idsByTag(store: EditorStore, tag: string) {
  const { doc } = store.state
  return Object.values(doc.nodes)
    .filter((node) => 'tag' in node && node.tag === tag)
    .map((node) => node.id)
}

function firstByTag(store: EditorStore, tag: string) {
  const id = idsByTag(store, tag)[0]
  if (!id) throw new Error(`no <${tag}> node`)
  return id
}

describe('editor store', () => {
  let store: EditorStore

  beforeEach(() => {
    store = createEditorStore(
      '<section id="a"><p id="p1">one</p><p id="p2">two</p></section><aside id="b"></aside>',
    )
  })

  it('starts from a document with no history', () => {
    expect(store.state.history.past).toHaveLength(0)
    expect(store.state.history.future).toHaveLength(0)
  })

  describe('moveNode', () => {
    it('reorders among siblings', () => {
      const section = firstByTag(store, 'section')
      const [p1, p2] = childrenOf(store.state.doc, section)
      store.actions.moveNode(p2, { parentId: section, index: 0 })
      expect(childrenOf(store.state.doc, section)).toEqual([p2, p1])
    })

    it('reparents to another element', () => {
      const section = firstByTag(store, 'section')
      const aside = firstByTag(store, 'aside')
      const p1 = childrenOf(store.state.doc, section)[0]
      expect(store.actions.moveNode(p1, { parentId: aside, index: 0 })).toBe(true)
      expect(childrenOf(store.state.doc, aside)).toEqual([p1])
      expect(childrenOf(store.state.doc, section)).not.toContain(p1)
      expect(store.state.doc.nodes[p1].parentId).toBe(aside)
    })

    it('refuses to move a node into itself', () => {
      const section = firstByTag(store, 'section')
      expect(store.actions.moveNode(section, { parentId: section, index: 0 })).toBe(false)
    })

    it('refuses to move a node into a descendant', () => {
      const section = firstByTag(store, 'section')
      const p1 = childrenOf(store.state.doc, section)[0]
      expect(isDescendantOf(store.state.doc, p1, section)).toBe(true)
      expect(store.actions.moveNode(section, { parentId: p1, index: 0 })).toBe(false)
    })

    it('refuses to move the root', () => {
      const { doc } = store.state
      expect(store.actions.moveNode(doc.rootId, { parentId: firstByTag(store, 'aside'), index: 0 })).toBe(false)
    })

    it('refuses to drop inside a void tag', () => {
      store.actions.replaceDocument('<div><img src="a.png"><p>x</p></div>')
      const img = firstByTag(store, 'img')
      const p = firstByTag(store, 'p')
      expect(store.actions.moveNode(p, { parentId: img, index: 0 })).toBe(false)
    })

    it('adjusts the index when moving forward within the same parent', () => {
      store.actions.replaceDocument('<ul><li>1</li><li>2</li><li>3</li></ul>')
      const ul = firstByTag(store, 'ul')
      const [a, b, c] = childrenOf(store.state.doc, ul)
      store.actions.moveNode(a, { parentId: ul, index: 3 })
      expect(childrenOf(store.state.doc, ul)).toEqual([b, c, a])
    })

    it('does not create history when the move is a no-op', () => {
      const ul = firstByTag(store, 'section')
      const p1 = childrenOf(store.state.doc, ul)[0]
      store.actions.moveNode(p1, { parentId: ul, index: 0 })
      expect(store.state.history.past).toHaveLength(0)
    })
  })

  describe('undo/redo', () => {
    it('undoes and redoes a move', () => {
      const section = firstByTag(store, 'section')
      const before = childrenOf(store.state.doc, section)
      store.actions.moveNode(before[1], { parentId: section, index: 0 })
      const moved = childrenOf(store.state.doc, section)
      expect(moved).not.toEqual(before)

      store.actions.undo()
      expect(childrenOf(store.state.doc, section)).toEqual(before)

      store.actions.redo()
      expect(childrenOf(store.state.doc, section)).toEqual(moved)
    })

    it('each action counts as one history entry', () => {
      const section = firstByTag(store, 'section')
      store.actions.setClasses(section, ['flex'])
      store.actions.setAttr(section, 'id', 'new')
      expect(store.state.history.past).toHaveLength(2)
      store.actions.undo()
      expect((store.state.doc.nodes[section] as { attrs: Record<string, string> }).attrs.id).toBe('a')
      store.actions.undo()
      expect((store.state.doc.nodes[section] as { classes: string[] }).classes).toEqual([])
    })

    it('clears the future after a new action', () => {
      const section = firstByTag(store, 'section')
      store.actions.setClasses(section, ['flex'])
      store.actions.undo()
      expect(store.state.history.future).toHaveLength(1)
      store.actions.setClasses(section, ['grid'])
      expect(store.state.history.future).toHaveLength(0)
    })

    it('undo with no history is harmless', () => {
      const html = store.actions.getHtml()
      store.actions.undo()
      expect(store.actions.getHtml()).toBe(html)
    })

    it('undoes a removal by restoring the subtree', () => {
      const section = firstByTag(store, 'section')
      const before = store.actions.getHtml()
      store.actions.removeNode(section)
      expect(store.actions.getHtml()).not.toContain('<section')
      store.actions.undo()
      expect(store.actions.getHtml()).toBe(before)
    })
  })

  describe('mutations', () => {
    it('removes the whole subtree from the map', () => {
      const section = firstByTag(store, 'section')
      const countBefore = Object.keys(store.state.doc.nodes).length
      store.actions.removeNode(section)
      expect(Object.keys(store.state.doc.nodes).length).toBeLessThan(countBefore - 2)
      expect(store.state.doc.nodes[section]).toBeUndefined()
    })

    it('duplicates right after the original', () => {
      const section = firstByTag(store, 'section')
      const p1 = childrenOf(store.state.doc, section)[0]
      const clone = store.actions.duplicateNode(p1)
      expect(clone).toBeTruthy()
      expect(childrenOf(store.state.doc, section)[1]).toBe(clone)
      expect(store.actions.getHtml()).toContain('<p id="p1">one</p><p id="p1">one</p>')
    })

    it('inserts from a template', () => {
      const aside = firstByTag(store, 'aside')
      const created = store.actions.insertNode(
        { tag: 'button', classes: ['px-3'], text: 'ok' },
        { parentId: aside, index: 0 },
      )
      expect(created).toBeTruthy()
      expect(store.actions.getHtml()).toContain('<button class="px-3">ok</button>')
      expect(store.state.selectedId).toBe(created)
    })

    it('setClasses is reflected in the output and in the class set', () => {
      const section = firstByTag(store, 'section')
      store.actions.setClasses(section, ['flex', 'gap-2'])
      expect(store.actions.getHtml()).toContain('class="flex gap-2"')
      expect(store.state.usedClasses.has('gap-2')).toBe(true)
    })

    it('setAttr removes an attribute with a null value', () => {
      const section = firstByTag(store, 'section')
      store.actions.setAttr(section, 'id', null)
      expect(store.actions.getHtml()).toContain('<section>')
    })

    it('setText updates text nodes', () => {
      const section = firstByTag(store, 'section')
      const p1 = childrenOf(store.state.doc, section)[0]
      const textId = childrenOf(store.state.doc, p1)[0]
      store.actions.setText(textId, 'changed')
      expect(store.actions.getHtml()).toContain('<p id="p1">changed</p>')
    })

    it('replaceDocument resets history and selection', () => {
      const section = firstByTag(store, 'section')
      store.actions.select(section)
      store.actions.setClasses(section, ['flex'])
      store.actions.replaceDocument('<div>new</div>')
      expect(store.state.selectedId).toBeNull()
      expect(store.state.history.past).toHaveLength(0)
      expect(store.actions.getHtml()).toBe('<div>new</div>')
    })
  })

  describe('selection and collapse', () => {
    it('select does not create history', () => {
      store.actions.select(firstByTag(store, 'section'))
      expect(store.state.history.past).toHaveLength(0)
    })

    it('toggleCollapsed toggles', () => {
      const section = firstByTag(store, 'section')
      store.actions.toggleCollapsed(section)
      expect(store.state.collapsed[section]).toBe(true)
      store.actions.toggleCollapsed(section)
      expect(store.state.collapsed[section]).toBeUndefined()
    })

    it('selecting a node expands its collapsed ancestors', () => {
      const section = firstByTag(store, 'section')
      const [, p2] = idsByTag(store, 'p')
      store.actions.toggleCollapsed(section)
      store.actions.select(p2)
      expect(store.state.selectedId).toBe(p2)
      expect(store.state.collapsed[section]).toBeUndefined()
    })

    it('selecting keeps unrelated nodes collapsed', () => {
      const section = firstByTag(store, 'section')
      const aside = firstByTag(store, 'aside')
      store.actions.toggleCollapsed(section)
      store.actions.select(aside)
      expect(store.state.collapsed[section]).toBe(true)
    })

    it('inserting into a collapsed parent expands it', () => {
      const section = firstByTag(store, 'section')
      store.actions.toggleCollapsed(section)
      const created = store.actions.insertNode({ tag: 'span' }, { parentId: section, index: 0 })
      expect(store.state.selectedId).toBe(created)
      expect(store.state.collapsed[section]).toBeUndefined()
    })

    it('removing the selected node clears the selection', () => {
      const section = firstByTag(store, 'section')
      store.actions.select(section)
      store.actions.removeNode(section)
      expect(store.state.selectedId).toBeNull()
    })
  })

  describe('placeNode', () => {
    it('writes the style and moves to the new parent in one history entry', () => {
      const [p1] = idsByTag(store, 'p')
      const aside = firstByTag(store, 'aside')
      const placed = store.actions.placeNode(p1, {
        style: 'position: absolute; left: 10px; top: 20px',
        parentId: aside,
      })
      expect(placed).toBe(true)
      expect(store.state.doc.nodes[p1].parentId).toBe(aside)
      expect(childrenOf(store.state.doc, aside)).toEqual([p1])
      expect(store.state.history.past).toHaveLength(1)
      expect(store.actions.getHtml()).toBe(
        '<section id="a"><p id="p2">two</p></section><aside id="b"><p id="p1" style="position: absolute; left: 10px; top: 20px">one</p></aside>',
      )
      store.actions.undo()
      expect(store.state.doc.nodes[p1].parentId).toBe(firstByTag(store, 'section'))
      expect(store.state.doc.nodes[p1]).not.toHaveProperty('attrs.style')
    })

    it('is a no-op when nothing changes', () => {
      const [p1] = idsByTag(store, 'p')
      store.actions.placeNode(p1, { style: 'left: 1px' })
      expect(store.actions.placeNode(p1, { style: 'left: 1px' })).toBe(false)
      expect(store.state.history.past).toHaveLength(1)
    })

    it('coalesces nudges into one entry', () => {
      const [p1] = idsByTag(store, 'p')
      store.actions.placeNode(p1, { style: 'left: 1px', coalesce: true })
      store.actions.placeNode(p1, { style: 'left: 2px', coalesce: true })
      expect(store.state.history.past).toHaveLength(1)
    })

    it('refuses to place a node inside its own subtree', () => {
      const section = firstByTag(store, 'section')
      const [p1] = idsByTag(store, 'p')
      expect(store.actions.placeNode(section, { style: 'left: 0', parentId: p1 })).toBe(false)
    })
  })

  it('setLocked toggles without touching history', () => {
    const [p1] = idsByTag(store, 'p')
    store.actions.setLocked(p1, true)
    expect(store.state.locked[p1]).toBe(true)
    store.actions.setLocked(p1, false)
    expect(store.state.locked[p1]).toBeUndefined()
    expect(store.state.history.past).toHaveLength(0)
  })

  it('getHtml returns the serialized document', () => {
    expect(store.actions.getHtml()).toBe(
      '<section id="a"><p id="p1">one</p><p id="p2">two</p></section><aside id="b"></aside>',
    )
  })
})
