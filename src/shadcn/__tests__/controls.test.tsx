import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EditorProvider } from '../../lib/components/Editor/EditorProvider'
import { useEditorStoreApi } from '../../lib/components/Editor/context'
import { InspectorProvider } from '../../lib/components/Inspector/InspectorPanel'
import type { EditorStore } from '../../lib/core/store'
import { BoxInput } from '../parts/Inspector/controls/BoxInput'
import { NumericInput } from '../parts/Inspector/controls/NumericInput'
import { UnitInput } from '../parts/Inspector/controls/UnitInput'
import { InspectorStyles } from '../parts/Inspector/sections/InspectorStyles'
import { TooltipProvider } from '../ui/tooltip'

function CaptureStore({ onStore }: { onStore: (store: EditorStore) => void }) {
  const store = useEditorStoreApi()
  useEffect(() => {
    onStore(store)
  }, [onStore, store])
  return null
}

function renderStyles(html: string) {
  let store: EditorStore | undefined
  render(
    <EditorProvider defaultValue={html}>
      <CaptureStore onStore={(s) => (store = s)} />
      <TooltipProvider>
        <InspectorProvider>
          <InspectorStyles />
        </InspectorProvider>
      </TooltipProvider>
    </EditorProvider>,
  )
  if (!store) throw new Error('store not captured')
  const h1 = Object.values(store.state.doc.nodes).find((node) => node.kind === 'element' && node.tag === 'h1')
  if (!h1) throw new Error('no <h1>')
  act(() => store!.actions.select(h1.id))
  const classesOf = () => {
    const node = store!.state.doc.nodes[h1.id]
    return node.kind === 'element' ? node.classes : []
  }
  return { store, id: h1.id, classesOf }
}

describe('studio-style controls', () => {
  beforeEach(() => {
    if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {}
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
    vi.useRealTimers()
  })

  it('debounces numeric commits while typing and flushes on blur', () => {
    vi.useFakeTimers()
    const onCommit = vi.fn()
    render(<NumericInput aria-label="Gap" value={16} onCommit={onCommit} />)
    const input = screen.getByRole('textbox', { name: 'Gap' }) as HTMLInputElement
    expect(input.value).toBe('16')

    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '2' } })
    fireEvent.change(input, { target: { value: '24' } })
    expect(onCommit).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(onCommit).toHaveBeenCalledTimes(1)
    expect(onCommit).toHaveBeenLastCalledWith(24)

    fireEvent.change(input, { target: { value: '32' } })
    fireEvent.blur(input)
    expect(onCommit).toHaveBeenLastCalledWith(32)
    expect(onCommit).toHaveBeenCalledTimes(2)
  })

  it('reverts the draft on Escape without committing', () => {
    vi.useFakeTimers()
    const onCommit = vi.fn()
    render(<NumericInput aria-label="Gap" value={16} onCommit={onCommit} />)
    const input = screen.getByRole('textbox', { name: 'Gap' }) as HTMLInputElement
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '99' } })
    fireEvent.keyDown(input, { key: 'Escape' })
    fireEvent.blur(input)
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(onCommit).not.toHaveBeenCalled()
    expect(input.value).toBe('16')
  })

  it('switches a box between one value and four sides', () => {
    const onChange = vi.fn()
    render(<BoxInput label="Padding" value={{ t: 16, r: 16, b: 16, l: 16 }} onChange={onChange} />)
    const single = screen.getByRole('textbox', { name: 'Padding' }) as HTMLInputElement
    expect(single.value).toBe('16')
    expect(single.disabled).toBe(false)

    fireEvent.click(screen.getByRole('button', { name: 'Individual sides' }))
    expect(single.disabled).toBe(true)
    const top = screen.getByRole('textbox', { name: 'Padding top' })
    fireEvent.focus(top)
    fireEvent.change(top, { target: { value: '8' } })
    fireEvent.blur(top)
    expect(onChange).toHaveBeenLastCalledWith({ t: 8, r: 16, b: 16, l: 16 })
  })

  it('changes the unit from the popover and carries the number', () => {
    const onChange = vi.fn()
    render(<UnitInput aria-label="Width" value={{ value: '16', unit: 'px' }} onChange={onChange} units={['px', '%', 'auto']} />)
    fireEvent.click(screen.getByRole('button', { name: 'Unit: px' }))
    fireEvent.click(screen.getByRole('button', { name: '%' }))
    expect(onChange).toHaveBeenLastCalledWith({ value: '16', unit: '%' })

    fireEvent.click(screen.getByRole('button', { name: 'Unit: px' }))
    fireEvent.click(screen.getByRole('button', { name: 'auto' }))
    expect(onChange).toHaveBeenLastCalledWith({ value: 'auto', unit: 'auto' })
  })

  it('reads the selected element and writes classes through the sections', () => {
    const { classesOf } = renderStyles('<h1 class="p-4 text-2xl font-bold">Title</h1>')

    const padding = screen.getByRole('textbox', { name: 'Padding' }) as HTMLInputElement
    expect(padding.value).toBe('16')
    fireEvent.focus(padding)
    fireEvent.change(padding, { target: { value: '8' } })
    fireEvent.blur(padding)
    expect(classesOf()).toContain('p-2')
    expect(classesOf()).not.toContain('p-4')

    const size = screen.getByRole('button', { name: 'Font size' })
    expect(size.textContent).toContain('2xl')
    expect(size.textContent).toContain('24px')

    const weight = screen.getByRole('combobox', { name: 'Font weight' })
    expect(weight.textContent).toContain('bold')
  })

  it('picks a palette token from the colour popover', () => {
    const { classesOf } = renderStyles('<h1 class="text-2xl">Title</h1>')
    fireEvent.click(screen.getByRole('button', { name: 'Text colour: none' }))
    const dialog = screen.getByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'violet-500' }))
    expect(classesOf()).toContain('text-violet-500')
    expect(screen.getByRole('button', { name: 'Text colour: violet-500' })).toBeTruthy()
  })

  it('shows optional sizing fields only when requested or present', () => {
    renderStyles('<h1 class="min-w-4">Title</h1>')
    expect(screen.getByRole('textbox', { name: 'Min width' })).toBeTruthy()
    expect(screen.queryByRole('textbox', { name: 'Max width' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Add sizing field' }))
    fireEvent.click(screen.getByRole('button', { name: 'Max width' }))
    expect(screen.getByRole('textbox', { name: 'Max width' })).toBeTruthy()
  })
})
