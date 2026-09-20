import { act, cleanup, render } from '@testing-library/react'
import { useEffect } from 'react'
import type { Input } from '@atlaskit/pragmatic-drag-and-drop/types'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CanvasContext, type CanvasContextValue } from '../../components/Canvas/context'
import { useEditorStoreApi } from '../../components/Editor/context'
import { EditorProvider } from '../../components/Editor/EditorProvider'
import { isStyled } from '../../core/model'
import type { EditorStore } from '../../core/store'
import { FixedPage } from '../FixedPage'
import { beginFixedDrag, finishFixedDrag, moveFixedDrag, type FixedDragEnv } from '../fixedDrag'
import { outlineStrategy } from '../ghost/strategy'

const DOCUMENT = `<!DOCTYPE html><html><head><meta name="viewport" content="width=1200, height=1600"></head><body>
<div style="position: absolute; left: 100px; top: 200px; width: 300px; height: 120px;">Box</div>
<p style="position: absolute; left: 700px; top: 900px; width: 200px;">Other</p>
<section style="position: absolute; left: 0; top: 0; width: 1200px; height: 400px;"><span style="position: absolute; left: 20px; top: 30px; width: 60px; height: 20px;">Nested</span></section>
</body></html>`

const canvasContext: CanvasContextValue = {
  width: 0,
  presetId: 'desktop',
  setPreset: () => {},
  isDark: false,
  setIsDark: () => {},
  stylesReady: true,
  zoom: 1,
  setZoom: () => {},
  ghostRef: { current: null },
  registerGhost: () => () => {},
  ghostLayerRef: { current: null },
  registerGhostLayer: () => {},
}

function CaptureStore({ onStore }: { onStore: (store: EditorStore) => void }) {
  const store = useEditorStoreApi()
  useEffect(() => {
    onStore(store)
  }, [onStore, store])
  return null
}

function rect(left: number, top: number, width: number, height: number): DOMRect {
  const box = { left, top, width, height, right: left + width, bottom: top + height, x: left, y: top }
  return { ...box, toJSON: () => box } as DOMRect
}

function layout(
  element: HTMLElement,
  box: { x: number; y: number; width: number; height: number },
  parent: Element,
) {
  Object.defineProperties(element, {
    offsetLeft: { value: box.x, configurable: true },
    offsetTop: { value: box.y, configurable: true },
    offsetWidth: { value: box.width, configurable: true },
    offsetHeight: { value: box.height, configurable: true },
    offsetParent: { value: parent, configurable: true },
  })
  element.getBoundingClientRect = () => rect(box.x, box.y, box.width, box.height)
}

function pointer(clientX: number, clientY: number): Input {
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

function styleOf(store: EditorStore, id: string): string | undefined {
  const node = store.state.doc.nodes[id]
  return node && isStyled(node) ? node.attrs.style : undefined
}

function setup() {
  let store: EditorStore | undefined
  render(
    <EditorProvider layout="fixed" defaultValue={DOCUMENT}>
      <CaptureStore onStore={(s) => (store = s)} />
      <CanvasContext value={canvasContext}>
        <FixedPage />
      </CanvasContext>
    </EditorProvider>,
  )
  if (!store) throw new Error('store not captured')
  const root = document.querySelector<HTMLElement>('[data-adt-canvas]')
  if (!root) throw new Error('canvas root missing')
  root.getBoundingClientRect = () => rect(0, 0, 1200, 1600)

  const box = root.querySelector<HTMLElement>('div[data-adt-id]')
  const other = root.querySelector<HTMLElement>('p[data-adt-id]')
  const section = root.querySelector<HTMLElement>('section[data-adt-id]')
  const nested = root.querySelector<HTMLElement>('span[data-adt-id]')
  if (!box || !other || !section || !nested) throw new Error('fixtures missing')
  layout(box, { x: 100, y: 200, width: 300, height: 120 }, root)
  layout(other, { x: 700, y: 900, width: 200, height: 40 }, root)
  layout(section, { x: 0, y: 0, width: 1200, height: 400 }, root)
  layout(nested, { x: 20, y: 30, width: 60, height: 20 }, section)

  const env: FixedDragEnv = {
    store,
    pageElement: root,
    page: { width: 1200, height: 1600 },
    pageContainerId: store.state.doc.rootId,
    precision: 1,
    snapThreshold: 0,
    keepStacking: true,
    ghost: outlineStrategy,
    layer: null,
  }

  const idOf = (element: HTMLElement) => {
    const id = element.getAttribute('data-adt-id')
    if (!id) throw new Error('missing id')
    return id
  }

  return { store, root, env, box, other, nested, ids: { box: idOf(box), other: idOf(other), nested: idOf(nested) } }
}

describe('fixed drag', () => {
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

  it('moves every member by the same delta in one history entry', () => {
    const { store, env, ids } = setup()
    act(() => store.actions.selectMany([ids.box, ids.other]))
    const before = store.state.history.past.length

    act(() => {
      beginFixedDrag(env, {
        memberIds: [ids.box, ids.other],
        template: null,
        element: null,
        input: pointer(150, 250),
      })
      moveFixedDrag(env, pointer(190, 280))
      finishFixedDrag(env, true)
    })

    expect(styleOf(store, ids.box)).toBe(
      'position: absolute; left: 140px; top: 230px; width: 300px; height: 120px',
    )
    expect(styleOf(store, ids.other)).toBe('position: absolute; left: 740px; top: 930px; width: 200px')
    expect(store.state.history.past.length).toBe(before + 1)
  })

  it('keeps the parent of every member when dragging a group', () => {
    const { store, env, ids } = setup()
    const parentBefore = store.state.doc.nodes[ids.nested].parentId

    act(() => {
      beginFixedDrag(env, {
        memberIds: [ids.box, ids.nested],
        template: null,
        element: null,
        input: pointer(150, 250),
      })
      moveFixedDrag(env, pointer(160, 260))
      finishFixedDrag(env, true)
    })

    expect(store.state.doc.nodes[ids.nested].parentId).toBe(parentBefore)
  })

  it('still reparents a single nested member into the page container', () => {
    const { store, env, ids } = setup()

    act(() => {
      beginFixedDrag(env, {
        memberIds: [ids.nested],
        template: null,
        element: null,
        input: pointer(30, 40),
      })
      moveFixedDrag(env, pointer(50, 70))
      finishFixedDrag(env, true)
    })

    expect(store.state.doc.nodes[ids.nested].parentId).toBe(store.state.doc.rootId)
  })

  it('leaves the document untouched when the drop is cancelled', () => {
    const { store, env, ids } = setup()
    const original = styleOf(store, ids.box)

    act(() => {
      beginFixedDrag(env, {
        memberIds: [ids.box],
        template: null,
        element: null,
        input: pointer(150, 250),
      })
      moveFixedDrag(env, pointer(400, 400))
      finishFixedDrag(env, false)
    })

    expect(styleOf(store, ids.box)).toBe(original)
    expect(store.state.history.past).toHaveLength(0)
  })
})
