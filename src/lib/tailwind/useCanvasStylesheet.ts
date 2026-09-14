import { useEffect, useRef, useState } from 'react'
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

function isSuperset(set: ReadonlySet<string>, subset: ReadonlySet<string>): boolean {
  if (subset.size > set.size) return false
  for (const entry of subset) if (!set.has(entry)) return false
  return true
}

/**
 * Keeps the canvas stylesheet in sync with the classes used in the document.
 *
 * Returns `false` while the current document has no generated CSS yet — on mount and
 * whenever the whole document is replaced (`value`/`setHtml`). Incremental additions
 * (dropping an element, a new class) do not go back to the pending state.
 */
export function useCanvasStylesheet(): boolean {
  const store = useEditorStoreApi()
  const builtRef = useRef<ReadonlySet<string> | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const style = ensureStyleElement()
    let disposed = false
    let inFlight = false
    let queued = false

    const build = (classes: ReadonlySet<string>) =>
      buildCss(Array.from(classes)).then(
        (css) => {
          if (disposed) return
          builtRef.current = classes
          style.textContent = scopeCss(css)
        },
        () => {
          if (disposed) return
          builtRef.current = classes
          style.textContent = ''
        },
      )

    const run = (): void => {
      if (disposed) return
      if (inFlight) {
        queued = true
        return
      }

      const used = store.state.usedClasses
      if (used === builtRef.current) {
        setReady(true)
        return
      }

      inFlight = true
      void build(used).finally(() => {
        inFlight = false
        if (disposed) return
        if (queued) {
          queued = false
          run()
          return
        }
        setReady(true)
      })
    }

    run()

    let previousUsed = store.state.usedClasses
    const subscription = store.subscribe((state) => {
      if (state.usedClasses === previousUsed) return
      const previous = previousUsed
      previousUsed = state.usedClasses
      // Whole document replaced: the previous set does not survive → hide until styled.
      if (!isSuperset(state.usedClasses, previous)) setReady(false)
      run()
    })

    return () => {
      disposed = true
      subscription.unsubscribe()
    }
  }, [store])

  return ready
}
