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

async function setup(html: string = HTML, selector = 'p') {
  let store: EditorStore | undefined
  render(
    <EditorProvider defaultValue={html} layout="flow" flowLayout={{ directControls: true }}>
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

  const selected = root.querySelector<HTMLElement>(selector)
  if (!selected) throw new Error(`no ${selector}`)

  stubRect(host, { left: 0, top: 0, width: 600, height: 800 })
  stubRect(section, { left: 0, top: 0, width: 300, height: 80 })
  stubRect(paragraph, { left: 0, top: 40, width: 200, height: 40 })
  stubRect(selected, { left: 0, top: 40, width: 200, height: 40 })
  Object.defineProperty(section, 'clientWidth', { value: 300, configurable: true })
  Object.defineProperty(root, 'clientWidth', { value: 600, configurable: true })

  act(() => store?.actions.select(selected.getAttribute('data-adt-id')))
  await nextFrames()

  return { store, section, paragraph, selected }
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

function toolbarNamed(name: string): HTMLElement {
  return screen.getByRole('toolbar', { name })
}

function labelsIn(name: string): string[] {
  return [...toolbarNamed(name).querySelectorAll('button')].map(
    (button) => button.getAttribute('aria-label') ?? '',
  )
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

  it('retags the selection from the toolbar, keeping its classes and the selection', async () => {
    const { store, paragraph } = await setup()
    const id = paragraph.getAttribute('data-adt-id')
    const before = store.state.history.past.length

    click('Tag: p')
    click('h2')

    const node = store.state.doc.nodes[id ?? '']
    expect(node.kind === 'element' && node.tag).toBe('h2')
    expect(classesOf(store, paragraph)).toEqual(['lead'])
    expect(store.state.selectedIds).toEqual([id])
    expect(store.state.history.past.length - before).toBe(1)
    expect(screen.getByRole('button', { name: 'Tag: h2' })).toBeTruthy()
  })

  it('keeps a tag the content model refuses on screen, disabled, with its reason', async () => {
    const { store, section } = await setup()
    act(() => store.actions.select(section.getAttribute('data-adt-id')))
    await nextFrames()

    click('Tag: section')

    expect(isDisabled('p, not valid here')).toBe(true)
    expect(isDisabled('article')).toBe(false)
  })

  it('hides the tag control when no other tag is open', async () => {
    await setup(
      '<section id="hero"><p class="lead">Intro</p><ul><li class="row">one</li></ul></section>',
      'li',
    )

    expect(screen.queryByRole('button', { name: /^Tag: / })).toBeNull()
    expect(screen.getByRole('button', { name: 'Select parent' })).toBeTruthy()
  })

  it('lays every control out in one bar, reordering last', async () => {
    await setup()

    expect(labelsIn('Layout controls')).toEqual([
      'Reposition',
      'Tag: p',
      'Select parent',
      'Layout',
      'Align left',
      'Align centre',
      'Align right',
      'Smaller text',
      'Bigger text',
      'Less space below',
      'More space below',
      'Move earlier',
      'Move later',
    ])
  })

  it('leaves the reordering pair out when the selection cannot be reordered', async () => {
    await setup('<section id="hero"><p class="lead">a <span>word</span></p></section>', 'span')

    expect(screen.queryByRole('button', { name: 'Move earlier' })).toBeNull()
    expect(screen.getByRole('toolbar', { name: 'Layout controls' })).toBeTruthy()
  })

  it('gives every control a tooltip', async () => {
    await setup()

    const buttons = [...toolbarNamed('Layout controls').querySelectorAll('button')]

    expect(buttons.length).toBeGreaterThan(0)
    expect(buttons.filter((button) => !button.title)).toEqual([])
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
