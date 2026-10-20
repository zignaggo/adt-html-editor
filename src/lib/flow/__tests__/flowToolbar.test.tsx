import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Canvas } from '../../components/Canvas/Canvas'
import { CanvasViewport } from '../../components/Canvas/CanvasParts'
import { useEditorStoreApi } from '../../components/Editor/context'
import { EditorProvider } from '../../components/Editor/EditorProvider'
import type { EditorStore } from '../../core/store'
import { FlowToolbar } from '../FlowToolbar'

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

async function setup() {
  let store: EditorStore | undefined
  render(
    <EditorProvider defaultValue={HTML} layout="flow" flowLayout={{ directControls: true }}>
      <CaptureStore onStore={(s) => (store = s)} />
      <Canvas>
        <CanvasViewport>
          <FlowToolbar />
        </CanvasViewport>
      </Canvas>
    </EditorProvider>,
  )
  if (!store) throw new Error('store not captured')

  const root = document.querySelector<HTMLElement>('[data-adt-canvas]')
  const host = document.querySelector<HTMLElement>('[data-adt-canvas-scroll]')
  const section = root?.querySelector<HTMLElement>('section')
  const paragraph = root?.querySelector<HTMLElement>('p')
  if (!root || !host || !section || !paragraph) throw new Error('canvas not rendered')

  stubRect(host, { left: 0, top: 0, width: 600, height: 800 })
  stubRect(section, { left: 0, top: 0, width: 300, height: 80 })
  stubRect(paragraph, { left: 0, top: 40, width: 200, height: 40 })
  Object.defineProperty(section, 'clientWidth', { value: 300, configurable: true })
  Object.defineProperty(root, 'clientWidth', { value: 600, configurable: true })

  act(() => store?.actions.select(paragraph.getAttribute('data-adt-id')))
  await nextFrames()

  return { store, section, paragraph }
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

function isDisabled(name: string): boolean {
  return (screen.getByRole('button', { name }) as HTMLButtonElement).disabled
}

function click(name: string) {
  fireEvent.click(screen.getByRole('button', { name }))
}

describe('the flow toolbar', () => {
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

  it('aligns the selection in one history entry', async () => {
    const { store, paragraph } = await setup()
    const before = store.state.history.past.length

    click('Align right')

    expect(classesOf(store, paragraph)).toContain('text-right')
    expect(store.state.history.past.length - before).toBe(1)
  })

  it('writes the text size in rem, relative to the root', async () => {
    const { store, paragraph } = await setup()

    click('Bigger text')

    expect(classesOf(store, paragraph).some((name) => /^text-\[[\d.]+rem\]$/.test(name))).toBe(true)
  })

  it('steps the width by a tenth of the row', async () => {
    const { store, section, paragraph } = await setup()
    act(() => store.actions.select(section.getAttribute('data-adt-id')))
    await nextFrames()

    click('Wider')

    expect(classesOf(store, section)).toContain('w-[60%]')
    expect(classesOf(store, paragraph)).toEqual(['lead'])
  })

  it('leaves the width alone on a text element', async () => {
    await setup()

    expect(screen.queryByRole('button', { name: 'Wider' })).toBeNull()
  })

  it('moves the selection one step, and stops at the end', async () => {
    const { store, section, paragraph } = await setup()

    expect(isDisabled('Move later')).toBe(true)
    click('Move earlier')
    await nextFrames()

    expect(tagsIn(store, section)).toEqual(['p', 'h1'])
    expect(classesOf(store, paragraph)).toEqual(['lead'])
    expect(isDisabled('Move earlier')).toBe(true)
  })

  it('steps the space below in fours', async () => {
    const { store, paragraph } = await setup()

    click('More space below')

    expect(classesOf(store, paragraph)).toContain('mb-1')
  })

  it('selects the parent', async () => {
    const { store, section } = await setup()

    click('Select parent')

    expect(store.state.selectedIds).toEqual([section.getAttribute('data-adt-id')])
  })

  it('opens the size popover on a box', async () => {
    const { store, section } = await setup()
    act(() => store.actions.select(section.getAttribute('data-adt-id')))
    await nextFrames()

    click('Size')

    expect(screen.getByLabelText('Height')).toBeTruthy()
    expect(screen.getByLabelText('Inner space ↕')).toBeTruthy()
    expect(screen.getByLabelText('Inner space ↔')).toBeTruthy()
  })
})
