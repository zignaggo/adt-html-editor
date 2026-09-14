import type { NodeId } from '../../../core/ids'
import { isStyled } from '../../../core/model'
import type { ControlSpec } from '../../../tailwind/categories'
import { matchesTarget, stripVariants, type StyleTarget } from '../../../tailwind/variants'
import { useNode } from '../../Editor/context'
import { matchesRoot, useClassEditing } from '../useClassEditing'

export type StyleControlSpec = Pick<ControlSpec, 'roots'> & Partial<ControlSpec>

export type StyleControl = {
  value: string | null
  options: { value: string; label: string }[]
  isActive: (candidate: string) => boolean
  set: (candidate: string) => void
  toggle: (candidate: string) => void
  clear: () => void
}

export function useStyleControl(
  id: NodeId,
  control: StyleControlSpec,
  target: StyleTarget,
): StyleControl {
  const node = useNode(id)
  const editing = useClassEditing(id)

  const classes = node && isStyled(node) ? node.classes : []
  const inTarget: string[] = []
  for (const entry of classes) {
    if (matchesTarget(entry, target)) inTarget.push(stripVariants(entry))
  }

  const fromOptions = control.options
    ? (inTarget.find((entry) => control.options?.some((option) => option.value === entry)) ?? null)
    : null

  const value =
    fromOptions ??
    (control.kind === 'options' && control.options
      ? null
      : (inTarget.find((entry) => matchesRoot(entry, control.roots)) ?? null))

  return {
    value,
    options: control.options ?? [],
    isActive: (candidate) => value === candidate,
    set: (candidate) => editing.apply(candidate, target),
    toggle: (candidate) => {
      if (value === candidate) editing.removeRoots(control.roots, target)
      else editing.apply(candidate, target)
    },
    clear: () => editing.removeRoots(control.roots, target),
  }
}
