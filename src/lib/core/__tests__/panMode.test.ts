import { afterEach, describe, expect, it } from 'vitest'
import { panModeActive, setPointerPan, subscribePanMode, trackPanMode } from '../panMode'

let stopTracking: (() => void) | null = null

function track() {
  stopTracking = trackPanMode()
}

afterEach(() => {
  stopTracking?.()
  stopTracking = null
})

function pressControl() {
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Control', ctrlKey: true }))
}

function releaseControl() {
  window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Control', ctrlKey: false }))
}

describe('panMode', () => {
  it('starts inactive', () => {
    track()
    expect(panModeActive()).toBe(false)
  })

  it('follows the modifier key', () => {
    track()
    pressControl()
    expect(panModeActive()).toBe(true)
    releaseControl()
    expect(panModeActive()).toBe(false)
  })

  it('stays active while another key is pressed with the modifier', () => {
    track()
    pressControl()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', ctrlKey: true }))
    expect(panModeActive()).toBe(true)
  })

  it('activates from the pointer alone', () => {
    track()
    setPointerPan(true)
    expect(panModeActive()).toBe(true)
    setPointerPan(false)
    expect(panModeActive()).toBe(false)
  })

  it('keeps the modifier active when the pointer is released', () => {
    track()
    pressControl()
    setPointerPan(true)
    setPointerPan(false)
    expect(panModeActive()).toBe(true)
    releaseControl()
    expect(panModeActive()).toBe(false)
  })

  it('clears the modifier when the window loses focus', () => {
    track()
    pressControl()
    window.dispatchEvent(new Event('blur'))
    expect(panModeActive()).toBe(false)
  })

  it('notifies subscribers once per change', () => {
    track()
    const seen: boolean[] = []
    const unsubscribe = subscribePanMode((active) => seen.push(active))
    pressControl()
    pressControl()
    releaseControl()
    unsubscribe()
    expect(seen).toEqual([false, true, false])
  })
})
