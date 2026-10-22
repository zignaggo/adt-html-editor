import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Canvas } from '../../components/Canvas/Canvas'
import { CanvasViewport } from '../../components/Canvas/CanvasParts'
import { useEditorStoreApi } from '../../components/Editor/context'
import { EditorProvider } from '../../components/Editor/EditorProvider'
import type { EditorStore } from '../../core/store'
import { FlowControls } from '../FlowControls'
import { repositionUi, resetReposition, setRepositionArmed } from '../component/repositionStore'
import { FlowTransformSection } from '../transform/FlowTransformSection'
import { TRANSFORM_ATTRIBUTE } from '../transform/useFreeTransform'
import { resetTransform, setTransformActive, transformUi } from '../transform/transformStore'

const HTML = '<section id="page"><p id="intro">Intro</p><p id="outro">Outro</p></section>'

function CaptureStore({ onStore }: { onStore: (store: EditorStore) => void }) {
  const store = useEditorStoreApi()
  useEffect(() => {
    onStore(store)
  }, [onStore, store])
  return null
}

async function nextFrames(count = 3) {
  for (let index = 0; index < count; index += 1) {
    await act(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())))
  }
}

function stubRect(
  element: Element,
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

function pointer(clientX: number, clientY: number) {
  return { pointerId: 1, button: 0, clientX, clientY }
}

async function setup() {
  let store: EditorStore | undefined
  render(
    <EditorProvider defaultValue={HTML} layout="flow" flowLayout={{ directControls: true }}>
      <CaptureStore onStore={(s) => (store = s)} />
      <Canvas>
        <CanvasViewport>
          <FlowControls />
        </CanvasViewport>
      </Canvas>
      <FlowTransformSection />
    </EditorProvider>,
  )
  if (!store) throw new Error('store not captured')

  const root = document.querySelector<HTMLElement>('[data-adt-canvas]')
  const host = document.querySelector<HTMLElement>('[data-adt-canvas-scroll]')
  const section = root?.querySelector<HTMLElement>('section')
  const intro = root?.querySelector<HTMLElement>('#intro')
  if (!root || !host || !section || !intro) throw new Error('canvas not rendered')

  stubRect(host, { left: 0, top: 0, width: 600, height: 800 })
  stubRect(section, { left: 0, top: 0, width: 600, height: 200 })
  stubRect(intro, { left: 0, top: 0, width: 600, height: 100 })
  Object.defineProperty(section, 'clientWidth', { value: 600, configurable: true })

  return { store, root, section, intro }
}

function styleOf(store: EditorStore, id: string): string | undefined {
  const node = store.state.doc.nodes[id]
  return node && 'attrs' in node ? node.attrs.style : undefined
}

function idOf(element: HTMLElement): string {
  return element.getAttribute('data-adt-id') ?? ''
}

async function selectAndActivate(store: EditorStore, element: HTMLElement) {
  act(() => store.actions.select(idOf(element)))
  await nextFrames()
  act(() => setTransformActive(true))
  await nextFrames()
}

describe('free transform', () => {
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
    resetTransform()
    resetReposition()
    vi.unstubAllGlobals()
  })

  it('a drag writes translate inline, in one history entry', async () => {
    const { store, intro } = await setup()
    await selectAndActivate(store, intro)
    const before = store.state.history.past.length

    fireEvent.pointerDown(intro, pointer(100, 50))
    fireEvent.pointerMove(window, pointer(140, 70))
    fireEvent.pointerUp(window, pointer(140, 70))

    expect(styleOf(store, idOf(intro))).toContain('translate: 40px 20px')
    expect(store.state.history.past.length - before).toBe(1)
  })

  it('escape during the drag leaves nothing behind', async () => {
    const { store, intro } = await setup()
    await selectAndActivate(store, intro)
    const before = store.state.history.past.length

    fireEvent.pointerDown(intro, pointer(100, 50))
    fireEvent.pointerMove(window, pointer(140, 70))
    fireEvent.keyDown(window, { key: 'Escape' })
    fireEvent.pointerUp(window, pointer(140, 70))

    expect(styleOf(store, idOf(intro))).toBeUndefined()
    expect(store.state.history.past.length).toBe(before)
    expect(intro.getAttribute('style')).toBeNull()
  })

  it('arrow keys nudge by one, and by ten with shift', async () => {
    const { store, intro } = await setup()
    await selectAndActivate(store, intro)

    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(styleOf(store, idOf(intro))).toContain('translate: 1px')

    fireEvent.keyDown(window, { key: 'ArrowDown', shiftKey: true })
    expect(styleOf(store, idOf(intro))).toContain('10px')
  })

  it('marks the element while the mode is on, and never keeps the mark', async () => {
    const { store, intro } = await setup()
    await selectAndActivate(store, intro)
    expect(intro.hasAttribute(TRANSFORM_ATTRIBUTE)).toBe(true)

    act(() => setTransformActive(false))
    await nextFrames()
    expect(intro.hasAttribute(TRANSFORM_ATTRIBUTE)).toBe(false)
  })

  it('reset clears the offset', async () => {
    const { store, intro } = await setup()
    await selectAndActivate(store, intro)
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(styleOf(store, idOf(intro))).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
    expect(styleOf(store, idOf(intro))).toBeUndefined()
  })

  it('leaves the drag alone when the mode is off', async () => {
    const { store, intro } = await setup()
    act(() => store.actions.select(idOf(intro)))
    await nextFrames()

    fireEvent.pointerDown(intro, pointer(100, 50))
    fireEvent.pointerMove(window, pointer(560, 50))
    fireEvent.pointerUp(window, pointer(560, 50))

    expect(styleOf(store, idOf(intro))).toBeUndefined()
    const node = store.state.doc.nodes[idOf(intro)]
    expect(node && 'classes' in node ? node.classes : []).toEqual([])
  })

  it('turning it on disarms reposition, and arming reposition turns it off', async () => {
    const { store, intro } = await setup()
    act(() => store.actions.select(idOf(intro)))
    await nextFrames()

    act(() => setRepositionArmed(true))
    fireEvent.click(screen.getByRole('button', { name: 'Free transform' }))
    await nextFrames()

    expect(transformUi.state.active).toBe(true)
    expect(repositionUi.state.armed).toBe(false)
  })
})
