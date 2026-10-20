import { useEffect, useRef } from 'react'
import { useBreakpoint, useDirectControls, useLayoutMode } from '../components/Editor/context'
import { breakpointOf } from '../tailwind/variants'
import { blockReasonOf, FLOW_CAPABILITIES, type BlockReason } from './capabilities'
import { STATUS_CHIP_CLASS, STATUS_CLASS, STATUS_HINT_CLASS } from './flowStyles'
import { subscribeFlowGesture } from './gesture/flowGestureStore'
import { useFlowSelection, type FlowTarget } from './useFlowSelection'

const HINTS: Record<BlockReason, string> = {
  constrained: 'This element sits outside the normal flow, so dragging it here would not stick.',
  'grid-child': 'The grid places this cell — edit the grid to change where it sits.',
  inline: 'Inline elements follow the text around them.',
  'positioned-descendant':
    'Something inside is positioned by hand, and resizing would pull it out of place.',
  'row-child': 'The row sizes this item — edit the row to change it.',
  table: 'The table sizes this cell.',
  transformed: 'A parent is transformed, so sizes here would not follow the pointer.',
  'unordered-siblings': 'CSS reorders these siblings, so dragging would not match the result.',
}

const READY_HINT = 'Drag to align or reorder, the corners to resize, the amber handle for space.'

function hintFor(target: FlowTarget): string {
  for (const capability of FLOW_CAPABILITIES) {
    const reason = blockReasonOf(target.inspection, capability)
    if (reason !== null) return HINTS[reason]
  }
  return READY_HINT
}

export function FlowStatusBar() {
  const layout = useLayoutMode()
  const direct = useDirectControls()
  if (layout !== 'flow' || !direct) return null
  return <FlowStatus />
}

function FlowStatus() {
  const target = useFlowSelection()
  const breakpoint = useBreakpoint()
  const feedbackRef = useRef<HTMLSpanElement | null>(null)

  useEffect(
    () =>
      subscribeFlowGesture((session) => {
        const feedback = feedbackRef.current
        if (feedback) feedback.textContent = session?.feedback ?? ''
      }),
    [],
  )

  if (!target) return null

  const parent = target.element.parentElement
  const inside = parent && !parent.hasAttribute('data-adt-canvas') ? parent.tagName.toLowerCase() : null

  return (
    <div className={STATUS_CLASS}>
      {inside ? <span>Inside &lt;{inside}&gt;</span> : null}
      <span className={STATUS_CHIP_CLASS}>{breakpointOf(breakpoint).label}</span>
      <span className={STATUS_HINT_CLASS}>{hintFor(target)}</span>
      <span ref={feedbackRef} className="font-mono text-foreground" role="status" aria-live="polite" />
    </div>
  )
}
