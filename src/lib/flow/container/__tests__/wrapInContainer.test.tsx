import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Canvas } from '../../../components/Canvas/Canvas'
import { CanvasViewport } from '../../../components/Canvas/CanvasParts'
import { useEditorStoreApi } from '../../../components/Editor/context'
import { EditorProvider } from '../../../components/Editor/EditorProvider'
import type { NodeId } from '../../../core/ids'
import type { EditorStore } from '../../../core/store'
import { FlowStatusBar } from '../../FlowStatusBar'

const HTML =
  '<section id="page">' +
  '<p id="intro">Intro</p>' +
  '<div id="box" class="w-1/2 mb-6">Boxed</div>' +
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

async function setup(html = HTML) {
  let store: EditorStore | undefined
  render(
    <EditorProvider defaultValue={html} layout="flow" flowLayout={{ directControls: true }}>
      <CaptureStore onStore={(s) => (store = s)} />
      <Canvas>
        <CanvasViewport />
        <FlowStatusBar />
      </Canvas>
    </EditorProvider>,
  )
  if (!store) throw new Error('store not captured')

  const root = document.querySelector<HTMLElement>('[data-adt-canvas]')
  if (!root) throw new Error('canvas not rendered')

  return { store, root, pick: (selector: string) => root.querySelector<HTMLElement>(selector)! }
}

function idOf(element: HTMLElement): NodeId {
  return (element.getAttribute('data-adt-id') ?? '') as NodeId
}

function childrenOf(store: EditorStore, id: NodeId): string[] {
  const node = store.state.doc.nodes[id]
  if (!node || node.kind !== 'element') return []
  return node.children
    .map((childId) => store.state.doc.nodes[childId])
    .filter((child) => child.kind === 'element')
    .map((child) => (child.kind === 'element' ? (child.attrs.id ?? child.tag) : ''))
}

async function openDialog(store: EditorStore, element: HTMLElement) {
  act(() => store.actions.select(idOf(element)))
  await nextFrames()
  fireEvent.click(screen.getByRole('button', { name: 'Wrap in container' }))
  return screen.getByRole('dialog')
}

describe('wrap in container', () => {
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
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('wraps the selection in one history entry and keeps it selected', async () => {
    const { store, pick } = await setup()
    const box = pick('#box')
    const boxId = idOf(box)
    const sectionId = idOf(pick('#page'))
    const before = store.state.history.past.length

    const dialog = await openDialog(store, box)
    fireEvent.click(within(dialog).getByRole('button', { name: 'Wrap in container' }))

    expect(childrenOf(store, sectionId)).toEqual(['intro', 'div'])

    const section = store.state.doc.nodes[sectionId]
    if (section.kind !== 'element') throw new Error('no section')
    const wrapper = store.state.doc.nodes[section.children[section.children.length - 1]]
    if (wrapper.kind !== 'element') throw new Error('no wrapper')

    expect(wrapper.attrs['data-responsive-container']).toBe('true')
    expect(wrapper.attrs.style).toBe('display:block;width:100%;min-width:0')
    expect(wrapper.children).toEqual([boxId])
    expect(store.state.history.past.length - before).toBe(1)
    expect(store.state.selectedIds).toEqual([boxId])
  })

  it('rolls the wrapper back when the move fails', async () => {
    const { store, pick } = await setup()
    const box = pick('#box')
    const boxId = idOf(box)
    const sectionId = idOf(pick('#page'))
    vi.spyOn(store.actions, 'moveNode').mockReturnValue(false)

    const dialog = await openDialog(store, box)
    fireEvent.click(within(dialog).getByRole('button', { name: 'Wrap in container' }))

    expect(childrenOf(store, sectionId)).toEqual(['intro', 'box'])
    const wrapped = Object.values(store.state.doc.nodes).some(
      (node) => node.kind === 'element' && node.attrs['data-responsive-container'] !== undefined,
    )
    expect(wrapped).toBe(false)
    expect(store.state.selectedIds).toEqual([boxId])
  })

  it('offers the parent instead when the element cannot be wrapped', async () => {
    const { store, pick } = await setup(
      '<div id="holder" data-responsive-container="true"><div id="box">Boxed</div></div>',
    )
    const box = pick('#box')
    const holderId = idOf(pick('#holder'))

    const dialog = await openDialog(store, box)
    expect(dialog.getAttribute('aria-label')).toBe('Cannot wrap this in a container')
    expect(within(dialog).queryByRole('button', { name: 'Wrap in container' })).toBeNull()

    fireEvent.click(within(dialog).getByRole('button', { name: 'Select parent' }))
    expect(store.state.selectedIds).toEqual([holderId])
  })
})
