import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Canvas } from '../../components/Canvas/Canvas'
import { CanvasViewport } from '../../components/Canvas/CanvasParts'
import { useEditorStoreApi } from '../../components/Editor/context'
import { EditorProvider } from '../../components/Editor/EditorProvider'
import type { EditorStore } from '../../core/store'
import { FlowControls } from '../FlowControls'

const HTML = '<section id="hero"><div class="card"><div class="inner"><p>Inside</p></div></div></section>'

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

function stubContentHeight(element: Element, value: number) {
  Object.defineProperty(element, 'scrollHeight', { value, configurable: true })
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
    </EditorProvider>,
  )
  if (!store) throw new Error('store not captured')

  const root = document.querySelector<HTMLElement>('[data-adt-canvas]')
  const host = document.querySelector<HTMLElement>('[data-adt-canvas-scroll]')
  const card = root?.querySelector<HTMLElement>('.card')
  const inner = root?.querySelector<HTMLElement>('.inner')
  const paragraph = root?.querySelector<HTMLElement>('p')
  if (!root || !host || !card || !inner || !paragraph) throw new Error('canvas not rendered')

  stubRect(host, { left: 0, top: 0, width: 600, height: 800 })
  stubRect(card, { left: 0, top: 0, width: 600, height: 100 })
  stubRect(inner, { left: 0, top: 0, width: 600, height: 100 })
  stubContentHeight(inner, 100)

  return { store, card, inner, paragraph }
}

function classesOf(store: EditorStore, element: HTMLElement): string[] {
  const id = element.getAttribute('data-adt-id') ?? ''
  const node = store.state.doc.nodes[id]
  return node && 'classes' in node ? node.classes : []
}

async function select(store: EditorStore, element: HTMLElement) {
  act(() => store.actions.select(element.getAttribute('data-adt-id')))
  await nextFrames()
}

function dragHeight(from: number, to: number) {
  const handle = screen.getByRole('button', { name: 'Height' })
  fireEvent.pointerDown(handle, pointer(300, from))
  fireEvent.pointerMove(window, pointer(300, to))
  fireEvent.pointerUp(window, pointer(300, to))
}

describe('the height handle', () => {
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

  it('writes the height as classes, in one history entry', async () => {
    const { store, card } = await setup()
    await select(store, card)
    const before = store.state.history.past.length

    dragHeight(100, 180)

    const classes = classesOf(store, card)
    expect(classes).toContain('h-auto')
    expect(classes).toContain('min-h-[180px]')
    expect(classes).toContain('max-h-none')
    expect(classes).toContain('box-border')
    expect(store.state.history.past.length - before).toBe(1)
  })

  it('centres the content when the box wraps a single child', async () => {
    const { store, card } = await setup()
    await select(store, card)

    dragHeight(100, 180)

    const classes = classesOf(store, card)
    expect(classes).toContain('flex')
    expect(classes).toContain('flex-col')
    expect(classes).toContain('justify-center')
  })

  it('stops at the height the content needs', async () => {
    const { store, card } = await setup()
    await select(store, card)

    dragHeight(100, 20)

    expect(classesOf(store, card)).toContain('min-h-[100px]')
  })

  it('leaves the box alone when the drag is rolled back', async () => {
    const { store, card } = await setup()
    await select(store, card)
    const before = store.state.history.past.length

    const handle = screen.getByRole('button', { name: 'Height' })
    fireEvent.pointerDown(handle, pointer(300, 100))
    fireEvent.pointerMove(window, pointer(300, 180))
    fireEvent.keyDown(window, { key: 'Escape' })
    fireEvent.pointerUp(window, pointer(300, 180))

    expect(classesOf(store, card)).toEqual(['card'])
    expect(store.state.history.past.length).toBe(before)
    expect(card.getAttribute('style')).toBeNull()
  })

  it('stays away from a paragraph, which is not a box', async () => {
    const { store, paragraph } = await setup()
    await select(store, paragraph)

    expect(screen.queryByRole('button', { name: 'Height' })).toBeNull()
  })

  it('stays away when a descendant is locked', async () => {
    const { store, card, inner } = await setup()
    act(() => store.actions.setLocked(inner.getAttribute('data-adt-id') ?? '', true))
    await select(store, card)

    expect(screen.queryByRole('button', { name: 'Height' })).toBeNull()
  })
})
