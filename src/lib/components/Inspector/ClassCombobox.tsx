import { startTransition, useRef, useState } from 'react'
import type { NodeId } from '../../core/ids'
import type { StyleTarget } from '../../tailwind/variants'
import { useClassEditing } from './useClassEditing'
import { useClassSuggestions } from './useClassSuggestions'
import {
  COMBOBOX_CLASS,
  INPUT_CLASS,
  SUGGESTIONS_CLASS,
  SUGGESTION_CLASS,
} from './inspectorStyles'

export type ClassComboboxProps = {
  id: NodeId
  target: StyleTarget
  placeholder?: string
}

export function ClassCombobox({ id, target, placeholder = 'Add class…' }: ClassComboboxProps) {
  const editing = useClassEditing(id)
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const suggestions = useClassSuggestions(query)

  const commit = (className: string) => {
    startTransition(() => editing.apply(className, target))
    setQuery('')
    setIsOpen(false)
    setActiveIndex(0)
    inputRef.current?.focus()
  }

  return (
    <div className={COMBOBOX_CLASS}>
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={isOpen && suggestions.length > 0}
        aria-controls="adt-class-suggestions"
        aria-autocomplete="list"
        aria-label="Add class"
        placeholder={placeholder}
        className={INPUT_CLASS}
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
        <ul id="adt-class-suggestions" role="listbox" className={SUGGESTIONS_CLASS}>
          {suggestions.map((className, index) => (
            <li key={className}>
              <button
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                className={SUGGESTION_CLASS}
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
