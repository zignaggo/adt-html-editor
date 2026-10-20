import { useEffect, useRef, useState } from 'react'
import { useEditorStoreApi } from '../../components/Editor/context'
import { beginCanvasGesture, type CanvasGestureSpec } from './canvasGesture'

export type CanvasGestureStarter = <TState>(
  event: PointerEvent,
  spec: CanvasGestureSpec<TState>,
) => boolean

export function useCanvasGesture(): CanvasGestureStarter {
  const store = useEditorStoreApi()
  const abortRef = useRef<(() => void) | null>(null)

  const [start] = useState<CanvasGestureStarter>(() => {
    const starter: CanvasGestureStarter = (event, spec) => {
      abortRef.current?.()
      const abort = beginCanvasGesture(event, {
        ...spec,
        onEnd: (session, committed) => {
          abortRef.current = null
          spec.onEnd?.(session, committed)
        },
      })
      abortRef.current = abort
      return abort !== null
    }
    return starter
  })

  useEffect(() => {
    let rootId = store.state.doc.rootId
    let locked = store.state.locked
    const subscription = store.subscribe((state) => {
      if (state.doc.rootId === rootId && state.locked === locked) return
      rootId = state.doc.rootId
      locked = state.locked
      abortRef.current?.()
    })
    return () => {
      subscription.unsubscribe()
      abortRef.current?.()
    }
  }, [store])

  return start
}
