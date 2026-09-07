import { useEffect, useRef } from 'react'
import { useEditorStoreApi } from '../components/Editor/context'
import { buildCss } from './client'
import { scopeCss } from './scopeCss'

const STYLE_ATTRIBUTE = 'data-adt-canvas-style'

function ensureStyleElement(): HTMLStyleElement {
  const existing = document.head.querySelector<HTMLStyleElement>(`style[${STYLE_ATTRIBUTE}]`)
  if (existing) return existing
  const element = document.createElement('style')
  element.setAttribute(STYLE_ATTRIBUTE, '')
  document.head.appendChild(element)
  return element
}

export function useCanvasStylesheet() {
  const store = useEditorStoreApi()
  const builtCountRef = useRef(-1)

  useEffect(() => {
    const style = ensureStyleElement()
    let disposed = false
    let inFlight = false
    let queued = false

    const build = (classes: string[], count: number) =>
      buildCss(classes).then(
        (css) => {
          if (disposed) return
          builtCountRef.current = count
          style.textContent = scopeCss(css)
        },
        () => {
          if (!disposed) style.textContent = ''
        },
      )

    const run = (): void => {
      if (disposed) return
      if (inFlight) {
        queued = true
        return
      }

      const used = store.getState().usedClasses
      if (used.size === builtCountRef.current) return

      inFlight = true
      void build(Array.from(used), used.size).finally(() => {
        inFlight = false
        if (queued && !disposed) {
          queued = false
          run()
        }
      })
    }

    run()

    const unsubscribe = store.subscribe((state, previous) => {
      if (state.usedClasses === previous.usedClasses) return
      run()
    })

    return () => {
      disposed = true
      unsubscribe()
    }
  }, [store])
}
