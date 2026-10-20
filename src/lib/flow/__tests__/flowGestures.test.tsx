import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Canvas } from '../../components/Canvas/Canvas'
import { CanvasViewport } from '../../components/Canvas/CanvasParts'
import { useEditorStoreApi } from '../../components/Editor/context'
import { EditorProvider } from '../../components/Editor/EditorProvider'
import type { EditorStore } from '../../core/store'
import { FlowControls } from '../FlowControls'

const HTML = '<section id="hero"><h1>Title</h1><p class="lead">Intro</p></section>'

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

function selectionAllowed(element: Element): boolean {
  return fireEvent(element, new Event('selectstart', { bubbles: true, cancelable: true }))
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
  const section = root?.querySelector<HTMLElement>('section')
  const h1 = root?.querySelector<HTMLElement>('h1')
  const paragraph = root?.querySelector<HTMLElement>('p')
  if (!root || !host || !section || !h1 || !paragraph) throw new Error('canvas not rendered')

  stubRect(host, { left: 0, top: 0, width: 600, height: 800 })
  stubRect(section, { left: 0, top: 0, width: 600, height: 80 })
  stubRect(h1, { left: 0, top: 0, width: 600, height: 40 })
  stubRect(paragraph, { left: 0, top: 40, width: 200, height: 40 })
  Object.defineProperty(section, 'clientWidth', { value: 600, configurable: true })

  return { store, root, section, h1, paragraph }
}

function classesOf(store: EditorStore, element: HTMLElement): string[] {
  const id = element.getAttribute('data-adt-id') ?? ''
  const node = store.state.doc.nodes[id]
  return node && 'classes' in node ? node.classes : []
}

function tagsIn(store: EditorStore, parent: HTMLElement): string[] {
  const id = parent.getAttribute('data-adt-id') ?? ''
  const node = store.state.doc.nodes[id]
  if (!node || node.kind !== 'element') return []
  return node.children
    .map((childId) => store.state.doc.nodes[childId])
    .filter((child) => child.kind === 'element')
    .map((child) => (child.kind === 'element' ? child.tag : ''))
}

describe('flow gestures', () => {
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

  it('a sideways drag writes the alignment as a class, in one history entry', async () => {
    const { store, paragraph } = await setup()
    act(() => store.actions.select(paragraph.getAttribute('data-adt-id')))
    await nextFrames()
    const before = store.state.history.past.length

    fireEvent.pointerDown(paragraph, pointer(100, 60))
    fireEvent.pointerMove(window, pointer(500, 60))
    fireEvent.pointerUp(window, pointer(500, 60))

    expect(classesOf(store, paragraph)).toContain('text-right')
    expect(store.state.history.past.length - before).toBe(1)
  })

  it('a vertical drag reorders the node without writing a class', async () => {
    const { store, section, paragraph } = await setup()
    act(() => store.actions.select(paragraph.getAttribute('data-adt-id')))
    await nextFrames()

    expect(tagsIn(store, section)).toEqual(['h1', 'p'])

    fireEvent.pointerDown(paragraph, pointer(100, 60))
    fireEvent.pointerMove(window, pointer(100, 5))
    fireEvent.pointerUp(window, pointer(100, 5))

    expect(tagsIn(store, section)).toEqual(['p', 'h1'])
    expect(classesOf(store, paragraph)).toEqual(['lead'])
  })

  it('a corner drag writes the width as a percentage of the row', async () => {
    const { store, paragraph } = await setup()
    act(() => store.actions.select(paragraph.getAttribute('data-adt-id')))
    await nextFrames()

    const corner = screen.getByRole('button', { name: 'Resize from the bottom right' })
    fireEvent.pointerDown(corner, pointer(200, 80))
    fireEvent.pointerMove(window, pointer(300, 80))
    fireEvent.pointerUp(window, pointer(300, 80))

    const classes = classesOf(store, paragraph)
    expect(classes).toContain('w-[50%]')
    expect(classes).toContain('max-w-full')
    expect(classes).toContain('box-border')
  })

  it('the amber handle writes the space below in steps of four', async () => {
    const { store, paragraph } = await setup()
    act(() => store.actions.select(paragraph.getAttribute('data-adt-id')))
    await nextFrames()

    const handle = screen.getByRole('button', { name: 'Space below' })
    fireEvent.pointerDown(handle, pointer(150, 80))
    fireEvent.pointerMove(window, pointer(150, 102))
    fireEvent.pointerUp(window, pointer(150, 102))

    expect(classesOf(store, paragraph)).toContain('mb-6')
  })

  it('escape rolls the gesture back and writes nothing', async () => {
    const { store, paragraph } = await setup()
    act(() => store.actions.select(paragraph.getAttribute('data-adt-id')))
    await nextFrames()
    const before = store.state.history.past.length

    fireEvent.pointerDown(paragraph, pointer(100, 60))
    fireEvent.pointerMove(window, pointer(500, 60))
    fireEvent.keyDown(window, { key: 'Escape' })
    fireEvent.pointerUp(window, pointer(500, 60))

    expect(classesOf(store, paragraph)).toEqual(['lead'])
    expect(store.state.history.past.length).toBe(before)
    expect(paragraph.getAttribute('style')).toBeNull()
  })

  it('refuses the native text selection for as long as the drag lasts', async () => {
    const { store, paragraph } = await setup()
    act(() => store.actions.select(paragraph.getAttribute('data-adt-id')))
    await nextFrames()

    const before = selectionAllowed(paragraph)
    expect(before).toBe(true)

    fireEvent.pointerDown(paragraph, pointer(100, 60))
    expect(selectionAllowed(paragraph)).toBe(false)

    fireEvent.pointerMove(window, pointer(100, 5))
    expect(paragraph.hasAttribute('data-adt-flow-gesture')).toBe(true)

    fireEvent.pointerUp(window, pointer(100, 5))
    expect(paragraph.hasAttribute('data-adt-flow-gesture')).toBe(false)
    expect(selectionAllowed(paragraph)).toBe(true)
  })

  it('lets the selection go again when the drag is cancelled', async () => {
    const { store, paragraph } = await setup()
    act(() => store.actions.select(paragraph.getAttribute('data-adt-id')))
    await nextFrames()

    fireEvent.pointerDown(paragraph, pointer(100, 60))
    fireEvent.pointerMove(window, pointer(500, 60))
    fireEvent.keyDown(window, { key: 'Escape' })

    expect(selectionAllowed(paragraph)).toBe(true)
  })

  it('marks the canvas as direct so the page text is not selectable by dragging', async () => {
    const { root } = await setup()

    expect(root.hasAttribute('data-adt-direct')).toBe(true)
  })

  it('marks a movable selection for the grab cursor, and only while it can move', async () => {
    const { store, paragraph } = await setup()
    const id = paragraph.getAttribute('data-adt-id') ?? ''
    act(() => store.actions.select(id))
    await nextFrames()

    expect(paragraph.hasAttribute('data-adt-flow-move')).toBe(true)

    act(() => store.actions.select(null))
    await nextFrames()

    expect(paragraph.hasAttribute('data-adt-flow-move')).toBe(false)
  })

  it('stays out of the way when the selection is locked', async () => {
    const { store, paragraph } = await setup()
    const id = paragraph.getAttribute('data-adt-id') ?? ''
    act(() => {
      store.actions.select(id)
      store.actions.setLocked(id, true)
    })
    await nextFrames()

    expect(screen.queryByRole('button', { name: 'Space below' })).toBeNull()

    fireEvent.pointerDown(paragraph, pointer(100, 60))
    fireEvent.pointerMove(window, pointer(500, 60))
    fireEvent.pointerUp(window, pointer(500, 60))

    expect(classesOf(store, paragraph)).toEqual(['lead'])
  })
})
