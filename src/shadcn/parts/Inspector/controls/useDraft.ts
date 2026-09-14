import { useEffect, useRef, useState, type KeyboardEvent } from 'react'

export const COMMIT_DEBOUNCE_MS = 200

export type DraftOptions = {
  value: string
  commit: (raw: string) => void
  delay?: number
}

export type Draft = {
  shown: string
  editing: boolean
  onFocus: () => void
  onBlur: () => void
  onChange: (raw: string) => void
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
}

export function useDraft({ value, commit, delay = COMMIT_DEBOUNCE_MS }: DraftOptions): Draft {
  const [draft, setDraft] = useState<string | null>(null)
  const draftRef = useRef<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )

  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }

  const update = (next: string | null) => {
    draftRef.current = next
    setDraft(next)
  }

  return {
    shown: draft ?? value,
    editing: draft !== null,
    onFocus: () => update(value),
    onBlur: () => {
      const raw = draftRef.current
      clearTimer()
      if (raw !== null) commit(raw)
      update(null)
    },
    onChange: (raw) => {
      update(raw)
      clearTimer()
      timer.current = setTimeout(() => {
        timer.current = null
        commit(raw)
      }, delay)
    },
    onKeyDown: (event) => {
      if (event.key === 'Enter') {
        event.preventDefault()
        event.currentTarget.blur()
      } else if (event.key === 'Escape') {
        event.preventDefault()
        clearTimer()
        update(null)
        event.currentTarget.blur()
      }
    },
  }
}
