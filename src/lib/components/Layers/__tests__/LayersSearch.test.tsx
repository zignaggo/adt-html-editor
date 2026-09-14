import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { EditorProvider } from '../../Editor/EditorProvider'
import { LayersPanel } from '../LayersPanel'
import { LayersCount, LayersEmpty, LayersSearch, LayersTree } from '../LayersParts'

const HTML =
  '<section id="hero" class="flex"><h1>Title</h1><p class="lead">Intro</p></section><aside><span>x</span></aside>'

function setup(children?: React.ReactNode) {
  render(
    <EditorProvider defaultValue={HTML}>
      <LayersPanel>{children}</LayersPanel>
    </EditorProvider>,
  )
}

function searchbox(name = 'Search elements') {
  return screen.getByRole('searchbox', { name })
}

function treeText() {
  return screen
    .getAllByRole('treeitem')
    .map((row) => `${row.hasAttribute('data-muted') ? '~' : ''}${row.textContent?.trim()}`)
}

describe('HtmlEditor.Layers.Search', () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = vi.fn()
  })
  afterEach(cleanup)

  it('filters the tree and mutes ancestors', () => {
    setup()
    const input = searchbox()
    expect(screen.getAllByRole('treeitem')).toHaveLength(8)

    act(() => fireEvent.change(input, { target: { value: 'lead' } }))
    expect(treeText()).toEqual(['~section#heroflex', 'plead'])
  })

  it('reports the number of matches and an empty state', () => {
    setup(
      <>
        <LayersCount />
        <LayersSearch />
        <LayersTree />
      </>,
    )
    const input = searchbox()
    act(() => fireEvent.change(input, { target: { value: 'flex' } }))
    expect(screen.getByText('1')).toBeTruthy()

    act(() => fireEvent.change(input, { target: { value: 'nothing-here' } }))
    expect(screen.queryAllByRole('treeitem')).toHaveLength(0)
    expect(screen.getByText('No elements match “nothing-here”.')).toBeTruthy()
  })

  it('shows the standalone empty part outside the tree', () => {
    setup(
      <>
        <LayersSearch />
        <LayersEmpty>Nothing here</LayersEmpty>
      </>,
    )
    expect(screen.queryByText('Nothing here')).toBeNull()
    act(() => fireEvent.change(searchbox(), { target: { value: 'zzz' } }))
    expect(screen.getByText('No elements match “zzz”.')).toBeTruthy()
  })

  it('clears with Escape and jumps into the tree with ArrowDown', () => {
    setup()
    const input = searchbox()
    act(() => fireEvent.change(input, { target: { value: 'span' } }))
    expect(treeText()).toEqual(['~aside', 'span'])

    act(() => fireEvent.keyDown(input, { key: 'ArrowDown' }))
    const selected = screen.getByRole('treeitem', { selected: true })
    expect(selected.textContent).toBe('span')
    expect(document.activeElement).toBe(screen.getByRole('tree'))

    act(() => fireEvent.keyDown(input, { key: 'Escape' }))
    expect(input).toHaveProperty('value', '')
    expect(screen.getAllByRole('treeitem')).toHaveLength(8)
  })

  it('accepts a custom placeholder and label', () => {
    setup(<LayersSearch placeholder="Filter…" aria-label="Filter layers" />)
    expect(searchbox('Filter layers')).toHaveProperty('placeholder', 'Filter…')
  })
})
