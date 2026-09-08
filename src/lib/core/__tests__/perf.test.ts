import { describe, expect, it } from 'vitest'
import { parseHtml } from '../html/parse'
import { serializeHtml } from '../html/serialize'
import { createEditorStore } from '../store'
import { childrenOf, collectSubtree } from '../model'
import { flattenTree } from '../../components/Layers/flatten'

function buildLargeHtml(sections: number, itemsPerSection: number): string {
  let html = ''
  for (let s = 0; s < sections; s += 1) {
    html += `<section class="p-4 flex flex-col gap-2" id="s${s}">`
    for (let i = 0; i < itemsPerSection; i += 1) {
      html += `<div class="rounded-md bg-white p-2"><p class="text-sm">Item ${s}-${i}</p></div>`
    }
    html += '</section>'
  }
  return html
}

function measure(label: string, run: () => void): number {
  const start = performance.now()
  run()
  const elapsed = performance.now() - start
  void label
  return elapsed
}

describe('orçamento de performance (2.000 nós)', () => {
  const html = buildLargeHtml(70, 10)
  const doc = parseHtml(html)
  const nodeCount = Object.keys(doc.nodes).length

  it('o documento de referência tem ao menos 2.000 nós', () => {
    expect(nodeCount).toBeGreaterThanOrEqual(2000)
  })

  it('parse fica abaixo de 250 ms', () => {
    expect(measure('parse', () => parseHtml(html))).toBeLessThan(250)
  })

  it('serialize fica abaixo de 150 ms', () => {
    expect(measure('serialize', () => serializeHtml(doc))).toBeLessThan(150)
  })

  it('flattenTree fica abaixo de 50 ms', () => {
    expect(measure('flatten', () => flattenTree(doc, {}))).toBeLessThan(50)
  })

  it('moveNode fica abaixo de 20 ms', () => {
    const store = createEditorStore(html)
    const roots = childrenOf(store.state.doc, store.state.doc.rootId)
    const source = roots[0]
    const target = roots[roots.length - 1]
    const elapsed = measure('move', () => {
      store.actions.moveNode(source, { parentId: target, index: 0 })
    })
    expect(elapsed).toBeLessThan(20)
    expect(store.state.doc.nodes[source].parentId).toBe(target)
  })

  it('setClasses fica abaixo de 20 ms e não recria o mapa de nós inteiro', () => {
    const store = createEditorStore(html)
    const roots = childrenOf(store.state.doc, store.state.doc.rootId)
    const before = store.state.doc.nodes
    const other = roots[1]
    const elapsed = measure('setClasses', () => {
      store.actions.setClasses(roots[0], ['grid', 'gap-8'])
    })
    const after = store.state.doc.nodes
    expect(elapsed).toBeLessThan(20)
    expect(after[other]).toBe(before[other])
    expect(after[roots[0]]).not.toBe(before[roots[0]])
  })

  it('undo restaura por referência, sem copiar a árvore', () => {
    const store = createEditorStore(html)
    const roots = childrenOf(store.state.doc, store.state.doc.rootId)
    const original = store.state.doc
    store.actions.setClasses(roots[0], ['grid'])
    expect(store.state.doc).not.toBe(original)
    const elapsed = measure('undo', () => store.actions.undo())
    expect(elapsed).toBeLessThan(10)
    expect(store.state.doc).toBe(original)
  })

  it('collectSubtree percorre a maior seção rapidamente', () => {
    const roots = childrenOf(doc, doc.rootId)
    expect(measure('collect', () => collectSubtree(doc, roots[0]))).toBeLessThan(20)
  })
})
