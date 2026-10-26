import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EditorProvider } from '../../Editor/EditorProvider'
import { Canvas } from '../Canvas'
import { CanvasViewport } from '../CanvasParts'

const { calls } = vi.hoisted(() => ({ calls: [] as { name: string; args: unknown[] }[] }))

vi.mock('react-zoom-pan-pinch', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-zoom-pan-pinch')>()
  const record = (name: string) => (...args: unknown[]) => {
    calls.push({ name, args })
    return Promise.resolve()
  }
  return {
    ...actual,
    useControls: () => ({
      ...actual.useControls(),
      setTransform: record('setTransform'),
      zoomToPoint: record('zoomToPoint'),
    }),
  }
})

const HTML = '<section id="hero"><h1>Title</h1></section>'

class FakeResizeObserver {
  static instances: FakeResizeObserver[] = []
  private targets = new Set<Element>()
  private callback: ResizeObserverCallback

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
    FakeResizeObserver.instances.push(this)
  }

  observe(target: Element) {
    this.targets.add(target)
  }

  unobserve(target: Element) {
    this.targets.delete(target)
  }

  disconnect() {
    this.targets.clear()
  }

  static notify(target: Element) {
    for (const instance of FakeResizeObserver.instances) {
      if (instance.targets.has(target)) instance.callback([], instance as unknown as ResizeObserver)
    }
  }
}

function resize(element: HTMLElement, width: number, height = 600) {
  Object.defineProperty(element, 'clientWidth', { configurable: true, value: width })
  Object.defineProperty(element, 'clientHeight', { configurable: true, value: height })
  act(() => FakeResizeObserver.notify(element))
}

function setup() {
  render(
    <EditorProvider defaultValue={HTML}>
      <Canvas defaultMode="frames">
        <CanvasViewport />
      </Canvas>
    </EditorProvider>,
  )
  const stage = document.querySelector<HTMLElement>('[data-adt-canvas-scroll]')
  if (!stage) throw new Error('canvas missing')
  return stage
}

describe('canvas fit on a stage resize', () => {
  beforeEach(() => {
    calls.length = 0
    FakeResizeObserver.instances = []
    vi.stubGlobal('ResizeObserver', FakeResizeObserver)
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('snaps once the stage has been measured', () => {
    const stage = setup()
    expect(calls).toHaveLength(0)

    resize(stage, 1000)
    expect(calls.map((call) => call.name)).toEqual(['setTransform'])
  })

  it('re-fits a narrower stage without snapping it back to the origin', () => {
    const stage = setup()
    resize(stage, 1000)
    calls.length = 0

    resize(stage, 900)

    expect(calls.map((call) => call.name)).toEqual(['zoomToPoint'])
    expect(calls[0].args[3]).toBe(0)
  })

  it('keeps re-fitting instantly while the panel is being dragged', () => {
    const stage = setup()
    resize(stage, 1000)
    calls.length = 0

    for (let width = 980; width >= 900; width -= 20) resize(stage, width)

    expect(calls).toHaveLength(5)
    expect(calls.every((call) => call.name === 'zoomToPoint')).toBe(true)
    expect(calls.every((call) => call.args[3] === 0)).toBe(true)
  })
})
