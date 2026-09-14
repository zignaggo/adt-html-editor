import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EditorProvider } from '../../lib/components/Editor/EditorProvider'
import { useEditorStoreApi } from '../../lib/components/Editor/context'
import type { EditorStore } from '../../lib/core/store'
import { HistoryGroup } from '../parts/Editor/HistoryParts'
import { InspectorPanel } from '../parts/Inspector/InspectorParts'
import { LayersPanel } from '../parts/Layers/LayersParts'
import { Palette } from '../parts/Palette/Palette'
import { TooltipProvider } from '../ui/tooltip'

const DOCUMENT = '<section id="hero"><h1 class="text-4xl font-bold">Title</h1><p>Body</p></section>'

function CaptureStore({ onStore }: { onStore: (store: EditorStore) => void }) {
  const store = useEditorStoreApi()
  useEffect(() => {
    onStore(store)
  }, [onStore, store])
  return null
}

function setup() {
  let store: EditorStore | undefined
  render(
    <EditorProvider defaultValue={DOCUMENT}>
      <CaptureStore onStore={(s) => (store = s)} />
      <TooltipProvider>
        <HistoryGroup />
        <Palette />
        <LayersPanel />
        <InspectorPanel />
      </TooltipProvider>
    </EditorProvider>,
  )
  if (!store) throw new Error('store not captured')
  return store
}

function idOf(store: EditorStore, tag: string): string {
  const node = Object.values(store.state.doc.nodes).find(
    (entry) => entry.kind === 'element' && entry.tag === tag,
  )
  if (!node) throw new Error(`no <${tag}> in document`)
  return node.id
}

describe('shadcn skin parts', () => {
  beforeEach(() => {
    if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {}
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    )
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('renders the tree with the same roles and attributes as the core rows', () => {
    setup()
    const tree = screen.getByRole('tree', { name: 'Element tree' })
    const rows = tree.querySelectorAll('[role=treeitem]')
    expect(rows.length).toBeGreaterThanOrEqual(3)
    for (const row of rows) {
      expect(row.getAttribute('data-node-id')).toBeTruthy()
      expect(row.getAttribute('aria-level')).toBeTruthy()
    }
    expect(screen.getByRole('button', { name: 'Collapse section' })).toBeTruthy()
  })

  it('selects a node from a row and shows its classes in the inspector', () => {
    const store = setup()
    const h1 = idOf(store, 'h1')
    fireEvent.click(screen.getByRole('tree').querySelector(`[data-node-id="${h1}"]`)!)
    expect(store.state.selectedId).toBe(h1)
    expect(screen.getByText('text-4xl')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Remove font-bold' })).toBeTruthy()
    expect(screen.getByRole('combobox', { name: 'Variant' })).toBeTruthy()
    expect(screen.getByRole('combobox', { name: 'Add class' })).toBeTruthy()
  })

  it('describes the selected element in the header and navigates to ancestors', () => {
    const store = setup()
    const h1 = idOf(store, 'h1')
    act(() => store.actions.select(h1))
    expect(screen.getByText(/2 classes/)).toBeTruthy()
    expect(screen.getByText('“Title”')).toBeTruthy()
    const crumbs = screen.getByRole('navigation', { name: 'Ancestors' })
    fireEvent.click(within(crumbs).getByRole('button', { name: 'section' }))
    expect(store.state.selectedId).toBe(idOf(store, 'section'))
    expect(screen.getAllByText('#hero').length).toBeGreaterThan(1)
    expect(screen.getByRole('button', { name: 'Select parent' })).toHaveProperty('disabled', true)

    act(() => store.actions.select(h1))
    fireEvent.click(screen.getByRole('button', { name: 'Select parent' }))
    expect(store.state.selectedId).toBe(idOf(store, 'section'))
    fireEvent.click(screen.getByRole('button', { name: 'Lock element' }))
    expect(store.state.locked[idOf(store, 'section')]).toBe(true)
  })

  it('removes a class through the chip button and records history', () => {
    const store = setup()
    const h1 = idOf(store, 'h1')
    act(() => store.actions.select(h1))
    fireEvent.click(screen.getByRole('button', { name: 'Remove font-bold' }))
    const node = store.state.doc.nodes[h1]
    expect(node.kind === 'element' && node.classes).toEqual(['text-4xl'])
    expect(screen.getByRole('button', { name: 'Undo' })).toHaveProperty('disabled', false)
  })

  it('filters the tree from the search input and clears it', () => {
    setup()
    const input = screen.getByRole('searchbox', { name: 'Search elements' })
    fireEvent.change(input, { target: { value: 'h1' } })
    expect(screen.getByRole('tree').querySelectorAll('[role=treeitem][data-muted]').length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }))
    expect((input as HTMLInputElement).value).toBe('')
  })

  it('exposes palette entries as draggable buttons', () => {
    setup()
    expect(screen.getByTitle('Drag to insert <h1>')).toBeTruthy()
  })
})
