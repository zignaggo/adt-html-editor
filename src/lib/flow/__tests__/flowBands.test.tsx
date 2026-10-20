import { act, cleanup, render } from '@testing-library/react'
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

function bandOf(kind: 'margin' | 'padding'): HTMLElement {
  const band = document.querySelector<HTMLElement>(`[data-band="${kind}"]`)
  if (!band) throw new Error(`${kind} band not rendered`)
  return band
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
  const paragraph = root?.querySelector<HTMLElement>('p')
  if (!root || !host || !paragraph) throw new Error('canvas not rendered')

  stubRect(host, { left: 0, top: 0, width: 600, height: 800 })
  stubRect(paragraph, { left: 0, top: 40, width: 200, height: 40 })

  return { store, paragraph }
}

describe('the margin and padding bands', () => {
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

  it('stays hidden while the element has neither margin nor padding', async () => {
    const { store, paragraph } = await setup()
    act(() => store.actions.select(paragraph.getAttribute('data-adt-id')))
    await nextFrames()

    expect(bandOf('margin').dataset.visible).toBe('false')
    expect(bandOf('padding').dataset.visible).toBe('false')
  })

  it('draws the margin outside the box, as the band itself', async () => {
    const { store, paragraph } = await setup()
    paragraph.style.marginBottom = '24px'
    paragraph.style.marginLeft = '8px'
    act(() => store.actions.select(paragraph.getAttribute('data-adt-id')))
    await nextFrames()

    const band = bandOf('margin')
    expect(band.dataset.visible).toBe('true')
    expect(band.style.borderBottomWidth).toBe('24px')
    expect(band.style.borderLeftWidth).toBe('8px')
    expect(band.style.borderTopWidth).toBe('0px')
    expect(band.style.transform).toBe('translate3d(-8px, 40px, 0)')
    expect(band.style.width).toBe('208px')
    expect(band.style.height).toBe('64px')
  })

  it('draws the padding inside the box', async () => {
    const { store, paragraph } = await setup()
    paragraph.style.paddingTop = '16px'
    paragraph.style.paddingRight = '12px'
    act(() => store.actions.select(paragraph.getAttribute('data-adt-id')))
    await nextFrames()

    const band = bandOf('padding')
    expect(band.dataset.visible).toBe('true')
    expect(band.style.borderTopWidth).toBe('16px')
    expect(band.style.borderRightWidth).toBe('12px')
    expect(band.style.transform).toBe('translate3d(0px, 40px, 0)')
    expect(band.style.width).toBe('200px')
  })

  it('starts the padding band inside a drawn border', async () => {
    const { store, paragraph } = await setup()
    paragraph.style.padding = '10px'
    paragraph.style.border = '4px solid black'
    act(() => store.actions.select(paragraph.getAttribute('data-adt-id')))
    await nextFrames()

    const band = bandOf('padding')
    expect(band.style.transform).toBe('translate3d(4px, 44px, 0)')
    expect(band.style.width).toBe('192px')
    expect(band.style.borderTopWidth).toBe('10px')
  })

  it('ignores a negative margin rather than drawing it backwards', async () => {
    const { store, paragraph } = await setup()
    paragraph.style.marginTop = '-12px'
    act(() => store.actions.select(paragraph.getAttribute('data-adt-id')))
    await nextFrames()

    expect(bandOf('margin').dataset.visible).toBe('false')
  })
})
