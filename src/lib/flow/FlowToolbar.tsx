import { useEffect, useRef } from 'react'
import { useDirectControls, useLayoutMode } from '../components/Editor/context'
import { BoxSizeControls } from './box/BoxSizeControls'
import { RepositionControl } from './component/RepositionControl'
import { FlowIcon, type FlowIconName } from './flowIcons'
import {
  TOOLBAR_APPENDIX_CLASS,
  TOOLBAR_BUTTON_CLASS,
  TOOLBAR_CLASS,
  TOOLBAR_DOCK_CLASS,
  TOOLBAR_GROUP_CLASS,
  TOOLBAR_OVERLAY_CLASS,
  TOOLBAR_SEPARATOR_CLASS,
} from './flowStyles'
import type { FlowAlign } from './gestures/flowWrite'
import { LayoutControls } from './layout/LayoutControls'
import { TagControls } from './tags/TagControls'
import { useFlowSelection, type FlowTarget } from './useFlowSelection'
import { useFlowToolbar, type FlowToolbar as FlowToolbarApi } from './useFlowToolbar'

const GAP = 8

const ALIGNMENTS: ReadonlyArray<{ value: FlowAlign; icon: FlowIconName; label: string }> = [
  { value: 'left', icon: 'alignLeft', label: 'Align left' },
  { value: 'center', icon: 'alignCenter', label: 'Align centre' },
  { value: 'right', icon: 'alignRight', label: 'Align right' },
]

export function FlowToolbar() {
  const layout = useLayoutMode()
  const direct = useDirectControls()
  if (layout !== 'flow' || !direct) return null
  return <FlowToolbarLayer />
}

function FlowToolbarLayer() {
  const target = useFlowSelection()
  const toolbar = useFlowToolbar(target)
  if (!target || !toolbar) return null
  return <FlowToolbarBar target={target} toolbar={toolbar} />
}

function FlowToolbarBar({ target, toolbar }: { target: FlowTarget; toolbar: FlowToolbarApi }) {
  const dockRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let frame = 0

    const sync = () => {
      frame = 0
      const dock = dockRef.current
      if (!dock) return
      const geometry = target.measure()
      if (!geometry) {
        dock.dataset.visible = 'false'
        return
      }

      dock.dataset.visible = 'true'
      dock.style.maxWidth = `${Math.max(0, geometry.hostWidth - GAP * 2)}px`
      const { offsetWidth: width, offsetHeight: height } = dock
      const room = Math.max(GAP, geometry.hostWidth - width - GAP)
      const left = Math.min(Math.max(GAP, geometry.box.left + geometry.box.width / 2 - width / 2), room)
      const above = geometry.box.top - height - GAP
      const below = Math.min(
        geometry.box.top + geometry.box.height + GAP,
        Math.max(GAP, geometry.hostHeight - height - GAP),
      )
      const top = above >= GAP ? above : below
      dock.style.transform = `translate3d(${Math.round(left)}px, ${Math.round(top)}px, 0)`
    }

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(sync)
    }

    const unsubscribeHost = target.host.subscribe(schedule)
    const root = target.host.root()
    const mutations = new MutationObserver(schedule)
    if (root) {
      mutations.observe(root, { attributes: true, childList: true, subtree: true, characterData: true })
    }
    const resize = new ResizeObserver(schedule)
    if (dockRef.current) resize.observe(dockRef.current)
    sync()

    return () => {
      cancelAnimationFrame(frame)
      unsubscribeHost()
      mutations.disconnect()
      resize.disconnect()
    }
  }, [target])

  return (
    <div className={TOOLBAR_OVERLAY_CLASS}>
      <div ref={dockRef} className={TOOLBAR_DOCK_CLASS} data-visible="false">
        {toolbar.move ? (
          <div className={TOOLBAR_APPENDIX_CLASS} role="toolbar" aria-label="Reorder">
            <button
              type="button"
              className={TOOLBAR_BUTTON_CLASS}
              aria-label="Move earlier"
              title="Move earlier"
              disabled={!toolbar.canMove(-1)}
              onClick={() => toolbar.move?.(-1)}
            >
              <FlowIcon name="moveUp" />
            </button>
            <button
              type="button"
              className={TOOLBAR_BUTTON_CLASS}
              aria-label="Move later"
              title="Move later"
              disabled={!toolbar.canMove(1)}
              onClick={() => toolbar.move?.(1)}
            >
              <FlowIcon name="moveDown" />
            </button>
          </div>
        ) : null}

        <div className={TOOLBAR_CLASS} role="toolbar" aria-label="Layout controls">
          <RepositionControl target={target} />
          <TagControls target={target} />

          {toolbar.selectParent ? (
            <button
              type="button"
              className={TOOLBAR_BUTTON_CLASS}
              aria-label="Select parent"
              title="Select parent"
              onClick={toolbar.selectParent}
            >
              <FlowIcon name="parent" />
            </button>
          ) : null}

          <LayoutControls target={target} />

          <span className={TOOLBAR_SEPARATOR_CLASS} />

          {toolbar.align ? (
            <div className={TOOLBAR_GROUP_CLASS}>
              {ALIGNMENTS.map((entry) => (
                <button
                  key={entry.value}
                  type="button"
                  className={TOOLBAR_BUTTON_CLASS}
                  aria-label={entry.label}
                  title={entry.label}
                  onClick={() => toolbar.align?.(entry.value)}
                >
                  <FlowIcon name={entry.icon} />
                </button>
              ))}
            </div>
          ) : null}

          {toolbar.textSize ? (
            <Stepper
              icon="textSize"
              less="Smaller text"
              more="Bigger text"
              onStep={toolbar.textSize}
            />
          ) : null}

          <span className={TOOLBAR_SEPARATOR_CLASS} />

          {toolbar.width ? (
            <Stepper icon="width" less="Narrower" more="Wider" onStep={toolbar.width} />
          ) : null}

          {toolbar.space ? (
            <Stepper
              icon="spaceBelow"
              less="Less space below"
              more="More space below"
              onStep={toolbar.space}
            />
          ) : null}

          <BoxSizeControls target={target} />
        </div>
      </div>
    </div>
  )
}

function Stepper({
  icon,
  less,
  more,
  onStep,
}: {
  icon: FlowIconName
  less: string
  more: string
  onStep: (step: number) => void
}) {
  return (
    <div className={TOOLBAR_GROUP_CLASS}>
      <button
        type="button"
        className={TOOLBAR_BUTTON_CLASS}
        aria-label={less}
        title={less}
        onClick={() => onStep(-1)}
      >
        <FlowIcon name={icon} />
        <span aria-hidden="true">−</span>
      </button>
      <button
        type="button"
        className={TOOLBAR_BUTTON_CLASS}
        aria-label={more}
        title={more}
        onClick={() => onStep(1)}
      >
        <FlowIcon name={icon} />
        <span aria-hidden="true">+</span>
      </button>
    </div>
  )
}
