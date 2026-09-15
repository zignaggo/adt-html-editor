import { useEffect, useEffectEvent, useState } from 'react'
import type { NodeId } from '../core/ids'
import { useEditorContext } from '../components/Editor/context'

export function useMeasured<T>(
  id: NodeId,
  measure: (element: HTMLElement, root: HTMLElement) => T,
  equals: (a: T, b: T) => boolean,
): T | null {
  const { canvasRootRef } = useEditorContext()
  const [measured, setMeasured] = useState<T | null>(null)

  const readValue = useEffectEvent((element: HTMLElement, root: HTMLElement) =>
    measure(element, root),
  )
  const isSame = useEffectEvent((a: T, b: T) => equals(a, b))

  useEffect(() => {
    const root = canvasRootRef.current
    if (!root) return
    let frame = 0
    let latest: T | null = null

    const run = () => {
      frame = 0
      const element = root.querySelector<HTMLElement>(`[data-adt-id="${id}"]`)
      if (!element) {
        latest = null
        setMeasured(null)
        return
      }
      const next = readValue(element, root)
      if (latest !== null && isSame(latest, next)) return
      latest = next
      setMeasured(next)
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(run)
    }

    const mutations = new MutationObserver(schedule)
    mutations.observe(root, { attributes: true, childList: true, subtree: true, characterData: true })
    const resize = new ResizeObserver(schedule)
    resize.observe(root)
    run()

    return () => {
      cancelAnimationFrame(frame)
      mutations.disconnect()
      resize.disconnect()
    }
  }, [id, canvasRootRef])

  return measured
}
