import { useBreakpoint } from '../../components/Editor/context'
import { breakpointOf } from '../../tailwind/variants'
import { STATUS_CHIP_CLASS, STATUS_CLASS, STATUS_HINT_CLASS } from '../flowStyles'
import type { GroupBlock } from './groupMembers'
import { useFlowGroup } from './useFlowGroup'

const HINTS: Record<GroupBlock, string> = {
  'single-selection': 'Shift-click another block to lay these out together.',
  'nested-selection': 'One of these blocks holds another, so they cannot be laid out together.',
  'mixed-parents': 'These blocks sit in different containers, so there is no row to build.',
  'not-contiguous': 'Another block sits between these two — pick neighbours.',
  'not-a-container': 'What holds these blocks places them itself, so a layout here would not stick.',
  locked: 'Something in this group is locked.',
}

const READY_HINT =
  'Lay these out as a row, side by side, one below another, or wrap the text around the object.'

export function FlowGroupStatus() {
  const group = useFlowGroup()
  const breakpoint = useBreakpoint()

  if (!group) return null

  const parent = group.parent
  const inside = parent && !parent.hasAttribute('data-adt-canvas') ? parent.tagName.toLowerCase() : null

  return (
    <div className={STATUS_CLASS}>
      <span>{group.members.length} blocks</span>
      {inside ? <span>Inside &lt;{inside}&gt;</span> : null}
      <span className={STATUS_CHIP_CLASS}>{breakpointOf(breakpoint).label}</span>
      <span className={STATUS_HINT_CLASS}>
        {group.can === true ? READY_HINT : HINTS[group.can]}
      </span>
    </div>
  )
}
