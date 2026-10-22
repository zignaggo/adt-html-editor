import { cleanup, fireEvent, render } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useEditorStoreApi } from '../../Editor/context'
import { EditorProvider } from '../../Editor/EditorProvider'
import type { EditorStore } from '../../../core/store'
import { Canvas } from '../Canvas'
import { CanvasViewport } from '../CanvasParts'

const HTML = '<section id="hero"><h1>Title</h1></section>'

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
        <CanvasViewport>
          <button type="button">Overlay</button>
        </CanvasViewport>
      </Canvas>
    </EditorProvider>,
  )
  if (!store) throw new Error('store not captured')
  const stage = document.querySelector<HTMLElement>('[data-adt-canvas-scroll]')
  const root = document.querySelector<HTMLElement>('[data-adt-canvas]')
  if (!stage || !root) throw new Error('canvas missing')
  const h1 = root.querySelector<HTMLElement>('h1')
  const overlay = stage.querySelector<HTMLElement>('button')
  if (!h1 || !overlay) throw new Error('targets missing')
  return { store, stage, root, h1, overlay }
}

function clickAt(target: HTMLElement, from: { x: number; y: number }, to = from) {
  fireEvent.pointerDown(target, { isPrimary: true, button: 0, clientX: from.x, clientY: from.y })
  fireEvent.click(target, { clientX: to.x, clientY: to.y })
}

describe('canvas backdrop', () => {
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

  it('clears the selection when the empty area around the page is clicked', () => {
    const { store, stage, h1 } = setup()
    fireEvent.click(h1)
    expect(store.state.selectedIds).toHaveLength(1)

    clickAt(stage, { x: 10, y: 10 })
    expect(store.state.selectedIds).toHaveLength(0)
    expect(store.state.selectedId).toBeNull()
  })

  it('keeps the selection when the click ends a drag', () => {
    const { store, stage, h1 } = setup()
    fireEvent.click(h1)

    clickAt(stage, { x: 10, y: 10 }, { x: 120, y: 60 })
    expect(store.state.selectedIds).toHaveLength(1)
  })

  it('keeps the selection when an overlay control above the page is clicked', () => {
    const { store, h1, overlay } = setup()
    fireEvent.click(h1)

    clickAt(overlay, { x: 10, y: 10 })
    expect(store.state.selectedIds).toHaveLength(1)
  })

  it('keeps the selection while the pan modifier is held', () => {
    const { store, stage, h1 } = setup()
    fireEvent.click(h1)

    fireEvent.pointerDown(stage, { isPrimary: true, button: 0, clientX: 10, clientY: 10 })
    fireEvent.click(stage, { clientX: 10, clientY: 10, ctrlKey: true })
    expect(store.state.selectedIds).toHaveLength(1)
  })
})
