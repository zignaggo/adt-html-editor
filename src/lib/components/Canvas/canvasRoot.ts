import { Store } from '@tanstack/store'

export type CanvasRootHandle = {
  store: Store<HTMLElement | null>
  ref: { current: HTMLElement | null }
}

export function createCanvasRoot(): CanvasRootHandle {
  const store = new Store<HTMLElement | null>(null)
  return {
    store,
    ref: {
      get current(): HTMLElement | null {
        return store.state
      },
      set current(element: HTMLElement | null) {
        if (store.state !== element) store.setState(() => element)
      },
    },
  }
}
