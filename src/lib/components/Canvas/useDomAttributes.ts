import { useEffect, type RefObject } from 'react'

const EMPTY: Record<string, string> = {}

export function useDomAttributes(
  ref: RefObject<HTMLElement | null>,
  attrs: Record<string, string> = EMPTY,
) {
  useEffect(() => {
    const element = ref.current
    if (!element) return

    const names = Object.keys(attrs)
    for (const name of names) {
      if (element.getAttribute(name) !== attrs[name]) element.setAttribute(name, attrs[name])
    }

    return () => {
      for (const name of names) element.removeAttribute(name)
    }
  }, [ref, attrs])
}
