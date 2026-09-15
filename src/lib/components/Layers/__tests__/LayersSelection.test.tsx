import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { useEditorStoreApi } from '../../Editor/context'
import { EditorProvider } from '../../Editor/EditorProvider'
import type { EditorStore } from '../../../core/store'
import { LayersPanel } from '../LayersPanel'

const HTML =
  '<section id="hero"><h1>Title</h1><p class="lead">Intro</p></section><aside><span>x</span></aside>'

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
    <EditorProvider defaultValue={HTML}>
      <CaptureStore onStore={(s) => (store = s)} />
      <LayersPanel />
    </EditorProvider>,
  )
  if (!store) throw new Error('store not captured')
  return store
}

function rowFor(label: string) {
  return screen.getAllByRole('treeitem').find((row) => row.textContent?.trim().startsWith(label))!
}

function click(row: HTMLElement, init?: MouseEventInit) {
  fireEvent.pointerDown(row)
  fireEvent.focus(row)
  fireEvent.click(row, init)
}

describe('HtmlEditor.Layers selection', () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = vi.fn()
  })
  afterEach(cleanup)

  it('marks the tree as multi selectable', () => {
    setup()
    expect(screen.getByRole('tree').getAttribute('aria-multiselectable')).toBe('true')
  })

  it('a plain click replaces the selection', () => {
    const store = setup()
    click(rowFor('h1'))
    click(rowFor('aside'))
    expect(store.state.selectedIds).toHaveLength(1)
    expect(rowFor('aside').getAttribute('aria-selected')).toBe('true')
  })

  it('ctrl+click toggles a row in and out of the selection', () => {
    const store = setup()
    click(rowFor('h1'))
    click(rowFor('p'), { ctrlKey: true })
    expect(store.state.selectedIds).toHaveLength(2)
    expect(rowFor('h1').getAttribute('aria-selected')).toBe('true')
    expect(rowFor('p').getAttribute('aria-selected')).toBe('true')

    click(rowFor('p'), { ctrlKey: true })
    expect(store.state.selectedIds).toHaveLength(1)
    expect(rowFor('p').getAttribute('aria-selected')).toBe('false')
  })

  it('shift+click selects the visible range and normalizes nested rows', () => {
    const store = setup()
    click(rowFor('h1'))
    click(rowFor('aside'), { shiftKey: true })
    const labels = store.state.selectedIds.map((id) => {
      const node = store.state.doc.nodes[id]
      return node && 'tag' in node ? node.tag : node.kind
    })
    expect(labels).toEqual(['h1', 'p', 'aside'])
  })

  it('shift+click from an ancestor keeps only the ancestor', () => {
    const store = setup()
    click(rowFor('section'))
    click(rowFor('p'), { shiftKey: true })
    expect(store.state.selectedIds).toHaveLength(1)
    expect(store.state.doc.nodes[store.state.selectedIds[0]]).toMatchObject({ tag: 'section' })
  })

  it('a pointer focus does not wipe a modifier selection', () => {
    const store = setup()
    click(rowFor('h1'))
    const target = rowFor('p')
    fireEvent.pointerDown(target)
    fireEvent.focus(target)
    expect(store.state.selectedIds).toHaveLength(1)
    fireEvent.click(target, { ctrlKey: true })
    expect(store.state.selectedIds).toHaveLength(2)
  })

  it('keyboard focus still replaces the selection', () => {
    const store = setup()
    click(rowFor('h1'))
    fireEvent.focus(rowFor('aside'))
    expect(store.state.selectedIds).toHaveLength(1)
    expect(store.state.doc.nodes[store.state.selectedIds[0]]).toMatchObject({ tag: 'aside' })
  })

  it('Delete removes every selected element in one entry', () => {
    const store = setup()
    click(rowFor('h1'))
    click(rowFor('p'), { ctrlKey: true })
    const ids = [...store.state.selectedIds]
    act(() => {
      fireEvent.keyDown(screen.getByRole('tree'), { key: 'Delete' })
    })
    expect(store.state.doc.nodes[ids[0]]).toBeUndefined()
    expect(store.state.doc.nodes[ids[1]]).toBeUndefined()
    expect(store.state.history.past).toHaveLength(1)
  })

  it('Ctrl+D duplicates every selected element in one entry', () => {
    const store = setup()
    click(rowFor('h1'))
    click(rowFor('p'), { ctrlKey: true })
    act(() => {
      fireEvent.keyDown(screen.getByRole('tree'), { key: 'd', ctrlKey: true })
    })
    expect(store.state.selectedIds).toHaveLength(2)
    expect(store.state.history.past).toHaveLength(1)
    expect(store.actions.getHtml()).toContain('<h1>Title</h1><h1>Title</h1>')
  })
})
