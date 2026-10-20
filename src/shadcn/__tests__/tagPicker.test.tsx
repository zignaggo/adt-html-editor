import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EditorProvider } from '../../lib/components/Editor/EditorProvider'
import { useEditorStoreApi } from '../../lib/components/Editor/context'
import { InspectorProvider } from '../../lib/components/Inspector/InspectorPanel'
import type { NodeId } from '../../lib/core/ids'
import type { EditorStore } from '../../lib/core/store'
import { TagInspectorHeader } from '../parts/Inspector/TagInspectorHeader'
import { TooltipProvider } from '../ui/tooltip'

function CaptureStore({ onStore }: { onStore: (store: EditorStore) => void }) {
  const store = useEditorStoreApi()
  useEffect(() => {
    onStore(store)
  }, [onStore, store])
  return null
}

function renderHeader(html: string, attrId: string) {
  let store: EditorStore | undefined
  render(
    <EditorProvider defaultValue={html}>
      <CaptureStore onStore={(s) => (store = s)} />
      <TooltipProvider>
        <InspectorProvider>
          <TagInspectorHeader />
        </InspectorProvider>
      </TooltipProvider>
    </EditorProvider>,
  )
  if (!store) throw new Error('store not captured')
  const target = Object.values(store.state.doc.nodes).find(
    (node) => (node.kind === 'element' || node.kind === 'opaque') && node.attrs.id === attrId,
  )
  if (!target) throw new Error(`no #${attrId}`)
  const id = target.id as NodeId
  act(() => store!.actions.select(id))
  const nodeOf = () => store!.state.doc.nodes[id]
  return {
    store,
    id,
    tagOf: () => {
      const node = nodeOf()
      return node.kind === 'element' ? node.tag : null
    },
    classesOf: () => {
      const node = nodeOf()
      return node.kind === 'element' ? node.classes : []
    },
  }
}

describe('tag picker', () => {
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

  it('retags the selection and keeps its classes and the selection', () => {
    const { store, id, tagOf, classesOf } = renderHeader(
      '<section><p id="p1" class="text-lg font-bold">one</p></section>',
      'p1',
    )
    expect(tagOf()).toBe('p')

    fireEvent.click(screen.getByRole('button', { name: 'Tag: p' }))
    const list = screen.getByRole('dialog')
    fireEvent.click(within(list).getByRole('button', { name: 'h2' }))

    expect(tagOf()).toBe('h2')
    expect(classesOf()).toEqual(['text-lg', 'font-bold'])
    expect(store.state.selectedId).toBe(id)
    expect(store.state.selectedIds).toEqual([id])
    expect(store.actions.getHtml()).toBe(
      '<section><h2 id="p1" class="text-lg font-bold">one</h2></section>',
    )
    expect(screen.getByRole('button', { name: 'Tag: h2' })).toBeTruthy()
  })

  it('disables a tag the content model refuses and keeps it on screen with its reason', () => {
    const { tagOf } = renderHeader('<section><div id="box"><div>inner</div></div></section>', 'box')

    fireEvent.click(screen.getByRole('button', { name: 'Tag: div' }))
    const list = screen.getByRole('dialog')

    const blocked = within(list).getByRole('button', { name: 'p, not valid here' })
    expect(blocked.textContent).toContain('not valid here')
    expect((blocked as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(blocked)
    expect(tagOf()).toBe('div')

    expect((within(list).getByRole('button', { name: 'section' }) as HTMLButtonElement).disabled).toBe(
      false,
    )
  })

  it('shows the id, the ancestors and the text preview beside the picker', () => {
    renderHeader('<section id="wrap"><p id="p1">hello there</p></section>', 'p1')

    expect(screen.getByText('#p1')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Lock element' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Select parent' })).toBeTruthy()
    const crumbs = screen.getByRole('navigation', { name: 'Ancestors' })
    expect(within(crumbs).getByRole('button', { name: 'section' })).toBeTruthy()
    expect(screen.getByTitle('hello there')).toBeTruthy()
  })
})
