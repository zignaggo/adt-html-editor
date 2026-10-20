import { useEffect, useRef } from 'react'
import { useDirectControls, useLayoutMode } from '../components/Editor/context'
import { isPanModifier, panModeActive } from '../core/panMode'
import { useBoxHeight } from './box/useBoxHeight'
import { allows } from './capabilities'
import {
  CORNER_CLASS,
  FRAME_CLASS,
  GUIDE_CLASS,
  HEIGHT_HANDLE_CLASS,
  OVERLAY_CLASS,
  PARENT_CLASS,
  SPACE_HANDLE_CLASS,
} from './flowStyles'
import { subscribeFlowGesture } from './gesture/flowGestureStore'
import { useFlowGestures, type FlowGestures, type ResizeCorner } from './gestures/useFlowGestures'
import { useFlowSelection, type FlowBox, type FlowTarget } from './useFlowSelection'

const CORNERS: readonly ResizeCorner[] = ['nw', 'ne', 'sw', 'se']

const CORNER_LABELS: Record<ResizeCorner, string> = {
  nw: 'Resize from the top left',
  ne: 'Resize from the top right',
  sw: 'Resize from the bottom left',
  se: 'Resize from the bottom right',
}

const INTERACTIVE = 'a,button,input,select,textarea,label,[contenteditable=""],[contenteditable="true"]'

function place(box: HTMLElement, rect: FlowBox) {
  box.dataset.visible = 'true'
  box.style.transform = `translate3d(${rect.left}px, ${rect.top}px, 0)`
  box.style.width = `${rect.width}px`
  box.style.height = `${rect.height}px`
}

export function FlowControls() {
  const layout = useLayoutMode()
  const direct = useDirectControls()
  if (layout !== 'flow' || !direct) return null
  return <FlowControlsLayer />
}

function FlowControlsLayer() {
  const target = useFlowSelection()
  const gestures = useFlowGestures(target)
  const box = useBoxHeight(target)
  if (!target) return null
  return (
    <FlowControlsFrame
      target={target}
      gestures={gestures}
      canHeight={box !== null && box.blocked === null}
    />
  )
}

function FlowControlsFrame({
  target,
  gestures,
  canHeight,
}: {
  target: FlowTarget
  gestures: FlowGestures
  canHeight: boolean
}) {
  const frameRef = useRef<HTMLDivElement | null>(null)
  const parentRef = useRef<HTMLDivElement | null>(null)
  const guideRef = useRef<HTMLDivElement | null>(null)
  const gesturesRef = useRef(gestures)

  useEffect(() => {
    gesturesRef.current = gestures
  })

  useEffect(() => {
    let frame = 0

    const sync = () => {
      frame = 0
      const box = frameRef.current
      const parent = parentRef.current
      if (!box || !parent) return
      const geometry = target.measure()
      if (!geometry) {
        box.dataset.visible = 'false'
        parent.dataset.visible = 'false'
        return
      }
      place(box, geometry.box)
      if (geometry.parentBox) place(parent, geometry.parentBox)
      else parent.dataset.visible = 'false'
    }

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(sync)
    }

    const unsubscribeHost = target.host.subscribe(schedule)
    const root = target.host.root()
    const mutations = new MutationObserver(schedule)
    if (root) {
      mutations.observe(root, {
        attributes: true,
        childList: true,
        subtree: true,
        characterData: true,
      })
    }
    sync()

    return () => {
      cancelAnimationFrame(frame)
      unsubscribeHost()
      mutations.disconnect()
    }
  }, [target])

  useEffect(() => {
    const { element } = target

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || panModeActive() || isPanModifier(event)) return
      if ((event.target as HTMLElement | null)?.closest(INTERACTIVE)) return
      gesturesRef.current.startMove(event)
    }

    element.addEventListener('pointerdown', onPointerDown)
    return () => element.removeEventListener('pointerdown', onPointerDown)
  }, [target])

  useEffect(
    () =>
      subscribeFlowGesture((session) => {
        const guide = guideRef.current
        if (!guide) return
        const top = session?.axis === 'y' ? session.guideTop : null
        guide.dataset.visible = top === null ? 'false' : 'true'
        if (top !== null) guide.style.transform = `translate3d(0, ${top}px, 0)`
      }),
    [],
  )

  const canResize = allows(target.inspection, 'resize')
  const canSpace = allows(target.inspection, 'space')

  return (
    <div className={OVERLAY_CLASS}>
      <div ref={parentRef} className={PARENT_CLASS} data-visible="false" aria-hidden="true" />
      <div ref={guideRef} className={GUIDE_CLASS} data-visible="false" aria-hidden="true" />
      <div ref={frameRef} className={FRAME_CLASS} data-visible="false">
        {canResize
          ? CORNERS.map((corner) => (
              <button
                key={corner}
                type="button"
                className={CORNER_CLASS}
                data-corner={corner}
                aria-label={CORNER_LABELS[corner]}
                tabIndex={-1}
                draggable={false}
                onPointerDown={(event) => gestures.startResize(corner, event.nativeEvent)}
              />
            ))
          : null}
        {canHeight ? (
          <button
            type="button"
            className={HEIGHT_HANDLE_CLASS}
            aria-label="Height"
            tabIndex={-1}
            draggable={false}
            onPointerDown={(event) => gestures.startHeight(event.nativeEvent)}
          />
        ) : null}
        {canSpace ? (
          <button
            type="button"
            className={SPACE_HANDLE_CLASS}
            aria-label="Space below"
            tabIndex={-1}
            draggable={false}
            onPointerDown={(event) => gestures.startSpace(event.nativeEvent)}
          />
        ) : null}
      </div>
    </div>
  )
}
