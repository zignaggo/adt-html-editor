import { describe, expect, it } from 'vitest'
import { createEditorStore } from '../store'
import { childrenOf } from '../model'

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

const html = buildLargeHtml(100, 10)

function timed(label: string, run: () => void) {
  const start = performance.now()
  run()
  const ms = performance.now() - start
  console.log(`  ${label}: ${ms.toFixed(2)} ms`)
  return ms
}

describe('history profile', () => {
  it('cost per action, undo and retention', () => {
    const store = createEditorStore(html)
    const nodeCount = Object.keys(store.state.doc.nodes).length
    const roots = childrenOf(store.state.doc, store.state.doc.rootId)
    console.log(`  nodes: ${nodeCount}`)

    const burst = timed('200 setClasses (slider burst)', () => {
      for (let i = 0; i < 200; i += 1) {
        store.actions.setClasses(roots[1], [`p-${i % 12}`])
      }
    })
    console.log(`  per action: ${(burst / 200).toFixed(3)} ms`)
    console.log(`  history entries after burst: ${store.state.history.past.length}`)

    timed('100 undo', () => {
      for (let i = 0; i < 100; i += 1) store.actions.undo()
    })

    const fresh = createEditorStore(html)
    const freshRoots = childrenOf(fresh.state.doc, fresh.state.doc.rootId)
    const before = fresh.state.doc
    fresh.actions.setClasses(freshRoots[0], ['grid'])
    const after = fresh.state.doc
    const ids = Object.keys(before.nodes)
    const shared = ids.filter((id) => before.nodes[id] === after.nodes[id]).length
    console.log(`  nodes shared after 1 action: ${shared}/${ids.length}`)
    console.log(`  snapshot keeps the previous doc by reference: ${fresh.state.history.past[0].snapshot.doc === before}`)

    expect(shared).toBeGreaterThan(ids.length - 5)
    expect(nodeCount).toBeGreaterThan(3000)
  })
})
