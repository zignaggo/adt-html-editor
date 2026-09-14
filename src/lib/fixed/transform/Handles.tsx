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
import { startResizeGesture, startRotateGesture, takeGestureSnapshot } from './gesture'
import { HANDLE_SPECS, cursorFor, type HandleId } from './handleSpecs'
import { hasTransformedAncestor, readLayoutBox } from './layoutBox'
import { runPointerGesture } from './pointerGesture'
import styles from './Handles.module.css'

const HANDLES_ATTRIBUTE = 'data-adt-handles'
const DISABLED_HINT = 'Move this element to the page to resize or rotate it'

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
    let checked: HTMLElement | null = null
    let disabled = false

    const sync = () => {
      frameId = 0
      const { selectedId, editingTextId, locked, doc } = store.state
      const element = selectedId
        ? root.querySelector<HTMLElement>(`[data-adt-id="${selectedId}"]`)
        : null
      if (!selectedId || !element || dragging || editingTextId === selectedId) {
        frame.dataset.visible = 'false'
        return
      }
      const node = doc.nodes[selectedId]
      const style = node && isStyled(node) ? node.attrs.style : undefined
      const box = readLayoutBox(element, root)
      const transform = readElementTransform(element, style, box)
      const scale = measureScale(root.getBoundingClientRect(), page.width)
      if (element !== checked) {
        checked = element
        disabled = hasTransformedAncestor(element, root)
      }

      frame.dataset.visible = 'true'
      frame.dataset.locked = locked[selectedId] ? 'true' : 'false'
      frame.dataset.disabled = disabled ? 'true' : 'false'
      frame.title = disabled ? DISABLED_HINT : ''
      frame.style.left = `${box.x}px`
      frame.style.top = `${box.y}px`
      frame.style.width = `${box.width}px`
      frame.style.height = `${box.height}px`
      frame.style.transform = transform.angle === 0 ? '' : `rotate(${transform.angle}deg)`
      frame.style.transformOrigin = `${transform.origin.x * 100}% ${transform.origin.y * 100}%`
      frame.style.setProperty('--adt-inverse-scale', String(1 / scale))
      frame.style.setProperty('--adt-frame-angle', `${transform.angle}deg`)
      if (labelRef.current) labelRef.current.textContent = node ? labelOf(node) : ''
      for (const handle of frame.querySelectorAll<HTMLElement>('[data-handle]')) {
        handle.style.cursor = cursorFor(handle.dataset.handle as HandleId, transform.angle)
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
    const { selectedId, locked } = store.state
    if (!root || !selectedId || locked[selectedId]) return null
    const element = root.querySelector<HTMLElement>(`[data-adt-id="${selectedId}"]`)
    if (!element || hasTransformedAncestor(element, root)) return null
    const snapshot = takeGestureSnapshot(env, selectedId, element)
    if (!snapshot) return null
    capturePointer(event.currentTarget, event.pointerId)
    return { env, snapshot }
  }

  const context: HandlesContextValue = {
    startResize(handle, event) {
      const started = begin(event)
      if (!started) return
      const controller = startResizeGesture(
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
      if (!started) return
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
