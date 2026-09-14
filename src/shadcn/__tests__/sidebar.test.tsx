import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EditorProvider } from '../../lib/components/Editor/EditorProvider'
import { Sidebar } from '../parts/Sidebar/Sidebar'
import { TooltipProvider } from '../ui/tooltip'

const DOCUMENT = '<section id="hero"><h1 class="text-4xl font-bold">Title</h1><p>Body</p></section>'

function setup() {
  render(
    <EditorProvider defaultValue={DOCUMENT}>
      <TooltipProvider>
        <Sidebar />
      </TooltipProvider>
    </EditorProvider>,
  )
}

describe('shadcn sidebar', () => {
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
  })

  it('shows the layers tab first and filters the tree from the shared search', () => {
    setup()
    expect(screen.getByRole('tree', { name: 'Element tree' })).toBeTruthy()
    expect(screen.queryByRole('list', { name: 'Palette' })).toBeNull()
    const input = screen.getByRole('searchbox', { name: 'Search elements' })
    fireEvent.change(input, { target: { value: 'h1' } })
    expect(screen.getByRole('tree').querySelectorAll('[role=treeitem][data-muted]').length).toBeGreaterThan(0)
  })

  it('switches the search to the palette when that tab is active', () => {
    setup()
    fireEvent.click(screen.getByRole('tab', { name: /Palette/ }))
    expect(screen.getByRole('list', { name: 'Palette' })).toBeTruthy()
    expect(screen.queryByRole('tree')).toBeNull()
    const input = screen.getByRole('searchbox', { name: 'Search palette' })
    fireEvent.change(input, { target: { value: 'head' } })
    expect(screen.getByTitle('Drag to insert <h1>')).toBeTruthy()
    expect(screen.queryByTitle('Drag to insert <p>')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }))
    expect(screen.getByTitle('Drag to insert <p>')).toBeTruthy()
  })

  it('keeps each search independent when switching tabs', () => {
    setup()
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search elements' }), { target: { value: 'h1' } })
    fireEvent.click(screen.getByRole('tab', { name: /Palette/ }))
    expect((screen.getByRole('searchbox', { name: 'Search palette' }) as HTMLInputElement).value).toBe('')
    fireEvent.click(screen.getByRole('tab', { name: /Layers/ }))
    expect((screen.getByRole('searchbox', { name: 'Search elements' }) as HTMLInputElement).value).toBe('h1')
  })
})
