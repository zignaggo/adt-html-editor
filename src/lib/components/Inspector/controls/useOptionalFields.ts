import { useState } from 'react'

export type OptionalField<TKey extends string> = {
  key: TKey
  classMatch: RegExp
}

export type OptionalFields<TKey extends string> = {
  has: (key: TKey) => boolean
  enable: (key: TKey) => void
  disable: (key: TKey) => void
  available: TKey[]
}

type Manual<TKey extends string> = { resetKey: string; enabled: ReadonlySet<TKey> }

const NONE: ReadonlySet<never> = new Set()

export function useOptionalFields<TKey extends string>(
  fields: readonly OptionalField<TKey>[],
  classes: readonly string[],
  resetKey: string,
): OptionalFields<TKey> {
  const [manual, setManual] = useState<Manual<TKey>>({ resetKey, enabled: NONE })
  let enabled = manual.enabled
  if (manual.resetKey !== resetKey) {
    enabled = NONE
    setManual({ resetKey, enabled })
  }

  const detected = new Set<TKey>()
  for (const field of fields) {
    if (classes.some((className) => field.classMatch.test(className))) detected.add(field.key)
  }

  const has = (key: TKey) => enabled.has(key) || detected.has(key)
  const available: TKey[] = []
  for (const field of fields) if (!has(field.key)) available.push(field.key)

  return {
    has,
    enable: (key) =>
      setManual((current) =>
        current.enabled.has(key) ? current : { resetKey, enabled: new Set([...current.enabled, key]) },
      ),
    disable: (key) =>
      setManual((current) => {
        if (!current.enabled.has(key)) return current
        const next = new Set(current.enabled)
        next.delete(key)
        return { resetKey, enabled: next }
      }),
    available,
  }
}
