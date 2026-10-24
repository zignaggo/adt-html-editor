import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useBreakpoint, useCanvasRoot, useEditorStoreApi } from '../../Editor/context'
import { EditorProvider } from '../../Editor/EditorProvider'
import type { EditorStore } from '../../../core/store'
import type { BreakpointId } from '../../../tailwind/variants'
import { Canvas } from '../Canvas'
import { CanvasViewport } from '../CanvasParts'
import { DEFAULT_WIDTH_PRESETS } from '../context'
import {
  DEFAULT_FRAME_WIDTH,
  FRAME_GAP,
  FRAME_ROW_PADDING,
  framesWidth,
  resolveFrames,
} from '../frames'

const HTML = '<section id="hero"><h1>Title</h1><p class="lead">Intro</p></section>'

type Captured = { store: EditorStore | null; root: HTMLElement | null; breakpoint: BreakpointId }

const NOTHING: Captured = { store: null, root: null, breakpoint: 'desktop' }

function Capture({ onCapture }: { onCapture: (value: Captured) => void }) {
  const store = useEditorStoreApi()
  const root = useCanvasRoot()
  const breakpoint = useBreakpoint()
  useEffect(() => {
    onCapture({ store, root, breakpoint })
  })
  return null
}

function setup() {
  let latest = NOTHING
  render(
    <EditorProvider defaultValue={HTML}>
      <Capture onCapture={(value) => (latest = value)} />
      <Canvas defaultMode="frames">
        <CanvasViewport />
      </Canvas>
    </EditorProvider>,
  )
  const frames = Array.from(document.querySelectorAll<HTMLElement>('[data-adt-frame]'))
  return { captured: () => latest, frames }
}

function rootOf(frame: HTMLElement): HTMLElement {
  const root = frame.querySelector<HTMLElement>('[data-adt-canvas]')
  if (!root) throw new Error('frame has no canvas root')
  return root
}

function pick(frame: HTMLElement, selector: string): HTMLElement {
  const element = rootOf(frame).querySelector<HTMLElement>(selector)
  if (!element) throw new Error(`${selector} missing`)
  return element
}

describe('frames layout', () => {
  it('orders the presets widest first and fills in a width for the stretching one', () => {
    const frames = resolveFrames(DEFAULT_WIDTH_PRESETS)
    expect(frames.map((frame) => frame.id)).toEqual(['desktop', 'tablet', 'mobile'])
    expect(frames[0].width).toBe(DEFAULT_FRAME_WIDTH)
  })

  it('honours an explicit frame width', () => {
    const frames = resolveFrames([{ id: 'desktop', label: 'Desktop', width: 0, frameWidth: 1100 }])
    expect(frames[0].width).toBe(1100)
  })

  it('measures the row the fit zoom has to cover', () => {
    const frames = resolveFrames(DEFAULT_WIDTH_PRESETS)
    const pages = DEFAULT_FRAME_WIDTH + 820 + 390
    expect(framesWidth(frames)).toBe(pages + FRAME_GAP * 2 + FRAME_ROW_PADDING * 2)
  })

  it('has no frames to draw when there are none', () => {
    expect(framesWidth([])).toBe(0)
  })
})

describe('canvas frames mode', () => {
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

  it('draws one live page per breakpoint', () => {
    const { frames } = setup()
    expect(frames.map((frame) => frame.dataset.adtFrame)).toEqual(['desktop', 'tablet', 'mobile'])
    for (const frame of frames) expect(pick(frame, 'h1').textContent).toBe('Title')
    expect(screen.getByRole('button', { name: /Desktop/ })).toBeTruthy()
  })

  it('keeps the editable root on the active frame only', () => {
    const { captured, frames } = setup()
    expect(captured().root).toBe(rootOf(frames[0]))
    expect(frames[0].dataset.adtFrameActive).toBe('true')
    expect(frames[1].dataset.adtFrameActive).toBeUndefined()
  })

  it('moves the editable root when another frame is picked', () => {
    const { captured, frames } = setup()
    fireEvent.click(screen.getByRole('button', { name: /Mobile/ }))
    expect(captured().root).toBe(rootOf(frames[2]))
    expect(frames[2].dataset.adtFrameActive).toBe('true')
  })

  it('selects into an inactive frame on the first click', () => {
    const { captured, frames } = setup()
    const heading = pick(frames[1], 'h1')
    fireEvent.pointerDown(heading)
    fireEvent.click(heading)
    expect(captured().root).toBe(rootOf(frames[1]))
    expect(captured().store?.state.selectedId).toBe(heading.getAttribute('data-adt-id'))
  })

  it('moves the styling breakpoint to the frame being edited', () => {
    const { captured, frames } = setup()
    expect(captured().breakpoint).toBe('desktop')
    fireEvent.pointerDown(pick(frames[2], 'h1'))
    expect(captured().breakpoint).toBe('mobile')
  })
})
