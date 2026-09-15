import type { NodeId } from '../../core/ids'
import { isStyled } from '../../core/model'
import { matchesTarget, stripVariants, type StyleTarget } from '../../tailwind/variants'
import { useNode } from '../Editor/context'
import { useClassEditing } from './useClassEditing'
import {
  CHIPS_CLASS,
  CHIP_ACTIONS_CLASS,
  CHIP_BUTTON_CLASS,
  CHIP_CLASS,
  CHIP_LABEL_CLASS,
  HINT_CLASS,
} from './inspectorStyles'

export type ClassChipsProps = {
  id: NodeId
  target: StyleTarget
}

export function ClassChips({ id, target }: ClassChipsProps) {
  const node = useNode(id)
  const editing = useClassEditing(id)

  if (!node || !isStyled(node)) return null

  const visible: { className: string; index: number }[] = []
  for (let index = 0; index < node.classes.length; index += 1) {
    const className = node.classes[index]
    if (matchesTarget(className, target)) visible.push({ className, index })
  }

  if (visible.length === 0) {
    return <p className={HINT_CLASS}>No classes for this target.</p>
  }

  return (
    <ul className={CHIPS_CLASS}>
      {visible.map(({ className, index }) => (
        <li key={className} className={CHIP_CLASS}>
          <span className={CHIP_LABEL_CLASS}>{stripVariants(className)}</span>
          <span className={CHIP_ACTIONS_CLASS}>
            <button
              type="button"
              className={CHIP_BUTTON_CLASS}
              aria-label={`Move ${className} up`}
              disabled={index === 0}
              onClick={() => editing.reorder(index, index - 1)}
            >
              ↑
            </button>
            <button
              type="button"
              className={CHIP_BUTTON_CLASS}
              aria-label={`Move ${className} down`}
              disabled={index === node.classes.length - 1}
              onClick={() => editing.reorder(index, index + 1)}
            >
              ↓
            </button>
            <button
              type="button"
              className={CHIP_BUTTON_CLASS}
              data-danger=""
              aria-label={`Remove ${className}`}
              onClick={() => editing.remove(className)}
            >
              ×
            </button>
          </span>
        </li>
      ))}
    </ul>
  )
}
