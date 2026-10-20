import { FlowIcon } from '../flowIcons'
import { REPOSITION_BUTTON_CLASS } from '../flowStyles'
import type { FlowTarget } from '../useFlowSelection'
import type { ComponentBlock } from './componentLayout'
import { setRepositionHighlight } from './repositionStore'
import { useReposition } from './useReposition'

const BLOCK_HINTS: Record<ComponentBlock, string> = {
  'unsupported-tag': 'This element is not a piece that can be repositioned.',
  'phrase-ancestor': 'It sits inside a sentence.',
  'list-ancestor': 'It sits inside a list.',
  transformed: 'A parent is transformed.',
  'vertical-writing': 'The writing runs vertically here.',
  table: 'The table decides where this sits.',
  contents: 'This element has no box of its own.',
  placed: 'CSS places this element explicitly.',
  'reversed-parent': 'The parent reverses the order of its children.',
}

/**
 * Dragging the button repositions the whole piece; clicking it arms the mode, so a drag on
 * the piece itself repositions instead of aligning.
 */
export function RepositionControl({ target }: { target: FlowTarget }) {
  const reposition = useReposition(target)
  if (!reposition) return null

  const blocked = reposition.blocked
  const label = blocked
    ? `Reposition is not available: ${BLOCK_HINTS[blocked]}`
    : reposition.armed
      ? 'Stop repositioning'
      : 'Reposition'

  return (
    <button
      type="button"
      className={REPOSITION_BUTTON_CLASS}
      aria-label={label}
      title={label}
      aria-pressed={reposition.armed}
      disabled={blocked !== null}
      draggable={false}
      onPointerDown={(event) => {
        if (event.button !== 0) return
        reposition.start(event.nativeEvent)
      }}
      onClick={reposition.toggle}
      onPointerEnter={() => setRepositionHighlight(true)}
      onPointerLeave={() => setRepositionHighlight(false)}
      onFocus={() => setRepositionHighlight(true)}
      onBlur={() => setRepositionHighlight(false)}
    >
      <FlowIcon name="reposition" />
    </button>
  )
}
