import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Input } from '@atlaskit/pragmatic-drag-and-drop/types'
import { renderElementPreview } from '../preview'
import { DRAG_GHOST_CLASS } from '../previewStyles'

function inputAt(clientX: number, clientY: number): Input {
  return {
    altKey: false,
    button: 0,
    buttons: 1,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    clientX,
    clientY,
    pageX: clientX,
    pageY: clientY,
  }
}

function sourceOf(box: { top: number; left: number; width: number; height: number }) {
  const element = document.createElement('div')
  element.setAttribute('data-adt-id', 'card')
  element.innerHTML = '<span data-adt-id="label">Card</span>'
  const rect = {
    ...box,
    bottom: box.top + box.height,
    right: box.left + box.width,
    x: box.left,
    y: box.top,
  }
  element.getBoundingClientRect = () => ({ ...rect, toJSON: () => rect }) as DOMRect
  document.body.appendChild(element)
  return element
}

function lastGhost(): HTMLElement | null {
  const containers = document.body.querySelectorAll<HTMLElement>(`.${CSS.escape('adt-canvas')}`)
  return containers[containers.length - 1] ?? null
}

function viewport(width: number, height: number) {
  Object.defineProperty(window, 'innerWidth', { value: width, configurable: true })
  Object.defineProperty(window, 'innerHeight', { value: height, configurable: true })
}

beforeEach(() => {
  viewport(1600, 1000)
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('renderElementPreview', () => {
  it('renders a clone of the dragged element at its own size', () => {
    const element = sourceOf({ top: 100, left: 40, width: 240, height: 120 })
    expect(renderElementPreview(null, { element, input: inputAt(80, 130) })).toBe(true)

    const ghost = lastGhost()
    expect(ghost?.className).toBe(DRAG_GHOST_CLASS)
    expect(ghost?.style.width).toBe('240px')
    expect(ghost?.style.height).toBe('120px')
  })

  it('keeps a wide but short element at its own size', () => {
    const element = sourceOf({ top: 0, left: 0, width: 900, height: 64 })
    renderElementPreview(null, { element, input: inputAt(0, 0) })

    const ghost = lastGhost()
    expect(ghost?.style.width).toBe('900px')
    expect(ghost?.style.height).toBe('64px')
    expect(ghost?.firstElementChild).toHaveProperty('style.transform', '')
  })

  it('scales a tall element down to the height budget', () => {
    const element = sourceOf({ top: 0, left: 0, width: 900, height: 900 })
    renderElementPreview(null, { element, input: inputAt(0, 0) })

    const ghost = lastGhost()
    expect(ghost?.style.height).toBe('500px')
    expect(ghost?.style.width).toBe('500px')
  })

  it('scales a very wide element down to the width budget', () => {
    viewport(800, 1000)
    const element = sourceOf({ top: 0, left: 0, width: 1200, height: 100 })
    renderElementPreview(null, { element, input: inputAt(0, 0) })

    expect(lastGhost()?.style.width).toBe('600px')
  })

  it('strips the editor ids from the clone', () => {
    const element = sourceOf({ top: 0, left: 0, width: 240, height: 120 })
    renderElementPreview(null, { element, input: inputAt(0, 0) })

    expect(lastGhost()?.querySelectorAll('[data-adt-id]')).toHaveLength(0)
  })

  it('refuses an element that is too small to read', () => {
    const element = sourceOf({ top: 0, left: 0, width: 240, height: 0 })
    expect(renderElementPreview(null, { element, input: inputAt(0, 0) })).toBe(false)
  })
})
