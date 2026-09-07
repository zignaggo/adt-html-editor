import type { NodeId } from '../../../core/ids'
import { isStyled } from '../../../core/model'
import { stripVariants, variantOf, type ControlSpec, type VariantId } from '../../../tailwind/categories'
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
  variant: VariantId,
): StyleControl {
  const node = useNode(id)
  const editing = useClassEditing(id)

  const classes = node && isStyled(node) ? node.classes : []
  const inVariant: string[] = []
  for (const entry of classes) {
    if (variantOf(entry) === variant) inVariant.push(stripVariants(entry))
  }

  const fromOptions = control.options
    ? (inVariant.find((entry) => control.options?.some((option) => option.value === entry)) ?? null)
    : null

  const value =
    fromOptions ??
    (control.kind === 'options' && control.options
      ? null
      : (inVariant.find((entry) => matchesRoot(entry, control.roots)) ?? null))

  return {
    value,
    options: control.options ?? [],
    isActive: (candidate) => value === candidate,
    set: (candidate) => editing.apply(candidate, variant),
    toggle: (candidate) => {
      if (value === candidate) editing.removeRoots(control.roots, variant)
      else editing.apply(candidate, variant)
    },
    clear: () => editing.removeRoots(control.roots, variant),
  }
}
