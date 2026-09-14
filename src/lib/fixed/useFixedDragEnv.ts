import { useEffect, useRef, useState } from 'react'
import { useCanvasContext } from '../components/Canvas/context'
import { useEditorContext, useFixedLayout } from '../components/Editor/context'
import type { FixedDragEnv } from './fixedDrag'
import { outlineStrategy } from './ghost/strategy'

export function useFixedDragEnv(): () => FixedDragEnv {
  const { store, canvasRootRef } = useEditorContext()
  const fixed = useFixedLayout()
  const { ghostRef, ghostLayerRef } = useCanvasContext()
  const latest = useRef<FixedDragEnv | null>(null)

  useEffect(() => {
    latest.current = {
      store,
      pageElement: canvasRootRef.current,
      page: fixed.page,
      pageContainerId: fixed.pageContainerId,
      precision: fixed.precision,
      snapThreshold: fixed.snapThreshold,
      keepStacking: fixed.keepStacking,
      ghost: ghostRef.current ?? outlineStrategy,
      layer: ghostLayerRef.current,
    }
  })

  const [getEnv] = useState(
    () => (): FixedDragEnv => {
      const env = latest.current
      if (!env) throw new Error('fixed drag environment read before mount')
      return {
        ...env,
        pageElement: canvasRootRef.current,
        ghost: ghostRef.current ?? outlineStrategy,
        layer: ghostLayerRef.current,
      }
    },
  )

  return getEnv
}
