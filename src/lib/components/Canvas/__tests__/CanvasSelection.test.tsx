import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useEditorStoreApi } from '../../Editor/context'
import { EditorProvider } from '../../Editor/EditorProvider'
import type { EditorStore } from '../../../core/store'
import { Canvas } from '../Canvas'
import { CanvasViewport } from '../CanvasParts'

const HTML = '<section id="hero"><h1>Title</h1><p class="lead">Intro</p></section><aside>x</aside>'

function CaptureStore({ onStore }: { onStore: (store: EditorStore) => void }) {
  const store = useEditorStoreApi()
  useEffect(() => {
    onStore(store)
  }, [onStore, store])
  return null
}

async function nextFrames(count = 2) {
  for (let index = 0; index < count; index += 1) {
    await act(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())))
  }
}

function setup() {
  let store: EditorStore | undefined
  render(
    <EditorProvider defaultValue={HTML}>
      <CaptureStore onStore={(s) => (store = s)} />
      <Canvas>
        <CanvasViewport />
      </Canvas>
    </EditorProvider>,
  )
  if (!store) throw new Error('store not captured')
  const root = document.querySelector<HTMLElement>('[data-adt-canvas]')
  if (!root) throw new Error('canvas root missing')
  const pick = (selector: string) => {
    const element = root.querySelector<HTMLElement>(selector)
    if (!element) throw new Error(`${selector} missing`)
    return element
  }
  return { store, root, h1: pick('h1'), p: pick('p'), aside: pick('aside') }
}

function stubRect(
  element: HTMLElement,
  box: { left: number; top: number; width: number; height: number },
) {
  const rect = {
    ...box,
    right: box.left + box.width,
    bottom: box.top + box.height,
    x: box.left,
    y: box.top,
  }
  element.getBoundingClientRect = () => ({ ...rect, toJSON: () => rect }) as DOMRect
}

function tagOf(store: EditorStore, id: string): string {
  const node = store.state.doc.nodes[id]
  return node && 'tag' in node ? node.tag : node.kind
}

describe('canvas selection', () => {
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
    vi.unstubAllGlobals()
  })

  it('a plain click replaces the selection', () => {
    const { store, h1, aside } = setup()
    fireEvent.click(h1)
    fireEvent.click(aside)
    expect(store.state.selectedIds.map((id) => tagOf(store, id))).toEqual(['aside'])
  })

  it('shift+click toggles an element in and out', () => {
    const { store, h1, p } = setup()
    fireEvent.click(h1)
    fireEvent.click(p, { shiftKey: true })
    expect(store.state.selectedIds.map((id) => tagOf(store, id))).toEqual(['p', 'h1'])
    fireEvent.click(p, { shiftKey: true })
    expect(store.state.selectedIds.map((id) => tagOf(store, id))).toEqual(['h1'])
  })

  it('the pan modifier neither selects nor starts text editing', () => {
    const { store, h1, p } = setup()
    fireEvent.click(h1)

    fireEvent.click(p, { ctrlKey: true })
    expect(store.state.selectedIds.map((id) => tagOf(store, id))).toEqual(['h1'])

    fireEvent.click(p, { metaKey: true })
    expect(store.state.selectedIds.map((id) => tagOf(store, id))).toEqual(['h1'])

    fireEvent.doubleClick(p, { ctrlKey: true })
    expect(store.state.editingTextId).toBeNull()
  })

  it('shift+click on empty canvas keeps the selection', () => {
    const { store, root, h1 } = setup()
    fireEvent.click(h1)
    fireEvent.click(root, { shiftKey: true })
    expect(store.state.selectedIds).toHaveLength(1)
  })

  it('Escape clears every selected element', () => {
    const { store, root, h1, p } = setup()
    fireEvent.click(h1)
    fireEvent.click(p, { shiftKey: true })
    fireEvent.keyDown(root, { key: 'Escape' })
    expect(store.state.selectedIds).toHaveLength(0)
    expect(store.state.selectedId).toBeNull()
  })

  it('Delete removes every selected element in one entry', () => {
    const { store, root, h1, p } = setup()
    fireEvent.click(h1)
    fireEvent.click(p, { shiftKey: true })
    const ids = [...store.state.selectedIds]
    act(() => {
      fireEvent.keyDown(root, { key: 'Delete' })
    })
    expect(store.state.doc.nodes[ids[0]]).toBeUndefined()
    expect(store.state.doc.nodes[ids[1]]).toBeUndefined()
    expect(store.state.history.past).toHaveLength(1)
  })

  it('Enter starts text editing only with a single selection', () => {
    const { store, root, h1, p } = setup()
    fireEvent.click(h1)
    fireEvent.click(p, { shiftKey: true })
    fireEvent.keyDown(root, { key: 'Enter' })
    expect(store.state.editingTextId).toBeNull()

    fireEvent.click(h1)
    fireEvent.keyDown(root, { key: 'Enter' })
    expect(store.state.editingTextId).not.toBeNull()
  })

  it('keeps the outline inside the canvas viewport when the page is zoomed', async () => {
    const { h1 } = setup()
    const stage = document.querySelector<HTMLElement>('[data-adt-canvas-scroll]')
    if (!stage) throw new Error('stage missing')

    stubRect(stage, { left: 260, top: 88, width: 720, height: 772 })
    stubRect(h1, { left: 200, top: 40, width: 900, height: 120 })

    fireEvent.click(h1)
    await nextFrames()

    const clip = stage.querySelector<HTMLElement>('.overflow-hidden.fixed')
    if (!clip) throw new Error('clip layer missing')
    expect(clip.style.transform).toBe('translate3d(260px, 88px, 0)')
    expect([clip.style.width, clip.style.height]).toEqual(['720px', '772px'])

    const label = clip.querySelector('span')
    const box = label?.parentElement
    expect(box?.style.transform).toBe('translate3d(-60px, -48px, 0)')
    expect(clip.contains(box ?? null)).toBe(true)
  })

  it('draws one outline per member above a single selection', async () => {
    const { h1, p } = setup()
    fireEvent.click(h1)
    await nextFrames()
    expect(document.querySelectorAll('[data-adt-selection-outline]')).toHaveLength(0)

    fireEvent.click(p, { shiftKey: true })
    await nextFrames()
    const outlines = document.querySelectorAll<HTMLElement>('[data-adt-selection-outline]')
    expect(outlines).toHaveLength(2)
    expect([...outlines].every((box) => box.dataset.visible === 'true')).toBe(true)
  })
})
