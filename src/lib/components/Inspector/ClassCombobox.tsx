import { startTransition, useDeferredValue, useEffect, useRef, useState } from 'react'
import type { NodeId } from '../../core/ids'
import { getClassList } from '../../tailwind/client'
import type { VariantId } from '../../tailwind/categories'
import { useClassEditing } from './useClassEditing'
import styles from './InspectorPanel.module.css'

const MAX_SUGGESTIONS = 40

const NO_SUGGESTIONS: string[] = []

function suggestFor(allClasses: string[], query: string): string[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return NO_SUGGESTIONS
  const starts: string[] = []
  const contains: string[] = []
  for (const className of allClasses) {
    if (className.startsWith(needle)) starts.push(className)
    else if (className.includes(needle)) contains.push(className)
    if (starts.length >= MAX_SUGGESTIONS) break
  }
  return [...starts, ...contains].slice(0, MAX_SUGGESTIONS)
}

export type ClassComboboxProps = {
  id: NodeId
  variant: VariantId
  placeholder?: string
}

export function ClassCombobox({ id, variant, placeholder = 'Adicionar classe…' }: ClassComboboxProps) {
  const editing = useClassEditing(id)
  const [query, setQuery] = useState('')
  const [allClasses, setAllClasses] = useState<string[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const deferredQuery = useDeferredValue(query)

  useEffect(() => {
    let cancelled = false
    void getClassList().then((classes) => {
      if (!cancelled) startTransition(() => setAllClasses(classes))
    })
    return () => {
      cancelled = true
    }
  }, [])

  const suggestions = suggestFor(allClasses, deferredQuery)

  const commit = (className: string) => {
    startTransition(() => editing.apply(className, variant))
    setQuery('')
    setIsOpen(false)
    setActiveIndex(0)
    inputRef.current?.focus()
  }

  return (
    <div className={styles.combobox}>
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={isOpen && suggestions.length > 0}
        aria-controls="adt-class-suggestions"
        aria-autocomplete="list"
        aria-label="Adicionar classe"
        placeholder={placeholder}
        className={styles.input}
        value={query}
        spellCheck={false}
        autoComplete="off"
        onChange={(event) => {
          setQuery(event.target.value)
          setIsOpen(true)
          setActiveIndex(0)
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => window.setTimeout(() => setIsOpen(false), 120)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            setActiveIndex((index) => Math.min(index + 1, suggestions.length - 1))
            return
          }
          if (event.key === 'ArrowUp') {
            event.preventDefault()
            setActiveIndex((index) => Math.max(index - 1, 0))
            return
          }
          if (event.key === 'Escape') {
            setIsOpen(false)
            return
          }
          if (event.key === 'Enter') {
            event.preventDefault()
            const picked = isOpen && suggestions[activeIndex] ? suggestions[activeIndex] : query
            commit(picked)
          }
        }}
      />

      {isOpen && suggestions.length > 0 ? (
        <ul id="adt-class-suggestions" role="listbox" className={styles.suggestions}>
          {suggestions.map((className, index) => (
            <li key={className}>
              <button
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                className={styles.suggestion}
                data-active={index === activeIndex || undefined}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => commit(className)}
              >
                {className}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
