import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EditorProvider } from '../../components/Editor/EditorProvider'
import { useEditorStoreApi } from '../../components/Editor/context'
import type { EditorStore } from '../../core/store'
import { useCanvasStylesheet } from '../useCanvasStylesheet'

const buildCss = vi.hoisted(() => vi.fn<(classes: string[]) => Promise<string>>())
vi.mock('../client', () => ({ buildCss }))

type Deferred = { resolve: (css: string) => void; reject: (error: Error) => void }
const builds: Deferred[] = []

function deferBuilds() {
  builds.length = 0
  buildCss.mockImplementation(
    () => new Promise<string>((resolve, reject) => builds.push({ resolve, reject })),
  )
}

function styleText() {
  return document.head.querySelector('style[data-adt-canvas-style]')?.textContent ?? null
}

function setup(html: string) {
  let store: EditorStore | undefined
  const wrapper = ({ children }: { children: ReactNode }) => (
    <EditorProvider defaultValue={html}>{children}</EditorProvider>
  )
  const hook = renderHook(
    () => {
      store = useEditorStoreApi()
      return useCanvasStylesheet()
    },
    { wrapper },
  )
  if (!store) throw new Error('store não capturada')
  return { hook, store }
}

describe('useCanvasStylesheet', () => {
  beforeEach(deferBuilds)
  afterEach(() => {
    cleanup()
    document.head.querySelector('style[data-adt-canvas-style]')?.remove()
  })

  it('stays pending until the first build lands, then becomes ready with the CSS injected', async () => {
    const { hook } = setup('<p class="p-4">a</p>')
    expect(hook.result.current).toBe(false)
    expect(buildCss).toHaveBeenCalledWith(['p-4'])

    await act(async () => builds[0].resolve('.p-4{padding:1rem}'))
    await waitFor(() => expect(hook.result.current).toBe(true))
    expect(styleText()).toContain('.p-4{padding:1rem}')
  })

  it('becomes ready even when the build fails, so the canvas is never hidden forever', async () => {
    const { hook } = setup('<p class="p-4">a</p>')
    await act(async () => builds[0].reject(new Error('sem worker')))
    await waitFor(() => expect(hook.result.current).toBe(true))
    expect(styleText()).toBe('')
  })

  it('does not flicker back to pending on incremental class additions', async () => {
    const { hook, store } = setup('<p class="p-4">a</p>')
    await act(async () => builds[0].resolve('css-1'))
    await waitFor(() => expect(hook.result.current).toBe(true))

    const { state, actions } = store
    const root = state.doc.nodes[state.doc.rootId]
    if (root.kind !== 'element') throw new Error('raiz inesperada')
    act(() => actions.setClasses(root.children[0], ['p-4', 'm-2']))

    expect(hook.result.current).toBe(true)
    expect(buildCss).toHaveBeenLastCalledWith(['p-4', 'm-2'])
    await act(async () => builds[1].resolve('css-2'))
    await waitFor(() => expect(styleText()).toContain('css-2'))
  })

  it('hides again while a replaced document is being styled', async () => {
    const { hook, store } = setup('<p class="p-4">a</p>')
    await act(async () => builds[0].resolve('css-1'))
    await waitFor(() => expect(hook.result.current).toBe(true))

    act(() => store.actions.replaceDocument('<p class="m-2">b</p>'))
    expect(hook.result.current).toBe(false)
    expect(buildCss).toHaveBeenLastCalledWith(['m-2'])

    await act(async () => builds[1].resolve('css-2'))
    await waitFor(() => expect(hook.result.current).toBe(true))
    expect(styleText()).toContain('css-2')
  })

  it('rebuilds when the class set changes but keeps the same size', async () => {
    const { store } = setup('<p class="p-4">a</p>')
    await act(async () => builds[0].resolve('css-1'))
    act(() => store.actions.replaceDocument('<p class="p-8">b</p>'))
    expect(buildCss).toHaveBeenLastCalledWith(['p-8'])
  })
})
