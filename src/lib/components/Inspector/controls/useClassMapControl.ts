import type { NodeId } from '../../../core/ids'
import { isStyled } from '../../../core/model'
import {
  classesAt,
  clearClassMapValue,
  resolveClassMapAt,
  writeClassMapValue,
} from '../../../style/classMapWrite'
import type { ClassMap } from '../../../tailwind/classMaps/types'
import {
  BASE_TARGET,
  cascadeOf,
  sameTarget,
  type StyleTarget,
} from '../../../tailwind/variants'
import { useEditor, useNode } from '../../Editor/context'

export type ClassMapOverride = {
  target: StyleTarget
  classes: string[]
  fallbackTarget: StyleTarget
  fallbackClasses: string[]
  reset: () => void
}

export type ClassMapControl<TValue> = {
  value: TValue
  isExplicit: boolean
  override: ClassMapOverride | null
  setValue: (next: TValue) => void
  reset: () => void
}

const EMPTY: readonly string[] = []

export function useClassMapControl<TValue>(
  id: NodeId,
  classMap: ClassMap<TValue>,
  defaultValue: TValue,
  target: StyleTarget,
): ClassMapControl<TValue> {
  const node = useNode(id)
  const { setClasses } = useEditor()
  const classes = node && isStyled(node) ? node.classes : EMPTY

  const cascade = cascadeOf(target)
  const resolved = resolveClassMapAt(classes, cascade, classMap)
  const isBase = sameTarget(target, BASE_TARGET)

  const reset = () => {
    if (isBase) return
    setClasses(id, clearClassMapValue(classes, classMap, target))
  }

  const setValue = (next: TValue) => {
    setClasses(id, writeClassMapValue(classes, classMap, next, target, defaultValue))
  }

  let override: ClassMapOverride | null = null
  if (!isBase) {
    const current = classesAt(classes, target, classMap.matches)
    if (current.length > 0) {
      let fallbackTarget: StyleTarget = BASE_TARGET
      let fallbackClasses: string[] = []
      for (const candidate of cascade.slice(1)) {
        const matched = classesAt(classes, candidate, classMap.matches)
        if (matched.length > 0) {
          fallbackTarget = candidate
          fallbackClasses = matched
          break
        }
      }
      override = { target, classes: current, fallbackTarget, fallbackClasses, reset }
    }
  }

  return {
    value: resolved ?? defaultValue,
    isExplicit: resolved !== null,
    override,
    setValue,
    reset,
  }
}
