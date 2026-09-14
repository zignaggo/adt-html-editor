import { startTransition, useDeferredValue, useEffect, useState } from 'react'
import { getClassList } from '../../tailwind/client'

const MAX_SUGGESTIONS = 40
const NO_SUGGESTIONS: string[] = []

export function suggestFor(allClasses: string[], query: string, limit = MAX_SUGGESTIONS): string[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return NO_SUGGESTIONS
  const starts: string[] = []
  const contains: string[] = []
  for (const className of allClasses) {
    if (className.startsWith(needle)) starts.push(className)
    else if (className.includes(needle)) contains.push(className)
    if (starts.length >= limit) break
  }
  return [...starts, ...contains].slice(0, limit)
}

export function useClassSuggestions(query: string, limit = MAX_SUGGESTIONS): string[] {
  const [allClasses, setAllClasses] = useState<string[]>([])
  const deferredQuery = useDeferredValue(query)

  useEffect(() => {
    let cancelled = false
    void getClassList()
      .then((classes) => {
        if (!cancelled) startTransition(() => setAllClasses(classes))
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  return suggestFor(allClasses, deferredQuery, limit)
}
