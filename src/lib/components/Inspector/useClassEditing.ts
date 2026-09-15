import { cn } from 'cn'
import type { NodeId } from '../../core/ids'
import { isStyled } from '../../core/model'
import { matchesTarget, stripVariants, withTarget, type StyleTarget } from '../../tailwind/variants'
import { useEditor, useEditorStoreApi } from '../Editor/context'

export type ClassEditing = ReturnType<typeof useClassEditing>

export function useClassEditing(id: NodeId) {
  const store = useEditorStoreApi()
  const { setClasses } = useEditor()

  return buildClassEditing(id, store, setClasses)
}

function buildClassEditing(
  id: NodeId,
  store: ReturnType<typeof useEditorStoreApi>,
  setClasses: (id: NodeId, classes: string[]) => void,
) {
  const currentClasses = (): string[] => {
    const node = store.state.doc.nodes[id]
    return node && isStyled(node) ? node.classes : []
  }

  return {
    currentClasses,

    classesForTarget(target: StyleTarget): string[] {
      return currentClasses().filter((entry) => matchesTarget(entry, target))
    },

    apply(className: string, target: StyleTarget) {
      const trimmed = className.trim()
      if (!trimmed) return
      const next = trimmed.includes(':') ? trimmed : withTarget(trimmed, target)
      const merged = cn(currentClasses().join(' '), next)
      setClasses(id, merged.split(/\s+/).filter(Boolean))
    },

    applyRaw(className: string) {
      const trimmed = className.trim()
      if (!trimmed) return
      const merged = cn(currentClasses().join(' '), trimmed)
      setClasses(id, merged.split(/\s+/).filter(Boolean))
    },

    remove(className: string) {
      setClasses(
        id,
        currentClasses().filter((entry) => entry !== className),
      )
    },

    removeRoots(roots: string[], target: StyleTarget) {
      setClasses(
        id,
        currentClasses().filter((entry) => {
          if (!matchesTarget(entry, target)) return true
          return !matchesRoot(stripVariants(entry), roots)
        }),
      )
    },

    valueForRoots(roots: string[], target: StyleTarget): string | null {
      const match = currentClasses().find(
        (entry) => matchesTarget(entry, target) && matchesRoot(stripVariants(entry), roots),
      )
      return match ? stripVariants(match) : null
    },

    reorder(from: number, to: number) {
      const classes = currentClasses()
      if (from === to || from < 0 || from >= classes.length) return
      const next = [...classes]
      const [moved] = next.splice(from, 1)
      next.splice(Math.max(0, Math.min(to, next.length)), 0, moved)
      setClasses(id, next)
    },
  }
}

export function matchesRoot(className: string, roots: string[]): boolean {
  for (const root of roots) {
    if (className === root) return true
    if (className.startsWith(`${root}-`)) return true
    if (className.startsWith(`-${root}-`)) return true
  }
  return false
}
