export type SessionListener<T> = (session: T | null) => void

export type SessionStore<T> = {
  current: () => T | null
  subscribe: (listener: SessionListener<T>) => () => void
  begin: (session: T) => void
  update: (patch: Partial<T>) => void
  end: () => void
}

export function createSessionStore<T extends object>(): SessionStore<T> {
  let current: T | null = null
  const listeners = new Set<SessionListener<T>>()

  const notify = () => {
    for (const listener of listeners) listener(current)
  }

  return {
    current: () => current,
    subscribe(listener) {
      listeners.add(listener)
      listener(current)
      return () => {
        listeners.delete(listener)
      }
    },
    begin(session) {
      current = session
      notify()
    },
    update(patch) {
      if (!current) return
      current = { ...current, ...patch }
      notify()
    },
    end() {
      if (!current) return
      current = null
      notify()
    },
  }
}
