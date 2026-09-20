import type { NodeId } from './ids'
import type { EditorDocument } from './model'

export type Snapshot = {
  doc: EditorDocument
  selectedIds: readonly NodeId[]
}

export type HistoryEntry = {
  snapshot: Snapshot
  coalesceKey: string | null
  at: number
}

export type History = {
  past: HistoryEntry[]
  future: HistoryEntry[]
}

export const HISTORY_LIMIT = 100
export const COALESCE_WINDOW_MS = 600

const NO_ENTRIES: HistoryEntry[] = []

export function emptyHistory(): History {
  return { past: NO_ENTRIES, future: NO_ENTRIES }
}

export function canCoalesce(
  history: History,
  coalesceKey: string | null,
  now: number,
): boolean {
  if (coalesceKey === null) return false
  const top = history.past[history.past.length - 1]
  if (!top || top.coalesceKey !== coalesceKey) return false
  return now - top.at <= COALESCE_WINDOW_MS
}

export function pushSnapshot(
  history: History,
  snapshot: Snapshot,
  coalesceKey: string | null = null,
  now: number = Date.now(),
): History {
  if (canCoalesce(history, coalesceKey, now)) {
    const past = history.past.slice()
    const last = past.length - 1
    past[last] = { ...past[last], at: now }
    return { past, future: NO_ENTRIES }
  }

  const entry: HistoryEntry = { snapshot, coalesceKey, at: now }
  const past =
    history.past.length >= HISTORY_LIMIT
      ? [...history.past.slice(history.past.length - HISTORY_LIMIT + 1), entry]
      : [...history.past, entry]

  return { past, future: NO_ENTRIES }
}

export function popPast(history: History, current: Snapshot, now: number = Date.now()) {
  const previous = history.past[history.past.length - 1]
  if (!previous) return null
  return {
    snapshot: previous.snapshot,
    history: {
      past: history.past.slice(0, -1),
      future: [...history.future, { snapshot: current, coalesceKey: null, at: now }],
    } satisfies History,
  }
}

export function popFuture(history: History, current: Snapshot, now: number = Date.now()) {
  const next = history.future[history.future.length - 1]
  if (!next) return null
  return {
    snapshot: next.snapshot,
    history: {
      past: [...history.past, { snapshot: current, coalesceKey: null, at: now }],
      future: history.future.slice(0, -1),
    } satisfies History,
  }
}
