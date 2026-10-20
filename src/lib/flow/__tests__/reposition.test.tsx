import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Canvas } from '../../components/Canvas/Canvas'
import { CanvasViewport } from '../../components/Canvas/CanvasParts'
import { useEditorStoreApi } from '../../components/Editor/context'
import { EditorProvider } from '../../components/Editor/EditorProvider'
import type { EditorStore } from '../../core/store'
import { FlowControls } from '../FlowControls'
import { FlowToolbar } from '../FlowToolbar'
import { resetReposition } from '../component/repositionStore'

const HTML =
  '<section id="page">' +
  '<p id="intro">Intro</p>' +
  '<figure id="media"><img src="a.png" alt="a" /></figure>' +
  '<p id="outro">Outro</p>' +
  '</section>'

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

function pointsAt(...elements: Element[]) {
  Object.defineProperty(document, 'elementsFromPoint', {
    value: () => elements,
    configurable: true,
    writable: true,
  })
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
        <FlowToolbar />
      </Canvas>
    </EditorProvider>,
  )
  if (!store) throw new Error('store not captured')

  const root = document.querySelector<HTMLElement>('[data-adt-canvas]')
  const host = document.querySelector<HTMLElement>('[data-adt-canvas-scroll]')
  const section = root?.querySelector<HTMLElement>('section')
  const intro = root?.querySelector<HTMLElement>('#intro')
  const media = root?.querySelector<HTMLElement>('#media')
  const outro = root?.querySelector<HTMLElement>('#outro')
  if (!root || !host || !section || !intro || !media || !outro) throw new Error('canvas not rendered')

  stubRect(host, { left: 0, top: 0, width: 600, height: 800 })
  stubRect(section, { left: 0, top: 0, width: 600, height: 300 })
  stubRect(intro, { left: 0, top: 0, width: 600, height: 100 })
  stubRect(media, { left: 0, top: 100, width: 300, height: 100 })
  stubRect(outro, { left: 0, top: 200, width: 600, height: 100 })
  Object.defineProperty(section, 'clientWidth', { value: 600, configurable: true })

  return { store, root, section, intro, media, outro }
}

function childrenOf(store: EditorStore, element: HTMLElement): string[] {
  const id = element.getAttribute('data-adt-id') ?? ''
  const node = store.state.doc.nodes[id]
  if (!node || node.kind !== 'element') return []
  return node.children
    .map((childId) => store.state.doc.nodes[childId])
    .filter((child) => child.kind === 'element')
    .map((child) => (child.kind === 'element' ? (child.attrs.id ?? child.tag) : ''))
}

function classesOf(store: EditorStore, id: string): string[] {
  const node = store.state.doc.nodes[id]
  return node && 'classes' in node ? node.classes : []
}

function idOf(element: HTMLElement): string {
  return element.getAttribute('data-adt-id') ?? ''
}

async function selectAndArm(store: EditorStore, element: HTMLElement) {
  act(() => store.actions.select(element.getAttribute('data-adt-id')))
  await nextFrames()
  const button = screen.getByRole('button', { name: 'Reposition' })
  fireEvent.click(button)
  await nextFrames()
  return button
}

describe('reposition', () => {
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
    resetReposition()
    Reflect.deleteProperty(document, 'elementsFromPoint')
    vi.unstubAllGlobals()
  })

  it('drags the whole piece to a new place in one history entry', async () => {
    const { store, section, media, intro } = await setup()
    act(() => store.actions.select(media.getAttribute('data-adt-id')))
    await nextFrames()
    const before = store.state.history.past.length

    pointsAt(intro, section)
    fireEvent.pointerDown(media, pointer(150, 150))
    fireEvent.pointerMove(window, pointer(300, 10))
    fireEvent.pointerUp(window, pointer(300, 10))

    expect(childrenOf(store, section)).toEqual(['media', 'intro', 'outro'])
    expect(store.state.history.past.length - before).toBe(1)
  })

  it('promotes the selection to the figure around the image', async () => {
    const { store, section, media, outro } = await setup()
    const image = media.querySelector<HTMLElement>('img')!
    stubRect(image, { left: 0, top: 100, width: 300, height: 100 })
    act(() => store.actions.select(image.getAttribute('data-adt-id')))
    await nextFrames()

    pointsAt(outro, section)
    fireEvent.pointerDown(image, pointer(150, 150))
    fireEvent.pointerMove(window, pointer(300, 290))
    fireEvent.pointerUp(window, pointer(300, 290))

    expect(childrenOf(store, section)).toEqual(['intro', 'outro', 'media'])
  })

  it('a side drop builds the two-column wrapper', async () => {
    const { store, section, intro, outro } = await setup()
    await selectAndArm(store, intro)

    pointsAt(outro, section)
    fireEvent.pointerDown(intro, pointer(300, 50))
    fireEvent.pointerMove(window, pointer(580, 250))
    fireEvent.pointerUp(window, pointer(580, 250))

    expect(childrenOf(store, section)).toEqual(['media', 'div'])

    const parent = store.state.doc.nodes[idOf(section)]
    if (parent.kind !== 'element') throw new Error('not an element')
    const wrapper = store.state.doc.nodes[parent.children[parent.children.length - 1]]
    if (wrapper.kind !== 'element') throw new Error('no wrapper')
    expect(wrapper.classes).toContain('grid-cols-2')
    expect(wrapper.classes).toContain('max-sm:grid-cols-1')
    expect(wrapper.children).toHaveLength(2)
  })

  it('a float drop wraps the text around the object', async () => {
    const { store, media, outro } = await setup()
    const mediaId = idOf(media)
    act(() => store.actions.select(mediaId))
    await nextFrames()

    pointsAt(outro)
    fireEvent.pointerDown(media, pointer(150, 150))
    fireEvent.pointerMove(window, pointer(20, 250))
    fireEvent.pointerUp(window, pointer(20, 250))

    const classes = classesOf(store, mediaId)
    expect(classes).toContain('float-left')
    expect(classes).toContain('w-1/3')
    expect(classes).toContain('max-sm:float-none')
  })

  it('escape leaves the piece exactly where it was', async () => {
    const { store, section, media, intro } = await setup()
    act(() => store.actions.select(media.getAttribute('data-adt-id')))
    await nextFrames()
    const before = store.state.history.past.length

    pointsAt(intro, section)
    fireEvent.pointerDown(media, pointer(150, 150))
    fireEvent.pointerMove(window, pointer(300, 10))
    fireEvent.keyDown(window, { key: 'Escape' })
    fireEvent.pointerUp(window, pointer(300, 10))

    expect(childrenOf(store, section)).toEqual(['intro', 'media', 'outro'])
    expect(store.state.history.past.length).toBe(before)
    expect(media.getAttribute('style')).toBeNull()
  })

  it('arming the button routes a drag on a plain block to reposition', async () => {
    const { store, section, intro, outro } = await setup()
    await selectAndArm(store, intro)

    pointsAt(outro, section)
    fireEvent.pointerDown(intro, pointer(300, 50))
    fireEvent.pointerMove(window, pointer(300, 290))
    fireEvent.pointerUp(window, pointer(300, 290))

    expect(childrenOf(store, section)).toEqual(['media', 'outro', 'intro'])
  })

  it('without arming, a plain block keeps the alignment gesture', async () => {
    const { store, section, intro, outro } = await setup()
    act(() => store.actions.select(intro.getAttribute('data-adt-id')))
    await nextFrames()

    pointsAt(outro, section)
    fireEvent.pointerDown(intro, pointer(300, 50))
    fireEvent.pointerMove(window, pointer(560, 50))
    fireEvent.pointerUp(window, pointer(560, 50))

    expect(childrenOf(store, section)).toEqual(['intro', 'media', 'outro'])
    expect(classesOf(store, idOf(intro))).toContain('text-right')
  })

  it('refuses a piece inside a list', async () => {
    const { store } = await setup()
    act(() =>
      store.actions.replaceDocument('<ul><li><div id="cell">x</div></li></ul>'),
    )
    await nextFrames()
    const cell = document.querySelector<HTMLElement>('#cell')!
    act(() => store.actions.select(cell.getAttribute('data-adt-id')))
    await nextFrames()

    expect(screen.queryByRole('button', { name: 'Reposition' })).toBeNull()
    expect(
      screen.getByRole('button', { name: /Reposition is not available/ }),
    ).toHaveProperty('disabled', true)
  })
})
