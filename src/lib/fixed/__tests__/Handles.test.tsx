import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CanvasContext, type CanvasContextValue } from '../../components/Canvas/context'
import { useEditorStoreApi } from '../../components/Editor/context'
import { EditorProvider } from '../../components/Editor/EditorProvider'
import type { EditorStore } from '../../core/store'
import { isStyled } from '../../core/model'
import { FixedPage } from '../FixedPage'
import { Handles } from '../transform/Handles'

const DOCUMENT = `<!DOCTYPE html><html><head><meta name="viewport" content="width=1200, height=1600"></head><body>
<div style="position: absolute; left: 100px; top: 200px; width: 300px; height: 120px;">Box</div>
<p style="position: absolute; left: 700px; top: 900px; width: 200px;">Other</p>
</body></html>`

const canvasContext: CanvasContextValue = {
  width: 0,
  presetId: 'desktop',
  setPreset: () => {},
  isDark: false,
  setIsDark: () => {},
  stylesReady: true,
  zoom: 1,
  setZoom: () => {},
  ghostRef: { current: null },
  registerGhost: () => () => {},
  ghostLayerRef: { current: null },
  registerGhostLayer: () => {},
}

function CaptureStore({ onStore }: { onStore: (store: EditorStore) => void }) {
  const store = useEditorStoreApi()
  useEffect(() => {
    onStore(store)
  }, [onStore, store])
  return null
}

function rect(left: number, top: number, width: number, height: number): DOMRect {
  const box = { left, top, width, height, right: left + width, bottom: top + height, x: left, y: top }
  return { ...box, toJSON: () => box } as DOMRect
}

function layout(element: HTMLElement, box: { x: number; y: number; width: number; height: number }, parent: Element) {
  Object.defineProperties(element, {
    offsetLeft: { value: box.x, configurable: true },
    offsetTop: { value: box.y, configurable: true },
    offsetWidth: { value: box.width, configurable: true },
    offsetHeight: { value: box.height, configurable: true },
    offsetParent: { value: parent, configurable: true },
  })
}

async function nextFrames(count = 2) {
  for (let index = 0; index < count; index += 1) {
    await act(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())))
  }
}

async function setup() {
  let store: EditorStore | undefined
  render(
    <EditorProvider layout="fixed" defaultValue={DOCUMENT}>
      <CaptureStore onStore={(s) => (store = s)} />
      <CanvasContext value={canvasContext}>
        <FixedPage>
          <Handles />
        </FixedPage>
      </CanvasContext>
    </EditorProvider>,
  )
  if (!store) throw new Error('store not captured')
  const root = document.querySelector<HTMLElement>('[data-adt-canvas]')
  if (!root) throw new Error('canvas root missing')
  root.getBoundingClientRect = () => rect(0, 0, 1200, 1600)
  const box = root.querySelector<HTMLElement>('div[data-adt-id]')
  if (!box) throw new Error('box missing')
  layout(box, { x: 100, y: 200, width: 300, height: 120 }, root)
  const id = box.getAttribute('data-adt-id')
  if (!id) throw new Error('box id missing')
  act(() => store?.actions.select(id))
  await nextFrames()
  return { store, root, box, id }
}

function styleOf(store: EditorStore, id: string): string | undefined {
  const node = store.state.doc.nodes[id]
  return node && isStyled(node) ? node.attrs.style : undefined
}

describe('Canvas.Handles', () => {
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

  it('shows the frame over the selected element with eight handles and a rotate handle', async () => {
    await setup()
    const frame = document.querySelector<HTMLElement>('[data-adt-handles-frame]')
    expect(frame?.dataset.visible).toBe('true')
    expect(frame?.style.left).toBe('100px')
    expect(frame?.style.width).toBe('300px')
    expect(screen.getAllByRole('button', { name: /^Resize from/ })).toHaveLength(8)
    expect(screen.getByRole('button', { name: 'Rotate' })).toBeTruthy()
  })

  it('resizes from a corner and commits a single history entry', async () => {
    const { store, id } = await setup()
    const before = store.state.history.past.length
    const handle = screen.getByRole('button', { name: 'Resize from bottom-right' })

    fireEvent.pointerDown(handle, { clientX: 400, clientY: 320, button: 0, pointerId: 1 })
    fireEvent.pointerMove(handle, { clientX: 420, clientY: 330, pointerId: 1 })
    fireEvent.pointerMove(handle, { clientX: 440, clientY: 340, pointerId: 1 })
    fireEvent.pointerUp(handle, { clientX: 440, clientY: 340, pointerId: 1 })

    expect(styleOf(store, id)).toBe(
      'position: absolute; left: 100px; top: 200px; width: 340px; height: 140px',
    )
    expect(store.state.history.past.length).toBe(before + 1)
    expect(store.state.selectedId).toBe(id)
  })

  it('moves the origin when resizing from the top-left and keeps the ratio with shift', async () => {
    const { store, id } = await setup()
    const handle = screen.getByRole('button', { name: 'Resize from top-left' })

    fireEvent.pointerDown(handle, { clientX: 100, clientY: 200, button: 0, pointerId: 2 })
    fireEvent.pointerMove(handle, { clientX: 50, clientY: 230, pointerId: 2, shiftKey: true })
    fireEvent.pointerUp(handle, { clientX: 50, clientY: 230, pointerId: 2, shiftKey: true })

    expect(styleOf(store, id)).toBe(
      'position: absolute; left: 175px; top: 230px; width: 225px; height: 90px',
    )
  })

  it('restores the original style when the gesture is cancelled with Escape', async () => {
    const { store, id, box } = await setup()
    const original = styleOf(store, id)
    const handle = screen.getByRole('button', { name: 'Resize from right' })

    fireEvent.pointerDown(handle, { clientX: 400, clientY: 260, button: 0, pointerId: 3 })
    fireEvent.pointerMove(handle, { clientX: 480, clientY: 260, pointerId: 3 })
    expect(box.getAttribute('style')).toContain('width: 380px')

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(box.getAttribute('style')).toBe(original)
    expect(styleOf(store, id)).toBe(original)
    expect(store.state.history.past.length).toBe(0)
  })

  it('rotates around the center and snaps to right angles', async () => {
    const { store, id } = await setup()
    const handle = screen.getByRole('button', { name: 'Rotate' })

    fireEvent.pointerDown(handle, { clientX: 250, clientY: 100, button: 0, pointerId: 4 })
    fireEvent.pointerMove(handle, { clientX: 410, clientY: 262, pointerId: 4 })
    fireEvent.pointerUp(handle, { clientX: 410, clientY: 262, pointerId: 4 })

    expect(styleOf(store, id)).toBe(
      'position: absolute; left: 100px; top: 200px; width: 300px; height: 120px; transform: rotate(90deg)',
    )
  })

  it('does nothing for a locked element', async () => {
    const { store, id } = await setup()
    const original = styleOf(store, id)
    act(() => store.actions.setLocked(id, true))
    await nextFrames()
    const handle = screen.getByRole('button', { name: 'Resize from bottom-right' })
    fireEvent.pointerDown(handle, { clientX: 400, clientY: 320, button: 0, pointerId: 5 })
    fireEvent.pointerMove(handle, { clientX: 440, clientY: 340, pointerId: 5 })
    fireEvent.pointerUp(handle, { clientX: 440, clientY: 340, pointerId: 5 })
    expect(styleOf(store, id)).toBe(original)
  })
})
