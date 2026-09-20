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

describe('performance budget (2,000 nodes)', () => {
  const html = buildLargeHtml(70, 10)
  const doc = parseHtml(html)
  const nodeCount = Object.keys(doc.nodes).length

  it('the reference document has at least 2,000 nodes', () => {
    expect(nodeCount).toBeGreaterThanOrEqual(2000)
  })

  it('parse stays under 250 ms', () => {
    expect(measure('parse', () => parseHtml(html))).toBeLessThan(250)
  })

  it('serialize stays under 150 ms', () => {
    expect(measure('serialize', () => serializeHtml(doc))).toBeLessThan(150)
  })

  it('flattenTree stays under 50 ms', () => {
    expect(measure('flatten', () => flattenTree(doc, {}))).toBeLessThan(50)
  })

  it('moveNode stays under 20 ms', () => {
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

  it('setClasses stays under 20 ms and does not recreate the whole node map', () => {
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

  it('undo restores by reference without copying the tree', () => {
    const store = createEditorStore(html)
    const roots = childrenOf(store.state.doc, store.state.doc.rootId)
    const original = store.state.doc
    store.actions.setClasses(roots[0], ['grid'])
    expect(store.state.doc).not.toBe(original)
    const elapsed = measure('undo', () => store.actions.undo())
    expect(elapsed).toBeLessThan(10)
    expect(store.state.doc).toBe(original)
  })

  it('collectSubtree walks the largest section quickly', () => {
    const roots = childrenOf(doc, doc.rootId)
    expect(measure('collect', () => collectSubtree(doc, roots[0]))).toBeLessThan(20)
  })

  it('placeNodes over 50 nodes stays under 20 ms and pushes one entry', () => {
    const store = createEditorStore(html)
    const targets = childrenOf(store.state.doc, store.state.doc.rootId).slice(0, 50)
    const updates = targets.map((id, index) => ({ id, style: `left: ${index}px` }))
    const elapsed = measure('placeNodes', () => store.actions.placeNodes(updates))
    expect(elapsed).toBeLessThan(20)
    expect(store.state.history.past).toHaveLength(1)
  })

  it('removeNodes over 50 nodes stays under 20 ms and pushes one entry', () => {
    const store = createEditorStore(html)
    const targets = childrenOf(store.state.doc, store.state.doc.rootId).slice(0, 50)
    const elapsed = measure('removeNodes', () => store.actions.removeNodes(targets))
    expect(elapsed).toBeLessThan(20)
    expect(store.state.history.past).toHaveLength(1)
    expect(store.state.doc.nodes[targets[0]]).toBeUndefined()
  })
})
