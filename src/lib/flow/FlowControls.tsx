import { useSelector } from '@tanstack/react-store'
import { useEffect, useRef } from 'react'
import { useDirectControls, useLayoutMode } from '../components/Editor/context'
import { isPanModifier, panModeActive } from '../core/panMode'
import { useBoxHeight } from './box/useBoxHeight'
import { allows } from './capabilities'
import { repositionUi } from './component/repositionStore'
import { useReposition, type Reposition } from './component/useReposition'
import { useFreeTransform, type FreeTransform } from './transform/useFreeTransform'
import { useFreeTransformKeys } from './transform/useFreeTransformKeys'
import {
  COMPONENT_OUTLINE_CLASS,
  CORNER_CLASS,
  FRAME_CLASS,
  GHOST_CLASS,
  GHOST_LABEL_CLASS,
  GUIDE_CLASS,
  HEIGHT_HANDLE_CLASS,
  MARGIN_BAND_CLASS,
  OVERLAY_CLASS,
  PADDING_BAND_CLASS,
  PARENT_CLASS,
  SPACE_HANDLE_CLASS,
} from './flowStyles'
import { MOVE_ATTRIBUTE } from './gesture/canvasGesture'
import { subscribeFlowGesture } from './gesture/flowGestureStore'
import { useFlowGestures, type FlowGestures, type ResizeCorner } from './gestures/useFlowGestures'
import { FlowGroupControls } from './group/FlowGroupControls'
import {
  useFlowSelection,
  type FlowBox,
  type FlowEdges,
  type FlowTarget,
} from './useFlowSelection'

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

function positiveEdges(edges: FlowEdges): FlowEdges {
  return {
    top: Math.max(0, edges.top),
    right: Math.max(0, edges.right),
    bottom: Math.max(0, edges.bottom),
    left: Math.max(0, edges.left),
  }
}

/**
 * A band is its own border: the space it stands for is drawn by the border, and the page shows
 * through the middle. `inset` moves its outer edge off the border box — inwards for the padding,
 * outwards (negative) for the margin.
 */
function placeBand(band: HTMLElement, rect: FlowBox, edges: FlowEdges, inset: FlowEdges) {
  const width = positiveEdges(edges)
  if (width.top + width.right + width.bottom + width.left === 0) {
    band.dataset.visible = 'false'
    return
  }

  place(band, {
    left: rect.left + inset.left,
    top: rect.top + inset.top,
    width: Math.max(0, rect.width - inset.left - inset.right),
    height: Math.max(0, rect.height - inset.top - inset.bottom),
  })
  band.style.borderTopWidth = `${width.top}px`
  band.style.borderRightWidth = `${width.right}px`
  band.style.borderBottomWidth = `${width.bottom}px`
  band.style.borderLeftWidth = `${width.left}px`
}

function outwards(edges: FlowEdges): FlowEdges {
  const width = positiveEdges(edges)
  return { top: -width.top, right: -width.right, bottom: -width.bottom, left: -width.left }
}

export function FlowControls() {
  const layout = useLayoutMode()
  const direct = useDirectControls()
  if (layout !== 'flow' || !direct) return null
  return (
    <>
      <FlowControlsLayer />
      <FlowGroupControls />
    </>
  )
}

function FlowControlsLayer() {
  const target = useFlowSelection()
  const gestures = useFlowGestures(target)
  const box = useBoxHeight(target)
  const reposition = useReposition(target)
  const transform = useFreeTransform(target)
  useFreeTransformKeys(transform)
  const highlight = useSelector(repositionUi, (ui) => ui.highlight)
  if (!target) return null
  return (
    <FlowControlsFrame
      target={target}
      gestures={gestures}
      reposition={reposition}
      transform={transform}
      highlight={highlight}
      canHeight={box !== null && box.blocked === null}
    />
  )
}

function FlowControlsFrame({
  target,
  gestures,
  reposition,
  transform,
  highlight,
  canHeight,
}: {
  target: FlowTarget
  gestures: FlowGestures
  reposition: Reposition | null
  transform: FreeTransform | null
  highlight: boolean
  canHeight: boolean
}) {
  const frameRef = useRef<HTMLDivElement | null>(null)
  const parentRef = useRef<HTMLDivElement | null>(null)
  const guideRef = useRef<HTMLDivElement | null>(null)
  const marginRef = useRef<HTMLDivElement | null>(null)
  const paddingRef = useRef<HTMLDivElement | null>(null)
  const outlineRef = useRef<HTMLDivElement | null>(null)
  const ghostRef = useRef<HTMLDivElement | null>(null)
  const ghostLabelRef = useRef<HTMLSpanElement | null>(null)
  const repositionRef = useRef(reposition)
  const transformRef = useRef(transform)

  useEffect(() => {
    repositionRef.current = reposition
    transformRef.current = transform
  })

  useEffect(() => {
    let frame = 0

    const sync = () => {
      frame = 0
      const box = frameRef.current
      const parent = parentRef.current
      const margin = marginRef.current
      const padding = paddingRef.current
      if (!box || !parent || !margin || !padding) return
      const geometry = target.measure()
      if (!geometry) {
        box.dataset.visible = 'false'
        parent.dataset.visible = 'false'
        margin.dataset.visible = 'false'
        padding.dataset.visible = 'false'
        return
      }
      place(box, geometry.box)
      placeBand(margin, geometry.box, geometry.margin, outwards(geometry.margin))
      placeBand(padding, geometry.box, geometry.padding, positiveEdges(geometry.border))
      if (geometry.parentBox) place(parent, geometry.parentBox)
      else parent.dataset.visible = 'false'

      const outline = outlineRef.current
      const piece = repositionRef.current?.component
      if (!outline) return
      if (!highlight || !piece?.isConnected) {
        outline.dataset.visible = 'false'
        return
      }
      const rect = piece.getBoundingClientRect()
      place(outline, {
        left: rect.left - geometry.hostLeft,
        top: rect.top - geometry.hostTop,
        width: rect.width,
        height: rect.height,
      })
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
  }, [target, highlight])

  // The element takes the pointer only while a mode is live, so a drag never does something
  // the user did not ask for — and the grab cursor only appears when there is something to grab.
  const modeActive = (transform?.active ?? false) || (reposition?.routes ?? false)

  useEffect(() => {
    const { element } = target
    if (!modeActive) return

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || panModeActive() || isPanModifier(event)) return
      if ((event.target as HTMLElement | null)?.closest(INTERACTIVE)) return
      const freeTransform = transformRef.current
      if (freeTransform?.active) {
        freeTransform.start(event)
        return
      }
      repositionRef.current?.start(event)
    }

    element.setAttribute(MOVE_ATTRIBUTE, '')
    element.addEventListener('pointerdown', onPointerDown)
    return () => {
      element.removeAttribute(MOVE_ATTRIBUTE)
      element.removeEventListener('pointerdown', onPointerDown)
    }
  }, [target, modeActive])

  useEffect(
    () =>
      subscribeFlowGesture((session) => {
        const guide = guideRef.current
        if (guide) {
          const top = session?.axis === 'y' ? session.guideTop : null
          guide.dataset.visible = top === null ? 'false' : 'true'
          if (top !== null) guide.style.transform = `translate3d(0, ${top}px, 0)`
        }

        const ghost = ghostRef.current
        if (!ghost) return
        const box = session?.ghost ?? null
        ghost.dataset.visible = box === null ? 'false' : 'true'
        if (box !== null) place(ghost, box)
        if (ghostLabelRef.current) ghostLabelRef.current.textContent = session?.feedback ?? ''
      }),
    [],
  )

  const canResize = allows(target.inspection, 'resize')
  const canSpace = allows(target.inspection, 'space')

  return (
    <div className={OVERLAY_CLASS}>
      <div
        ref={marginRef}
        className={MARGIN_BAND_CLASS}
        data-band="margin"
        data-visible="false"
        aria-hidden="true"
      />
      <div
        ref={paddingRef}
        className={PADDING_BAND_CLASS}
        data-band="padding"
        data-visible="false"
        aria-hidden="true"
      />
      <div ref={parentRef} className={PARENT_CLASS} data-visible="false" aria-hidden="true" />
      <div ref={guideRef} className={GUIDE_CLASS} data-visible="false" aria-hidden="true" />
      <div
        ref={outlineRef}
        className={COMPONENT_OUTLINE_CLASS}
        data-outline="component"
        data-visible="false"
        aria-hidden="true"
      />
      <div ref={ghostRef} className={GHOST_CLASS} data-ghost="" data-visible="false" aria-hidden="true">
        <span ref={ghostLabelRef} className={GHOST_LABEL_CLASS} />
      </div>
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
