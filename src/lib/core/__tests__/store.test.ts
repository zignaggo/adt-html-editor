import { beforeEach, describe, expect, it } from 'vitest'
import { createEditorStore, type EditorStore } from '../store'
import { childrenOf, isDescendantOf } from '../model'

function idsByTag(store: EditorStore, tag: string) {
  const { doc } = store.getState()
  return Object.values(doc.nodes)
    .filter((node) => 'tag' in node && node.tag === tag)
    .map((node) => node.id)
}

function firstByTag(store: EditorStore, tag: string) {
  const id = idsByTag(store, tag)[0]
  if (!id) throw new Error(`sem nó <${tag}>`)
  return id
}

describe('store do editor', () => {
  let store: EditorStore

  beforeEach(() => {
    store = createEditorStore(
      '<section id="a"><p id="p1">um</p><p id="p2">dois</p></section><aside id="b"></aside>',
    )
  })

  it('parte de um documento sem histórico', () => {
    expect(store.getState().history.past).toHaveLength(0)
    expect(store.getState().history.future).toHaveLength(0)
  })

  describe('moveNode', () => {
    it('reordena entre irmãos', () => {
      const section = firstByTag(store, 'section')
      const [p1, p2] = childrenOf(store.getState().doc, section)
      store.getState().moveNode(p2, { parentId: section, index: 0 })
      expect(childrenOf(store.getState().doc, section)).toEqual([p2, p1])
    })

    it('reparenta para outro elemento', () => {
      const section = firstByTag(store, 'section')
      const aside = firstByTag(store, 'aside')
      const p1 = childrenOf(store.getState().doc, section)[0]
      expect(store.getState().moveNode(p1, { parentId: aside, index: 0 })).toBe(true)
      expect(childrenOf(store.getState().doc, aside)).toEqual([p1])
      expect(childrenOf(store.getState().doc, section)).not.toContain(p1)
      expect(store.getState().doc.nodes[p1].parentId).toBe(aside)
    })

    it('recusa mover um nó para dentro de si mesmo', () => {
      const section = firstByTag(store, 'section')
      expect(store.getState().moveNode(section, { parentId: section, index: 0 })).toBe(false)
    })

    it('recusa mover um nó para dentro de um descendente', () => {
      const section = firstByTag(store, 'section')
      const p1 = childrenOf(store.getState().doc, section)[0]
      expect(isDescendantOf(store.getState().doc, p1, section)).toBe(true)
      expect(store.getState().moveNode(section, { parentId: p1, index: 0 })).toBe(false)
    })

    it('recusa mover a raiz', () => {
      const { doc } = store.getState()
      expect(store.getState().moveNode(doc.rootId, { parentId: firstByTag(store, 'aside'), index: 0 })).toBe(false)
    })

    it('recusa soltar dentro de tag void', () => {
      store.getState().replaceDocument('<div><img src="a.png"><p>x</p></div>')
      const img = firstByTag(store, 'img')
      const p = firstByTag(store, 'p')
      expect(store.getState().moveNode(p, { parentId: img, index: 0 })).toBe(false)
    })

    it('ajusta o índice ao mover para frente no mesmo pai', () => {
      store.getState().replaceDocument('<ul><li>1</li><li>2</li><li>3</li></ul>')
      const ul = firstByTag(store, 'ul')
      const [a, b, c] = childrenOf(store.getState().doc, ul)
      store.getState().moveNode(a, { parentId: ul, index: 3 })
      expect(childrenOf(store.getState().doc, ul)).toEqual([b, c, a])
    })

    it('não cria histórico quando o movimento é um no-op', () => {
      const ul = firstByTag(store, 'section')
      const p1 = childrenOf(store.getState().doc, ul)[0]
      store.getState().moveNode(p1, { parentId: ul, index: 0 })
      expect(store.getState().history.past).toHaveLength(0)
    })
  })

  describe('undo/redo', () => {
    it('desfaz e refaz um movimento', () => {
      const section = firstByTag(store, 'section')
      const before = childrenOf(store.getState().doc, section)
      store.getState().moveNode(before[1], { parentId: section, index: 0 })
      const moved = childrenOf(store.getState().doc, section)
      expect(moved).not.toEqual(before)

      store.getState().undo()
      expect(childrenOf(store.getState().doc, section)).toEqual(before)

      store.getState().redo()
      expect(childrenOf(store.getState().doc, section)).toEqual(moved)
    })

    it('cada ação vale uma entrada de histórico', () => {
      const section = firstByTag(store, 'section')
      store.getState().setClasses(section, ['flex'])
      store.getState().setAttr(section, 'id', 'novo')
      expect(store.getState().history.past).toHaveLength(2)
      store.getState().undo()
      expect((store.getState().doc.nodes[section] as { attrs: Record<string, string> }).attrs.id).toBe('a')
      store.getState().undo()
      expect((store.getState().doc.nodes[section] as { classes: string[] }).classes).toEqual([])
    })

    it('limpa o futuro após uma nova ação', () => {
      const section = firstByTag(store, 'section')
      store.getState().setClasses(section, ['flex'])
      store.getState().undo()
      expect(store.getState().history.future).toHaveLength(1)
      store.getState().setClasses(section, ['grid'])
      expect(store.getState().history.future).toHaveLength(0)
    })

    it('undo sem histórico é inofensivo', () => {
      const html = store.getState().getHtml()
      store.getState().undo()
      expect(store.getState().getHtml()).toBe(html)
    })

    it('desfaz uma remoção restaurando a subárvore', () => {
      const section = firstByTag(store, 'section')
      const before = store.getState().getHtml()
      store.getState().removeNode(section)
      expect(store.getState().getHtml()).not.toContain('<section')
      store.getState().undo()
      expect(store.getState().getHtml()).toBe(before)
    })
  })

  describe('mutações', () => {
    it('remove a subárvore inteira do mapa', () => {
      const section = firstByTag(store, 'section')
      const countBefore = Object.keys(store.getState().doc.nodes).length
      store.getState().removeNode(section)
      expect(Object.keys(store.getState().doc.nodes).length).toBeLessThan(countBefore - 2)
      expect(store.getState().doc.nodes[section]).toBeUndefined()
    })

    it('duplica logo após o original', () => {
      const section = firstByTag(store, 'section')
      const p1 = childrenOf(store.getState().doc, section)[0]
      const clone = store.getState().duplicateNode(p1)
      expect(clone).toBeTruthy()
      expect(childrenOf(store.getState().doc, section)[1]).toBe(clone)
      expect(store.getState().getHtml()).toContain('<p id="p1">um</p><p id="p1">um</p>')
    })

    it('insere a partir de um template', () => {
      const aside = firstByTag(store, 'aside')
      const created = store.getState().insertNode(
        { tag: 'button', classes: ['px-3'], text: 'ok' },
        { parentId: aside, index: 0 },
      )
      expect(created).toBeTruthy()
      expect(store.getState().getHtml()).toContain('<button class="px-3">ok</button>')
      expect(store.getState().selectedId).toBe(created)
    })

    it('setClasses reflete na saída e no conjunto de classes', () => {
      const section = firstByTag(store, 'section')
      store.getState().setClasses(section, ['flex', 'gap-2'])
      expect(store.getState().getHtml()).toContain('class="flex gap-2"')
      expect(store.getState().usedClasses.has('gap-2')).toBe(true)
    })

    it('setAttr remove atributo com valor nulo', () => {
      const section = firstByTag(store, 'section')
      store.getState().setAttr(section, 'id', null)
      expect(store.getState().getHtml()).toContain('<section>')
    })

    it('setText atualiza nós de texto', () => {
      const section = firstByTag(store, 'section')
      const p1 = childrenOf(store.getState().doc, section)[0]
      const textId = childrenOf(store.getState().doc, p1)[0]
      store.getState().setText(textId, 'trocado')
      expect(store.getState().getHtml()).toContain('<p id="p1">trocado</p>')
    })

    it('replaceDocument zera histórico e seleção', () => {
      const section = firstByTag(store, 'section')
      store.getState().select(section)
      store.getState().setClasses(section, ['flex'])
      store.getState().replaceDocument('<div>novo</div>')
      expect(store.getState().selectedId).toBeNull()
      expect(store.getState().history.past).toHaveLength(0)
      expect(store.getState().getHtml()).toBe('<div>novo</div>')
    })
  })

  describe('seleção e colapso', () => {
    it('select não gera histórico', () => {
      store.getState().select(firstByTag(store, 'section'))
      expect(store.getState().history.past).toHaveLength(0)
    })

    it('toggleCollapsed alterna', () => {
      const section = firstByTag(store, 'section')
      store.getState().toggleCollapsed(section)
      expect(store.getState().collapsed[section]).toBe(true)
      store.getState().toggleCollapsed(section)
      expect(store.getState().collapsed[section]).toBeUndefined()
    })

    it('remover o nó selecionado limpa a seleção', () => {
      const section = firstByTag(store, 'section')
      store.getState().select(section)
      store.getState().removeNode(section)
      expect(store.getState().selectedId).toBeNull()
    })
  })

  it('getHtml devolve o documento serializado', () => {
    expect(store.getState().getHtml()).toBe(
      '<section id="a"><p id="p1">um</p><p id="p2">dois</p></section><aside id="b"></aside>',
    )
  })
})
