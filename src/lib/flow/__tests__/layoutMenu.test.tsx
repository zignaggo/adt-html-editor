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
  '<div id="row">' +
  '<div id="one"><p>One</p></div>' +
  '<div id="two"><p>Two</p></div>' +
  '</div>' +
  '<div id="words"><p id="lead">Lead</p><p id="tail">Tail</p></div>' +
  '<div id="story"><figure id="media"><img src="a.png" alt="a" /></figure><p id="body">Body</p></div>' +
  '<div id="mixed"><figure id="aside"><img src="b.png" alt="b" /></figure><p id="note">Note</p>' +
  '<ul id="list"><li>x</li></ul></div>' +
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

function stubWidth(element: HTMLElement, width: number) {
  const rect = { left: 0, top: 0, width, height: 80, right: width, bottom: 80, x: 0, y: 0 }
  element.getBoundingClientRect = () => ({ ...rect, toJSON: () => rect }) as DOMRect
  Object.defineProperty(element, 'clientWidth', { value: width, configurable: true })
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
  if (!root) throw new Error('canvas not rendered')

  const find = (selector: string) => {
    const element = root.querySelector<HTMLElement>(selector)
    if (!element) throw new Error(`no ${selector}`)
    return element
  }

  stubWidth(find('#row'), 600)
  stubWidth(find('#one'), 300)
  stubWidth(find('#two'), 300)

  return { store, root, find }
}

function classesOf(store: EditorStore, element: HTMLElement): string[] {
  const id = element.getAttribute('data-adt-id') ?? ''
  const node = store.state.doc.nodes[id]
  return node && 'classes' in node ? node.classes : []
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

async function openMenu(store: EditorStore, element: HTMLElement) {
  act(() => store.actions.select(element.getAttribute('data-adt-id')))
  await nextFrames()
  fireEvent.click(screen.getByRole('button', { name: 'Layout' }))
  await nextFrames()
}

async function pick(store: EditorStore, element: HTMLElement, label: string) {
  await openMenu(store, element)
  const before = store.state.history.past.length
  fireEvent.click(screen.getByRole('button', { name: label }))
  await nextFrames()
  return store.state.history.past.length - before
}

describe('layout menu', () => {
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
    vi.unstubAllGlobals()
  })

  it('shows every preset with an icon of its own', async () => {
    const { store, find } = await setup()
    await openMenu(store, find('#row'))

    const items = [...screen.getByLabelText('Layout presets').querySelectorAll('button')]
    const shapes = items.map((item) => item.querySelector('svg path')?.getAttribute('d') ?? '')

    expect(items).toHaveLength(12)
    expect(shapes.filter((shape) => shape === '')).toEqual([])
    expect(new Set(shapes).size).toBe(items.length)
  })

  it('a row aligns the children and stacks them on a phone, in one history entry', async () => {
    const { store, find } = await setup()
    const entries = await pick(store, find('#row'), 'Row · align centres')

    expect(entries).toBe(1)
    expect(classesOf(store, find('#row'))).toEqual([
      'flex',
      'flex-row',
      'justify-between',
      'items-center',
      'gap-6',
      'max-sm:flex-col',
      'max-sm:items-center',
    ])
    expect(classesOf(store, find('#one'))).toEqual([
      'w-[50%]',
      'min-w-0',
      'max-w-full',
      'shrink',
      'max-sm:w-full',
    ])
  })

  it('a row of tops and of bottoms differ only in the alignment', async () => {
    const { store, find } = await setup()
    await pick(store, find('#row'), 'Row · align tops')
    expect(classesOf(store, find('#row'))).toContain('items-start')

    await pick(store, find('#row'), 'Row · align bottoms')
    expect(classesOf(store, find('#row'))).toContain('items-end')
    expect(classesOf(store, find('#row'))).not.toContain('items-start')
  })

  it('centring contents is offered for paragraphs and writes the centred column', async () => {
    const { store, find } = await setup()
    const entries = await pick(store, find('#words'), 'Centre contents')

    expect(entries).toBe(1)
    expect(classesOf(store, find('#words'))).toEqual([
      'flex',
      'flex-col',
      'items-center',
      'justify-center',
      'gap-0',
    ])
    expect(classesOf(store, find('#lead'))).toEqual([
      'block',
      'w-full',
      'text-center',
      'break-words',
      'm-0',
    ])
  })

  it('centring contents is refused on a container of boxes', async () => {
    const { store, find } = await setup()
    await openMenu(store, find('#row'))

    expect(
      screen.getByRole('button', { name: /Centre contents, needs one to four paragraphs/ }),
    ).toHaveProperty('disabled', true)
  })

  it('equal columns writes the grid and fits every child', async () => {
    const { store, find } = await setup()
    const entries = await pick(store, find('#row'), 'Side by side · equal columns')

    expect(entries).toBe(1)
    expect(classesOf(store, find('#row'))).toEqual([
      'grid',
      'grid-cols-2',
      'gap-6',
      'items-start',
      'max-sm:grid-cols-1',
    ])
    expect(classesOf(store, find('#one'))).toEqual(['w-full', 'min-w-0', 'max-w-full'])
  })

  it('one below another writes a single column', async () => {
    const { store, find } = await setup()
    const entries = await pick(store, find('#row'), 'One below another')

    expect(entries).toBe(1)
    expect(classesOf(store, find('#row'))).toEqual(['grid', 'grid-cols-1', 'gap-6', 'items-start'])
  })

  it('switching order swaps the two children in one history entry', async () => {
    const { store, find } = await setup()
    const entries = await pick(store, find('#row'), 'Switch order')

    expect(entries).toBe(1)
    expect(childrenOf(store, find('#row'))).toEqual(['two', 'one'])
  })

  it('switching order is refused when there are not exactly two children', async () => {
    const { store, find } = await setup()
    await openMenu(store, find('#page'))

    expect(
      screen.getByRole('button', { name: /Switch order, needs exactly two children/ }),
    ).toHaveProperty('disabled', true)
  })

  it('wrapping text floats the object and spaces the paragraph', async () => {
    const { store, find } = await setup()
    const entries = await pick(store, find('#media'), 'Wrap text · object on right')

    expect(entries).toBe(1)
    expect(classesOf(store, find('#story'))).toEqual(['flow-root', 'w-full', 'min-w-0'])
    expect(classesOf(store, find('#media'))).toContain('float-right')
    expect(classesOf(store, find('#media'))).toContain('max-sm:float-none')
    expect(classesOf(store, find('#body'))).toContain('mb-6')
  })

  it('wrapping text builds its own flow root when the container holds more', async () => {
    const { store, find } = await setup()
    const entries = await pick(store, find('#aside'), 'Wrap text · object on left')

    expect(entries).toBe(1)
    expect(childrenOf(store, find('#mixed'))).toEqual(['div', 'list'])

    const root = find('#mixed').querySelector<HTMLElement>(':scope > div:first-child')
    if (!root) throw new Error('no flow root')
    expect(classesOf(store, root)).toEqual(['flow-root', 'w-full', 'min-w-0'])
    expect(childrenOf(store, root)).toEqual(['aside', 'note'])
    expect(classesOf(store, find('#aside'))).toContain('float-left')
  })

  it('wrapping text is refused with nothing to wrap around', async () => {
    const { store, find } = await setup()
    await openMenu(store, find('#words'))

    expect(
      screen.getByRole('button', { name: /Wrap text · object on left, nothing here/ }),
    ).toHaveProperty('disabled', true)
  })

  it('side by side with the next block builds the two-column wrapper', async () => {
    const { store, find } = await setup()
    const entries = await pick(store, find('#row'), 'Side by side with next')

    expect(entries).toBe(1)
    expect(childrenOf(store, find('#page'))).toEqual(['div', 'story', 'mixed'])

    const wrapper = find('#page').querySelector<HTMLElement>(':scope > div:first-child')
    if (!wrapper) throw new Error('no wrapper')
    expect(classesOf(store, wrapper)).toContain('grid-cols-2')
    expect(childrenOf(store, wrapper)).toEqual(['row', 'words'])
  })

  it('side by side with the previous block is refused on the first one', async () => {
    const { store, find } = await setup()
    await openMenu(store, find('#row'))

    expect(
      screen.getByRole('button', { name: /Side by side with previous, no block before/ }),
    ).toHaveProperty('disabled', true)
  })

  it('selects the whole piece instead of the tag that was clicked', async () => {
    const { store, find } = await setup()
    const image = find('#media img')
    await openMenu(store, image)
    fireEvent.click(screen.getByRole('button', { name: 'Select whole component' }))
    await nextFrames()

    expect(store.state.selectedId).toBe(find('#media').getAttribute('data-adt-id'))
  })
})
