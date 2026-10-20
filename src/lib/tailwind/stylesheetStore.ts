type Waiter = () => void

let settled = true
let waiters: Waiter[] = []

export function markStylesheetPending(): void {
  settled = false
}

export function markStylesheetSettled(): void {
  if (settled) return
  settled = true
  const pending = waiters
  waiters = []
  for (const resolve of pending) resolve()
}

export function isStylesheetSettled(): boolean {
  return settled
}

/**
 * Resolves once the canvas stylesheet covers the classes committed so far. A gesture holds
 * its inline preview until then, otherwise a freshly written arbitrary class flashes
 * unstyled while the worker compiles it.
 */
export function whenStylesheetSettled(): Promise<void> {
  if (settled) return Promise.resolve()
  return new Promise<void>((resolve) => {
    waiters.push(resolve)
  })
}
