import {
  createContext,
  use,
  useEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type SyntheticEvent,
} from 'react'
import invariant from 'tiny-invariant'
import { isStyled, labelOf } from '../../core/model'
import { useCanvasContext } from '../../components/Canvas/context'
import { useEditorContext, useEditorStoreApi, useFixedLayout } from '../../components/Editor/context'
import { subscribeFixedDrag } from '../fixedDragStore'
import { measureScale } from '../geometry'
import { useFixedDragEnv } from '../useFixedDragEnv'
import { readElementTransform } from './elementTransform'
import { GestureBadge } from './GestureBadge'
import {
  startGroupResizeGesture,
  startResizeGesture,
  startRotateGesture,
  takeGestureSnapshot,
  takeGroupSnapshot,
} from './gesture'
import { readGroupBox } from './groupBox'
import { HANDLE_SPECS, cursorFor, type HandleId } from './handleSpecs'
import { hasTransformedAncestor } from './layoutBox'
import { runPointerGesture } from './pointerGesture'
import styles from './Handles.module.css'

const HANDLES_ATTRIBUTE = 'data-adt-handles'
const DISABLED_HINT = 'Move this element to the page to resize or rotate it'
const GROUP_ORIGIN = { x: 0.5, y: 0.5 }

type HandlePointerEvent = ReactPointerEvent<HTMLElement>

type HandlesContextValue = {
  startResize: (handle: HandleId, event: HandlePointerEvent) => void
  startRotate: (event: HandlePointerEvent) => void
}

const HandlesContext = createContext<HandlesContextValue | null>(null)

function useHandlesContext(): HandlesContextValue {
  const value = use(HandlesContext)
  invariant(value, '<HtmlEditor.Canvas.Handles.*> must be rendered inside <HtmlEditor.Canvas.Handles>')
  return value
}

function stop(event: SyntheticEvent) {
  event.stopPropagation()
}

function capturePointer(target: Element, pointerId: number): boolean {
  if (typeof target.setPointerCapture !== 'function') return false
  try {
    target.setPointerCapture(pointerId)
    return true
  } catch {
    return false
  }
}

export type HandlesProps = {
  className?: string
  children?: ReactNode
}

export function Handles({ className, children }: HandlesProps) {
  const { canvasRootRef, aspectLock } = useEditorContext()
  const store = useEditorStoreApi()
  const { page } = useFixedLayout()
  const { zoom } = useCanvasContext()
  const getEnv = useFixedDragEnv()
  const frameRef = useRef<HTMLDivElement | null>(null)
  const labelRef = useRef<HTMLSpanElement | null>(null)

  useEffect(() => {
    const root = canvasRootRef.current
    const frame = frameRef.current
    if (!root || !frame) return
    root.setAttribute(HANDLES_ATTRIBUTE, '')

    let frameId = 0
    let dragging = false
    let checkedKey = ''
    let disabled = false

    const sync = () => {
      frameId = 0
      const { selectedId, selectedIds, editingTextId, locked, doc } = store.state
      const group = selectedIds.length > 0 ? readGroupBox(root, selectedIds) : null
      const editing = editingTextId !== null && selectedIds.includes(editingTextId)
      if (!group || dragging || editing) {
        frame.dataset.visible = 'false'
        return
      }

      const many = selectedIds.length > 1
      const node = selectedId ? doc.nodes[selectedId] : undefined
      const style = node && isStyled(node) ? node.attrs.style : undefined
      const box = group.box
      const transform = many ? null : readElementTransform(group.elements[0], style, box)
      const angle = transform?.angle ?? 0
      const origin = transform?.origin ?? GROUP_ORIGIN
      const scale = measureScale(root.getBoundingClientRect(), page.width)
      const key = selectedIds.join('|')
      if (key !== checkedKey) {
        checkedKey = key
        disabled = group.elements.some((element) => hasTransformedAncestor(element, root))
      }

      frame.dataset.visible = 'true'
      frame.dataset.group = many ? 'true' : 'false'
      frame.dataset.locked = selectedIds.some((id) => locked[id]) ? 'true' : 'false'
      frame.dataset.disabled = disabled ? 'true' : 'false'
      frame.title = disabled ? DISABLED_HINT : ''
      frame.style.left = `${box.x}px`
      frame.style.top = `${box.y}px`
      frame.style.width = `${box.width}px`
      frame.style.height = `${box.height}px`
      frame.style.transform = angle === 0 ? '' : `rotate(${angle}deg)`
      frame.style.transformOrigin = `${origin.x * 100}% ${origin.y * 100}%`
      frame.style.setProperty('--adt-inverse-scale', String(1 / scale))
      frame.style.setProperty('--adt-frame-angle', `${angle}deg`)
      if (labelRef.current) {
        labelRef.current.textContent = many
          ? `${selectedIds.length} elements`
          : node
            ? labelOf(node)
            : ''
      }
      for (const handle of frame.querySelectorAll<HTMLElement>('[data-handle]')) {
        handle.style.cursor = cursorFor(handle.dataset.handle as HandleId, angle)
      }
    }

    const schedule = () => {
      if (!frameId) frameId = requestAnimationFrame(sync)
    }

    const subscription = store.subscribe(schedule)
    const unsubscribeDrag = subscribeFixedDrag((session) => {
      dragging = session !== null
      schedule()
    })
    const mutations = new MutationObserver((records) => {
      for (const record of records) {
        if (!frame.contains(record.target)) {
          schedule()
          return
        }
      }
    })
    mutations.observe(root, { attributes: true, childList: true, subtree: true, characterData: true })
    const resize = new ResizeObserver(schedule)
    resize.observe(root)
    const scroller = root.closest('[data-adt-canvas-scroll]')
    if (scroller) resize.observe(scroller)
    schedule()

    return () => {
      cancelAnimationFrame(frameId)
      subscription.unsubscribe()
      unsubscribeDrag()
      mutations.disconnect()
      resize.disconnect()
      root.removeAttribute(HANDLES_ATTRIBUTE)
    }
  }, [canvasRootRef, store, page.width, zoom])

  const begin = (event: HandlePointerEvent) => {
    if (event.button !== 0) return null
    event.preventDefault()
    event.stopPropagation()
    const env = getEnv()
    const root = env.pageElement
    const { selectedIds, locked } = store.state
    if (!root || selectedIds.length === 0) return null
    if (selectedIds.some((id) => locked[id])) return null

    const elements: HTMLElement[] = []
    for (const id of selectedIds) {
      const element = root.querySelector<HTMLElement>(`[data-adt-id="${id}"]`)
      if (!element) return null
      elements.push(element)
    }
    if (elements.some((element) => hasTransformedAncestor(element, root))) return null

    capturePointer(event.currentTarget, event.pointerId)

    if (selectedIds.length === 1) {
      const snapshot = takeGestureSnapshot(env, selectedIds[0], elements[0])
      return snapshot ? ({ env, kind: 'single', snapshot } as const) : null
    }
    const snapshot = takeGroupSnapshot(env, selectedIds)
    return snapshot ? ({ env, kind: 'group', snapshot } as const) : null
  }

  const context: HandlesContextValue = {
    startResize(handle, event) {
      const started = begin(event)
      if (!started) return
      const controller =
        started.kind === 'single'
          ? startResizeGesture(
              started.env,
              started.snapshot,
              handle,
              event.nativeEvent,
              aspectLock.state,
            )
          : startGroupResizeGesture(
              started.env,
              started.snapshot,
              handle,
              event.nativeEvent,
              aspectLock.state,
            )
      runPointerGesture(event.nativeEvent, controller)
    },
    startRotate(event) {
      const started = begin(event)
      if (!started || started.kind !== 'single') return
      runPointerGesture(
        event.nativeEvent,
        startRotateGesture(started.env, started.snapshot, event.nativeEvent),
      )
    },
  }

  return (
    <HandlesContext value={context}>
      <div
        ref={frameRef}
        className={className ? `${styles.frame} ${className}` : styles.frame}
        data-adt-handles-frame=""
        data-visible="false"
        onClick={stop}
        onDoubleClick={stop}
      >
        <span ref={labelRef} className={styles.label} aria-hidden="true" />
        {children ?? (
          <>
            <HandlesResize />
            <HandlesRotate />
          </>
        )}
        <GestureBadge className={styles.badge} />
      </div>
    </HandlesContext>
  )
}

export function HandlesResize() {
  const { startResize } = useHandlesContext()
  return (
    <>
      {HANDLE_SPECS.map((spec) => (
        <button
          key={spec.id}
          type="button"
          className={styles.handle}
          data-handle={spec.id}
          aria-label={spec.label}
          tabIndex={-1}
          draggable={false}
          onPointerDown={(event) => startResize(spec.id, event)}
        />
      ))}
    </>
  )
}

export function HandlesRotate() {
  const { startRotate } = useHandlesContext()
  return (
    <>
      <span className={styles.stem} aria-hidden="true" />
      <button
        type="button"
        className={styles.rotate}
        data-rotate=""
        aria-label="Rotate"
        tabIndex={-1}
        draggable={false}
        onPointerDown={startRotate}
      />
    </>
  )
}
