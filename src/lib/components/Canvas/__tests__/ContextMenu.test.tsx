import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearClipboard } from '../../../core/clipboard'
import type { EditorStore } from '../../../core/store'
import { useEditorStoreApi } from '../../Editor/context'
import { EditorProvider } from '../../Editor/EditorProvider'
import { Canvas } from '../Canvas'
import { CanvasViewport } from '../CanvasParts'
import { CanvasContextMenu } from '../menu/CanvasContextMenu'
import { closeContextMenu } from '../menu/contextMenuStore'
import { clearStyleClipboard } from '../menu/styleClipboard'

const HTML = '<section id="hero"><h1 class="title">Title</h1><p class="lead">Intro</p></section>'

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
      <Canvas>
        <CanvasViewport />
        <CanvasContextMenu />
      </Canvas>
    </EditorProvider>,
  )
  if (!store) throw new Error('store not captured')

  const root = document.querySelector<HTMLElement>('[data-adt-canvas]')
  const heading = root?.querySelector<HTMLElement>('h1')
  const paragraph = root?.querySelector<HTMLElement>('p')
  const section = root?.querySelector<HTMLElement>('section')
  if (!root || !heading || !paragraph || !section) throw new Error('canvas not rendered')

  return { store, root, heading, paragraph, section }
}

function idOf(element: HTMLElement): string {
  return element.getAttribute('data-adt-id') ?? ''
}

function nodeOf(store: EditorStore, id: string) {
  return store.state.doc.nodes[id]
}

function childTags(store: EditorStore, parent: HTMLElement): string[] {
  const node = nodeOf(store, idOf(parent))
  if (!node || node.kind !== 'element') return []
  return node.children
    .map((childId) => store.state.doc.nodes[childId])
    .filter((child) => child.kind === 'element')
    .map((child) => (child.kind === 'element' ? child.tag : ''))
}

function openOn(element: HTMLElement) {
  fireEvent.contextMenu(element, { clientX: 40, clientY: 40 })
}

function item(name: string): HTMLButtonElement {
  return screen.getByRole('menuitem', { name })
}

describe('canvas context menu', () => {
  beforeEach(() => {
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
    closeContextMenu()
    clearClipboard()
    clearStyleClipboard()
    vi.unstubAllGlobals()
  })

  it('selects the element it opens on', () => {
    const { store, heading } = setup()
    expect(store.state.selectedIds).toHaveLength(0)

    openOn(heading)

    expect(store.state.selectedIds).toEqual([idOf(heading)])
    expect(screen.getByRole('menu', { name: 'Element actions' })).toBeTruthy()
  })

  it('keeps a multi-selection the element is already part of', () => {
    const { store, heading, paragraph } = setup()
    act(() => store.actions.selectMany([idOf(heading), idOf(paragraph)]))

    openOn(paragraph)

    expect(store.state.selectedIds).toHaveLength(2)
  })

  it('duplicates and deletes', () => {
    const { store, heading, section } = setup()
    openOn(heading)
    fireEvent.click(item('Duplicate'))

    expect(childTags(store, section)).toEqual(['h1', 'h1', 'p'])

    openOn(section.querySelector<HTMLElement>('h1')!)
    fireEvent.click(item('Delete'))
    expect(childTags(store, section)).toEqual(['h1', 'p'])
  })

  it('copies a style and pastes it onto another element', () => {
    const { store, heading, paragraph } = setup()
    act(() => store.actions.setAttr(idOf(heading), 'style', 'color: red'))

    openOn(heading)
    fireEvent.click(item('Copy style'))

    openOn(paragraph)
    fireEvent.click(item('Paste style'))

    const node = nodeOf(store, idOf(paragraph))
    expect(node && 'classes' in node ? node.classes : []).toEqual(['title'])
    expect(node && 'attrs' in node ? node.attrs.style : undefined).toBe('color: red')
  })

  it('pastes a style onto the whole selection in one history entry', () => {
    const { store, heading, paragraph, section } = setup()
    openOn(heading)
    fireEvent.click(item('Copy style'))

    act(() => store.actions.selectMany([idOf(paragraph), idOf(section)]))
    const before = store.state.history.past.length
    openOn(paragraph)
    fireEvent.click(item('Paste style'))

    expect(store.state.history.past.length - before).toBe(1)
  })

  it('copies an element and pastes it as the next sibling', () => {
    const { store, heading, section } = setup()
    openOn(heading)
    fireEvent.click(item('Copy'))

    openOn(section.querySelector<HTMLElement>('p')!)
    fireEvent.click(item('Paste'))

    expect(childTags(store, section)).toEqual(['h1', 'p', 'h1'])
  })

  it('disables what the selection cannot do', () => {
    const { store, heading } = setup()
    openOn(heading)

    expect(item('Paste').disabled).toBe(true)
    expect(item('Paste style').disabled).toBe(true)
    expect(item('Select parent').disabled).toBe(false)

    act(() => store.actions.setLocked(idOf(heading), true))
    expect(item('Duplicate').disabled).toBe(true)
    expect(item('Delete').disabled).toBe(true)
  })

  it('locks and unlocks, and says which one it offers', () => {
    const { store, heading } = setup()
    openOn(heading)
    fireEvent.click(item('Lock'))

    expect(store.state.locked[idOf(heading)]).toBe(true)

    openOn(heading)
    fireEvent.click(item('Unlock'))
    expect(store.state.locked[idOf(heading)]).toBeUndefined()
  })

  it('selects the parent', () => {
    const { store, heading, section } = setup()
    openOn(heading)
    fireEvent.click(item('Select parent'))

    expect(store.state.selectedIds).toEqual([idOf(section)])
  })

  it('closes on escape and on a click outside', () => {
    const { heading } = setup()
    openOn(heading)
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' })
    expect(screen.queryByRole('menu')).toBeNull()

    openOn(heading)
    fireEvent.pointerDown(document.body)
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('does not open on the bare canvas', () => {
    const { root } = setup()
    fireEvent.contextMenu(root, { clientX: 10, clientY: 10 })
    expect(screen.queryByRole('menu')).toBeNull()
  })
})
