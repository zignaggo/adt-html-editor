import { useEffect, useRef, useState } from 'react'
import {
  FIELD_CLASS,
  FIELD_HINT_CLASS,
  FIELD_INPUT_CLASS,
  FIELD_LABEL_CLASS,
  POPOVER_CLASS,
  TOOLBAR_BUTTON_CLASS,
} from '../flowStyles'
import { FlowIcon } from '../flowIcons'
import type { FlowTarget } from '../useFlowSelection'
import {
  CONTENT_HINT,
  HEIGHT_STEP_PX,
  MAX_INNER_SPACE_PX,
  MIN_INNER_SPACE_PX,
  clampInnerSpace,
} from './boxHeight'
import { useBoxHeight, type BoxHeight } from './useBoxHeight'

function numberOf(value: string): number | null {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function BoxSizeControls({ target }: { target: FlowTarget }) {
  const box = useBoxHeight(target)
  const [isOpen, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!isOpen) return

    const onPointerDown = (event: PointerEvent) => {
      const wrapper = wrapperRef.current
      if (wrapper && !wrapper.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    window.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [isOpen])

  if (!box || box.blocked !== null) return null

  return (
    <div ref={wrapperRef} className="relative flex items-center">
      <button
        type="button"
        className={TOOLBAR_BUTTON_CLASS}
        aria-label="Size"
        aria-expanded={isOpen}
        onClick={() => setOpen(!isOpen)}
      >
        <FlowIcon name="size" />
      </button>
      {isOpen ? <BoxSizePanel key={target.id} box={box} /> : null}
    </div>
  )
}

function BoxSizePanel({ box }: { box: BoxHeight }) {
  const [height, setHeight] = useState(() => box.heightOf())
  const [vertical, setVertical] = useState(() => box.innerSpaceOf('y'))
  const [horizontal, setHorizontal] = useState(() => box.innerSpaceOf('x'))
  const [hint, setHint] = useState<string | null>(null)

  const applyHeight = (value: number) => {
    const next = box.measure(value)
    setHeight(Math.max(0, Math.round(value)))
    setHint(next.blocked === 'content' ? CONTENT_HINT : null)
    box.commitHeight(next)
  }

  const applySpace = (axis: 'x' | 'y', value: number) => {
    const space = clampInnerSpace(value)
    if (axis === 'y') setVertical(space)
    else setHorizontal(space)
    box.setInnerSpace(axis, space)
  }

  return (
    <div className={POPOVER_CLASS}>
      <label className={FIELD_CLASS}>
        <span className={FIELD_LABEL_CLASS}>Height</span>
        <input
          type="number"
          className={FIELD_INPUT_CLASS}
          value={height}
          min={0}
          step={HEIGHT_STEP_PX}
          onChange={(event) => {
            const value = numberOf(event.target.value)
            if (value !== null) applyHeight(value)
          }}
        />
      </label>
      <label className={FIELD_CLASS}>
        <span className={FIELD_LABEL_CLASS}>Inner space ↕</span>
        <input
          type="number"
          className={FIELD_INPUT_CLASS}
          value={vertical}
          min={MIN_INNER_SPACE_PX}
          max={MAX_INNER_SPACE_PX}
          step={4}
          onChange={(event) => {
            const value = numberOf(event.target.value)
            if (value !== null) applySpace('y', value)
          }}
        />
      </label>
      <label className={FIELD_CLASS}>
        <span className={FIELD_LABEL_CLASS}>Inner space ↔</span>
        <input
          type="number"
          className={FIELD_INPUT_CLASS}
          value={horizontal}
          min={MIN_INNER_SPACE_PX}
          max={MAX_INNER_SPACE_PX}
          step={4}
          onChange={(event) => {
            const value = numberOf(event.target.value)
            if (value !== null) applySpace('x', value)
          }}
        />
      </label>
      {hint ? <p className={FIELD_HINT_CLASS}>{hint}</p> : null}
    </div>
  )
}
