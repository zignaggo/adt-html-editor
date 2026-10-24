import { useState } from 'react'
import { useEditorContext } from '../Editor/context'
import { subscribeCanvasViewport } from './viewport'

export type CanvasHost = {
  root: () => HTMLElement | null
  host: () => HTMLElement | null
  scale: () => number
  subscribe: (listener: () => void) => () => void
}

/**
 * Non-reactive access to the canvas surface for overlays that measure in a frame loop
 * instead of re-rendering: the page root, the scrolling host and the applied zoom scale.
 */
export function useCanvasHost(): CanvasHost {
  const { canvasRootRef } = useEditorContext()

  const [host] = useState<CanvasHost>(() => ({
    root: () => canvasRootRef.current,

    host: () => canvasRootRef.current?.closest<HTMLElement>('[data-adt-canvas-scroll]') ?? null,

    scale: () => {
      const root = canvasRootRef.current
      if (!root?.offsetWidth) return 1
      const scale = root.getBoundingClientRect().width / root.offsetWidth
      return Number.isFinite(scale) && scale > 0 ? scale : 1
    },

    subscribe: (listener) => {
      const observer = new ResizeObserver(listener)
      let observed: HTMLElement | null = null
      const observeRoot = () => {
        const root = canvasRootRef.current
        if (root === observed) return
        observer.disconnect()
        observed = root
        if (root) observer.observe(root)
      }
      const onChange = () => {
        observeRoot()
        listener()
      }
      observeRoot()
      const unsubscribeViewport = subscribeCanvasViewport(onChange)
      window.addEventListener('scroll', onChange, { capture: true, passive: true })
      window.addEventListener('resize', onChange)
      return () => {
        unsubscribeViewport()
        observer.disconnect()
        window.removeEventListener('scroll', onChange, { capture: true })
        window.removeEventListener('resize', onChange)
      }
    },
  }))

  return host
}
