import { describe, expect, it } from 'vitest'
import { createEditorStore } from '../store'
import { childrenOf } from '../model'
import { COALESCE_WINDOW_MS, pushSnapshot, emptyHistory } from '../history'

const HTML = '<section id="a"><p id="p1">um</p><p id="p2">dois</p></section><aside id="b"></aside>'

function firstByTag(store: ReturnType<typeof createEditorStore>, tag: string) {
  const { doc } = store.getState()
  const id = Object.values(doc.nodes).find((node) => 'tag' in node && node.tag === tag)?.id
  if (!id) throw new Error(`sem <${tag}>`)
  return id
}

describe('pushSnapshot', () => {
  const snapshot = { doc: {} as never, selectedId: null }

  it('empilha quando não há chave de coalescência', () => {
    const one = pushSnapshot(emptyHistory(), snapshot, null, 1000)
    const two = pushSnapshot(one, snapshot, null, 1010)
    expect(two.past).toHaveLength(2)
  })

  it('coalesce chaves iguais dentro da janela', () => {
    const one = pushSnapshot(emptyHistory(), snapshot, 'classes:x', 1000)
    const two = pushSnapshot(one, snapshot, 'classes:x', 1000 + COALESCE_WINDOW_MS - 1)
    expect(two.past).toHaveLength(1)
  })

  it('não coalesce após a janela expirar', () => {
    const one = pushSnapshot(emptyHistory(), snapshot, 'classes:x', 1000)
    const two = pushSnapshot(one, snapshot, 'classes:x', 1000 + COALESCE_WINDOW_MS + 1)
    expect(two.past).toHaveLength(2)
  })

  it('não coalesce chaves diferentes', () => {
    const one = pushSnapshot(emptyHistory(), snapshot, 'classes:x', 1000)
    const two = pushSnapshot(one, snapshot, 'classes:y', 1005)
    expect(two.past).toHaveLength(2)
  })

  it('limpa o futuro mesmo ao coalescer', () => {
    const withFuture = {
      past: [{ snapshot, coalesceKey: 'classes:x', at: 1000 }],
      future: [{ snapshot, coalesceKey: null, at: 900 }],
    }
    expect(pushSnapshot(withFuture, snapshot, 'classes:x', 1100).future).toHaveLength(0)
  })
})

describe('coalescência de ações no store', () => {
  it('um burst de setClasses no mesmo nó vira uma entrada', () => {
    const store = createEditorStore(HTML)
    const section = firstByTag(store, 'section')
    for (let i = 0; i < 50; i += 1) store.getState().setClasses(section, [`p-${i}`])
    expect(store.getState().history.past).toHaveLength(1)
  })

  it('um undo depois do burst volta ao estado anterior ao burst', () => {
    const store = createEditorStore(HTML)
    const section = firstByTag(store, 'section')
    const before = store.getState().getHtml()
    for (let i = 0; i < 50; i += 1) store.getState().setClasses(section, [`p-${i}`])
    expect(store.getState().getHtml()).toContain('p-49')
    store.getState().undo()
    expect(store.getState().getHtml()).toBe(before)
  })

  it('nós fora do burst permanecem intactos após o undo', () => {
    const store = createEditorStore(HTML)
    const section = firstByTag(store, 'section')
    const aside = firstByTag(store, 'aside')
    store.getState().setClasses(aside, ['ring'])
    const asideHtml = store.getState().getHtml()
    for (let i = 0; i < 30; i += 1) store.getState().setClasses(section, [`m-${i}`])
    store.getState().undo()
    expect(store.getState().getHtml()).toBe(asideHtml)
  })

  it('nós diferentes não coalescem entre si', () => {
    const store = createEditorStore(HTML)
    const section = firstByTag(store, 'section')
    const aside = firstByTag(store, 'aside')
    store.getState().setClasses(section, ['flex'])
    store.getState().setClasses(aside, ['grid'])
    expect(store.getState().history.past).toHaveLength(2)
  })

  it('ações estruturais nunca coalescem', () => {
    const store = createEditorStore(HTML)
    const section = firstByTag(store, 'section')
    const [p1, p2] = childrenOf(store.getState().doc, section)
    store.getState().moveNode(p2, { parentId: section, index: 0 })
    store.getState().moveNode(p1, { parentId: section, index: 0 })
    expect(store.getState().history.past).toHaveLength(2)
  })

  it('redo após um burst coalescido restaura o último valor', () => {
    const store = createEditorStore(HTML)
    const section = firstByTag(store, 'section')
    for (let i = 0; i < 20; i += 1) store.getState().setClasses(section, [`p-${i}`])
    const burstResult = store.getState().getHtml()
    store.getState().undo()
    store.getState().redo()
    expect(store.getState().getHtml()).toBe(burstResult)
  })

  it('editar depois de um undo não corrompe o redo descartado', () => {
    const store = createEditorStore(HTML)
    const section = firstByTag(store, 'section')
    const aside = firstByTag(store, 'aside')
    const original = store.getState().getHtml()

    store.getState().setClasses(section, ['flex'])
    store.getState().undo()
    expect(store.getState().getHtml()).toBe(original)

    for (let i = 0; i < 20; i += 1) store.getState().setClasses(aside, [`p-${i}`])
    store.getState().undo()
    expect(store.getState().getHtml()).toBe(original)
  })

  it('burst, undo e novo burst com a mesma chave não corrompe o snapshot', () => {
    const store = createEditorStore(HTML)
    const section = firstByTag(store, 'section')
    const original = store.getState().getHtml()

    for (let i = 0; i < 20; i += 1) store.getState().setClasses(section, [`p-${i}`])
    store.getState().undo()
    expect(store.getState().getHtml()).toBe(original)

    for (let i = 0; i < 20; i += 1) store.getState().setClasses(section, [`m-${i}`])
    expect(store.getState().getHtml()).toContain('m-19')
    store.getState().undo()
    expect(store.getState().getHtml()).toBe(original)
  })

  it('undo no meio de um burst não vaza estados intermediários', () => {
    const store = createEditorStore(HTML)
    const section = firstByTag(store, 'section')
    const original = store.getState().getHtml()

    for (let i = 0; i < 10; i += 1) store.getState().setClasses(section, [`p-${i}`])
    store.getState().undo()
    expect(store.getState().getHtml()).toBe(original)
    for (let i = 0; i < 10; i += 1) store.getState().setClasses(section, [`p-${i}`])
    store.getState().undo()
    expect(store.getState().getHtml()).toBe(original)
    expect(store.getState().history.past).toHaveLength(0)
  })

  it('o mapa de nós do snapshot nunca é o mapa vivo', () => {
    const store = createEditorStore(HTML)
    const section = firstByTag(store, 'section')
    store.getState().setClasses(section, ['flex'])
    for (let i = 0; i < 10; i += 1) store.getState().setClasses(section, [`p-${i}`])
    const snapshotNodes = store.getState().history.past[0].snapshot.doc.nodes
    expect(snapshotNodes).not.toBe(store.getState().doc.nodes)
    expect((snapshotNodes[section] as { classes: string[] }).classes).toEqual([])
  })

  it('undo/redo repetidos convergem para os mesmos estados', () => {
    const store = createEditorStore(HTML)
    const section = firstByTag(store, 'section')
    const aside = firstByTag(store, 'aside')
    const states = [store.getState().getHtml()]

    store.getState().setClasses(section, ['flex'])
    states.push(store.getState().getHtml())
    store.getState().moveNode(childrenOf(store.getState().doc, section)[1], {
      parentId: aside,
      index: 0,
    })
    states.push(store.getState().getHtml())

    store.getState().undo()
    store.getState().undo()
    expect(store.getState().getHtml()).toBe(states[0])
    store.getState().redo()
    expect(store.getState().getHtml()).toBe(states[1])
    store.getState().redo()
    expect(store.getState().getHtml()).toBe(states[2])
    store.getState().undo()
    expect(store.getState().getHtml()).toBe(states[1])
  })
})
