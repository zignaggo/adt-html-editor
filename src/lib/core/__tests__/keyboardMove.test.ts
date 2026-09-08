import { describe, expect, it } from 'vitest'
import { parseHtml } from '../html/parse'
import { childrenOf } from '../model'
import { MOVE_KEYS, resolveKeyboardMove } from '../keyboardMove'
import { createEditorStore } from '../store'

const HTML =
  '<section id="s"><p id="p1">um</p><p id="p2">dois</p><p id="p3">três</p></section><aside id="a"><img src="x.png"><span id="sp">t</span></aside>'

function ids(doc = parseHtml(HTML)) {
  const roots = childrenOf(doc, doc.rootId)
  const [section, aside] = roots
  const [p1, p2, p3] = childrenOf(doc, section)
  const [img, span] = childrenOf(doc, aside)
  return { doc, roots, section, aside, p1, p2, p3, img, span }
}

describe('MOVE_KEYS', () => {
  it('mapeia as setas para direções', () => {
    expect(MOVE_KEYS.ArrowUp).toBe('up')
    expect(MOVE_KEYS.ArrowDown).toBe('down')
    expect(MOVE_KEYS.ArrowLeft).toBe('out')
    expect(MOVE_KEYS.ArrowRight).toBe('in')
    expect(MOVE_KEYS.Enter).toBeUndefined()
  })
})

describe('resolveKeyboardMove', () => {
  it('sobe entre irmãos', () => {
    const { doc, section, p2 } = ids()
    expect(resolveKeyboardMove(doc, p2, 'up')).toEqual({ parentId: section, index: 0 })
  })

  it('desce entre irmãos', () => {
    const { doc, section, p1 } = ids()
    expect(resolveKeyboardMove(doc, p1, 'down')).toEqual({ parentId: section, index: 2 })
  })

  it('não sobe além do primeiro irmão', () => {
    const { doc, p1 } = ids()
    expect(resolveKeyboardMove(doc, p1, 'up')).toBeNull()
  })

  it('não desce além do último irmão', () => {
    const { doc, p3 } = ids()
    expect(resolveKeyboardMove(doc, p3, 'down')).toBeNull()
  })

  it('sai para o avô, logo depois do pai', () => {
    const { doc, roots, section, p1 } = ids()
    expect(resolveKeyboardMove(doc, p1, 'out')).toEqual({
      parentId: doc.rootId,
      index: roots.indexOf(section) + 1,
    })
  })

  it('não sai quando já está no nível raiz', () => {
    const { doc, section } = ids()
    expect(resolveKeyboardMove(doc, section, 'out')).toBeNull()
  })

  it('entra no irmão anterior, como último filho', () => {
    const { doc, section, aside } = ids()
    expect(resolveKeyboardMove(doc, aside, 'in')).toEqual({
      parentId: section,
      index: childrenOf(doc, section).length,
    })
  })

  it('não entra quando não há irmão anterior', () => {
    const { doc, section } = ids()
    expect(resolveKeyboardMove(doc, section, 'in')).toBeNull()
  })

  it('não entra em uma tag void', () => {
    const { doc, span } = ids()
    expect(resolveKeyboardMove(doc, span, 'in')).toBeNull()
  })

  it('não entra em um nó de texto', () => {
    const textDoc = parseHtml('<div>texto solto<p id="p">x</p></div>')
    const div = childrenOf(textDoc, textDoc.rootId)[0]
    const [, p] = childrenOf(textDoc, div)
    expect(resolveKeyboardMove(textDoc, p, 'in')).toBeNull()
  })

  it('recusa mover a raiz', () => {
    const { doc } = ids()
    for (const direction of ['up', 'down', 'out', 'in'] as const) {
      expect(resolveKeyboardMove(doc, doc.rootId, direction)).toBeNull()
    }
  })

  it('recusa um id inexistente', () => {
    const { doc } = ids()
    expect(resolveKeyboardMove(doc, 'nao-existe', 'up')).toBeNull()
  })
})

describe('movimento por teclado aplicado no store', () => {
  it('desce um elemento e a ordem final confere', () => {
    const store = createEditorStore(HTML)
    const { section, p1 } = ids(store.state.doc)
    const before = childrenOf(store.state.doc, section)
    const target = resolveKeyboardMove(store.state.doc, p1, 'down')
    expect(target).not.toBeNull()
    store.actions.moveNode(p1, target!)
    const after = childrenOf(store.state.doc, section)
    expect(after).toEqual([before[1], before[0], before[2]])
  })

  it('sobe e desce volta ao estado original', () => {
    const store = createEditorStore(HTML)
    const { section, p2 } = ids(store.state.doc)
    const original = store.actions.getHtml()

    store.actions.moveNode(p2, resolveKeyboardMove(store.state.doc, p2, 'up')!)
    expect(childrenOf(store.state.doc, section)[0]).toBe(p2)

    store.actions.moveNode(p2, resolveKeyboardMove(store.state.doc, p2, 'down')!)
    expect(store.actions.getHtml()).toBe(original)
  })

  it('sair e entrar de novo volta ao estado original', () => {
    const store = createEditorStore(HTML)
    const { p3 } = ids(store.state.doc)
    const original = store.actions.getHtml()

    store.actions.moveNode(p3, resolveKeyboardMove(store.state.doc, p3, 'out')!)
    expect(store.state.doc.nodes[p3].parentId).toBe(store.state.doc.rootId)

    store.actions.moveNode(p3, resolveKeyboardMove(store.state.doc, p3, 'in')!)
    expect(store.actions.getHtml()).toBe(original)
  })

  it('cada movimento é uma entrada de histórico desfazível', () => {
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

  it('mover para fora repetidamente sobe um nível por vez', () => {
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

describe('resolveKeyboardMove com whitespace de layout', () => {
  const NAV = '<nav>\n  <a id="a">A</a>\n  <a id="b">B</a>\n  <a id="c">C</a>\n</nav>'

  function navIds() {
    const doc = parseHtml(NAV)
    const nav = childrenOf(doc, doc.rootId)[0]
    const all = childrenOf(doc, nav)
    const links = all.filter((id) => doc.nodes[id].kind === 'element')
    return { doc, nav, all, links }
  }

  it('sobe pulando o whitespace entre os links', () => {
    const { doc, nav, all, links } = navIds()
    expect(resolveKeyboardMove(doc, links[1], 'up')).toEqual({ parentId: nav, index: all.indexOf(links[0]) })
  })

  it('desce pulando o whitespace entre os links', () => {
    const { doc, nav, all, links } = navIds()
    expect(resolveKeyboardMove(doc, links[0], 'down')).toEqual({
      parentId: nav,
      index: all.indexOf(links[1]) + 1,
    })
  })

  it('não desce a partir do último link visível mesmo com whitespace depois', () => {
    const { doc, links } = navIds()
    expect(resolveKeyboardMove(doc, links[2], 'down')).toBeNull()
  })

  it('mover de fato troca a ordem visível', () => {
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
