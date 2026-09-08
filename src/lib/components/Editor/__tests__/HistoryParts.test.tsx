import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import type { EditorStore } from '../../../core/store'
import { useEditorStoreApi } from '../context'
import { EditorProvider } from '../EditorProvider'
import { HistoryGroup, HistoryRedo, HistoryUndo } from '../HistoryParts'

function CaptureStore({ onStore }: { onStore: (store: EditorStore) => void }) {
  const store = useEditorStoreApi()
  useEffect(() => {
    onStore(store)
  }, [onStore, store])
  return null
}

function setup(children = <HistoryGroup />) {
  let store: EditorStore | undefined
  render(
    <EditorProvider defaultValue="<p>a</p><p>b</p>">
      <CaptureStore onStore={(s) => (store = s)} />
      {children}
    </EditorProvider>,
  )
  if (!store) throw new Error('store não capturada')
  return store
}

function removeFirstChild(store: EditorStore) {
  const state = store.getState()
  const root = state.doc.nodes[state.doc.rootId]
  if (root.kind !== 'element') throw new Error('raiz inesperada')
  act(() => state.removeNode(root.children[0]))
}

describe('HtmlEditor.History', () => {
  afterEach(cleanup)

  it('renders undo and redo disabled on a fresh document', () => {
    setup()
    expect(screen.getByRole('group', { name: 'Histórico' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Desfazer' })).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: 'Refazer' })).toHaveProperty('disabled', true)
  })

  it('undoes and redoes through the buttons', () => {
    const store = setup()
    const before = store.getState().getHtml()
    removeFirstChild(store)
    const after = store.getState().getHtml()
    expect(after).not.toBe(before)

    const undo = screen.getByRole('button', { name: 'Desfazer' })
    const redo = screen.getByRole('button', { name: 'Refazer' })
    expect(undo).toHaveProperty('disabled', false)
    expect(redo).toHaveProperty('disabled', true)

    fireEvent.click(undo)
    expect(store.getState().getHtml()).toBe(before)
    expect(undo).toHaveProperty('disabled', true)
    expect(redo).toHaveProperty('disabled', false)

    fireEvent.click(redo)
    expect(store.getState().getHtml()).toBe(after)
  })

  it('lets consumers compose their own labels and extra parts', () => {
    setup(
      <HistoryGroup>
        <HistoryRedo>Redo</HistoryRedo>
        <HistoryUndo>Undo</HistoryUndo>
        <span>extra</span>
      </HistoryGroup>,
    )
    const buttons = screen.getAllByRole('button')
    expect(buttons.map((b) => b.textContent)).toEqual(['Redo', 'Undo'])
    expect(screen.getByText('extra')).toBeTruthy()
  })
})
