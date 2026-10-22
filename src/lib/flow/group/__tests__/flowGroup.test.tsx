import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Canvas } from '../../../components/Canvas/Canvas'
import { CanvasViewport } from '../../../components/Canvas/CanvasParts'
import { useEditorStoreApi } from '../../../components/Editor/context'
import { EditorProvider } from '../../../components/Editor/EditorProvider'
import type { NodeId } from '../../../core/ids'
import type { EditorStore } from '../../../core/store'
import { FlowControls } from '../../FlowControls'
import { FlowStatusBar } from '../../FlowStatusBar'
import { FlowToolbar } from '../../FlowToolbar'
import { resetReposition } from '../../component/repositionStore'

const HTML =
  '<section id="page">' +
  '<p id="intro">Intro</p>' +
  '<div id="one"><p id="one-text">One</p></div>' +
  '<div id="two"><p id="two-text">Two</p></div>' +
  '<figure id="media"><img src="a.png" alt="a" /></figure>' +
  '<p id="outro">Outro</p>' +
  '<div id="pair"><p id="left">Left</p><p id="right">Right</p></div>' +
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
        <FlowStatusBar />
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

  stubWidth(find('#page'), 600)
  stubWidth(find('#one'), 240)
  stubWidth(find('#two'), 240)
  stubWidth(find('#pair'), 600)
  stubWidth(find('#left'), 300)
  stubWidth(find('#right'), 300)

  return { store, find }
}

function idOf(element: HTMLElement): NodeId {
  return (element.getAttribute('data-adt-id') ?? '') as NodeId
}

function childrenOf(store: EditorStore, element: HTMLElement): string[] {
  const node = store.state.doc.nodes[idOf(element)]
  if (!node || node.kind !== 'element') return []
  return node.children
    .map((childId) => store.state.doc.nodes[childId])
    .filter((child) => child.kind === 'element')
    .map((child) => (child.kind === 'element' ? (child.attrs.id ?? child.tag) : ''))
}

function classesOf(store: EditorStore, id: NodeId): string[] {
  const node = store.state.doc.nodes[id]
  return node && 'classes' in node ? node.classes : []
}


function wrapperAt(store: EditorStore, parent: HTMLElement, index: number): NodeId {
  const node = store.state.doc.nodes[idOf(parent)]
  if (node?.kind !== 'element') throw new Error('no parent node')
  return node.children[index]
}

async function selectBoth(store: EditorStore, first: HTMLElement, second: HTMLElement) {
  act(() => store.actions.selectMany([idOf(first), idOf(second)]))
  await nextFrames()
}

async function pick(label: string) {
  fireEvent.click(screen.getByRole('button', { name: label }))
  await nextFrames()
}

describe('flow group', () => {
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

  it('offers the group toolbar for two contiguous siblings', async () => {
    const { store, find } = await setup()
    await selectBoth(store, find('#one'), find('#two'))

    expect(screen.getByRole('toolbar', { name: 'Group layout controls' })).toBeTruthy()
    expect(screen.getByText('2 selected')).toBeTruthy()
  })

  it('lays the group out as a row in one history entry, selection intact', async () => {
    const { store, find } = await setup()
    const ids = [idOf(find('#one')), idOf(find('#two'))]
    await selectBoth(store, find('#one'), find('#two'))
    const before = store.state.history.past.length

    await pick('Row · align tops')

    expect(store.state.history.past.length - before).toBe(1)
    expect(store.state.selectedIds).toEqual(ids)
    expect(childrenOf(store, find('#page'))).toEqual(['intro', 'div', 'media', 'outro', 'pair'])

    const wrapper = classesOf(store, wrapperAt(store, find('#page'), 1))
    expect(wrapper).toContain('flex')
    expect(wrapper).toContain('items-start')
    expect(wrapper).toContain('max-sm:flex-col')
    expect(classesOf(store, ids[0])).toContain('w-[40%]')
  })

  it('side by side wraps the members in a grid of their own', async () => {
    const { store, find } = await setup()
    const ids = [idOf(find('#one')), idOf(find('#two'))]
    await selectBoth(store, find('#one'), find('#two'))
    const before = store.state.history.past.length

    await pick('Side by side · equal columns')

    expect(store.state.history.past.length - before).toBe(1)
    expect(store.state.selectedIds).toEqual(ids)

    const wrapperId = wrapperAt(store, find('#page'), 1)
    expect(classesOf(store, wrapperId)).toContain('grid-cols-2')
    expect(classesOf(store, wrapperId)).toContain('max-sm:grid-cols-1')

    const wrapper = store.state.doc.nodes[wrapperId]
    if (wrapper.kind !== 'element') throw new Error('no wrapper')
    expect(wrapper.children).toEqual(ids)
    expect(classesOf(store, ids[0])).toContain('w-full')
  })

  it('one below another stacks the members in a single column', async () => {
    const { store, find } = await setup()
    await selectBoth(store, find('#one'), find('#two'))
    const before = store.state.history.past.length

    await pick('One below another')

    expect(store.state.history.past.length - before).toBe(1)
    expect(classesOf(store, wrapperAt(store, find('#page'), 1))).toContain('grid-cols-1')
  })

  it('edits the parent itself when the group is every child it has', async () => {
    const { store, find } = await setup()
    const ids = [idOf(find('#left')), idOf(find('#right'))]
    await selectBoth(store, find('#left'), find('#right'))
    const before = store.state.history.past.length

    await pick('Row · align centres')

    expect(store.state.history.past.length - before).toBe(1)
    expect(store.state.selectedIds).toEqual(ids)
    expect(childrenOf(store, find('#page'))).toEqual(['intro', 'one', 'two', 'media', 'outro', 'pair'])
    expect(childrenOf(store, find('#pair'))).toEqual(['left', 'right'])
    expect(classesOf(store, idOf(find('#pair')))).toContain('flex-row')
    expect(classesOf(store, ids[0])).toContain('w-[50%]')
  })

  it('promotes each member through its own wrapper', async () => {
    const { store, find } = await setup()
    const wrappers = [idOf(find('#one')), idOf(find('#two'))]
    await selectBoth(store, find('#one-text'), find('#two-text'))

    await pick('One below another')

    const wrapper = store.state.doc.nodes[wrapperAt(store, find('#page'), 1)]
    if (wrapper.kind !== 'element') throw new Error('no wrapper')
    expect(wrapper.children).toEqual(wrappers)
    expect(store.state.selectedIds).toEqual(wrappers)
  })

  it('wraps the text of the group around the object of the group', async () => {
    const { store, find } = await setup()
    const ids = [idOf(find('#media')), idOf(find('#outro'))]
    await selectBoth(store, find('#media'), find('#outro'))
    const before = store.state.history.past.length

    await pick('Wrap text · object on left')

    expect(store.state.history.past.length - before).toBe(1)
    expect(store.state.selectedIds).toEqual(ids)

    const object = classesOf(store, ids[0])
    expect(object).toContain('float-left')
    expect(object).toContain('w-1/3')
    expect(object).toContain('max-sm:float-none')
    expect(classesOf(store, ids[1])).toContain('mb-6')
    expect(childrenOf(store, find('#page'))).toEqual(['intro', 'one', 'two', 'div', 'pair'])

    const rootId = wrapperAt(store, find('#page'), 3)
    expect(classesOf(store, rootId)).toContain('flow-root')
    const flowRoot = store.state.doc.nodes[rootId]
    if (flowRoot.kind !== 'element') throw new Error('no flow root')
    expect(flowRoot.children).toEqual(ids)
  })

  it('says why a group it cannot lay out is refused', async () => {
    const { store, find } = await setup()
    await selectBoth(store, find('#intro'), find('#media'))

    expect(screen.queryByRole('toolbar', { name: 'Group layout controls' })).toBeNull()
    expect(screen.getByText(/pick neighbours/)).toBeTruthy()
  })

  it('leaves the group alone while one of its members is locked', async () => {
    const { store, find } = await setup()
    act(() => store.actions.setLocked(idOf(find('#two')), true))
    await selectBoth(store, find('#one'), find('#two'))

    expect(screen.queryByRole('toolbar', { name: 'Group layout controls' })).toBeNull()
    expect(screen.getByText(/locked/)).toBeTruthy()
  })
})
