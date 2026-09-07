import type { ParsedCandidate, WorkerRequest, WorkerResponse } from './worker'

type RequestPayload = WorkerRequest extends infer T ? (T extends { id: number } ? Omit<T, 'id'> : never) : never

type Pending = {
  resolve: (value: WorkerResponse) => void
  reject: (error: Error) => void
}

let worker: Worker | null = null
let nextRequestId = 0
const pending = new Map<number, Pending>()

const parseCache = new Map<string, ParsedCandidate>()
let classListPromise: Promise<string[]> | null = null
let variantsPromise: Promise<string[]> | null = null

function getWorker(): Worker {
  if (worker) return worker
  worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
  worker.addEventListener('message', (event: MessageEvent<WorkerResponse>) => {
    const entry = pending.get(event.data.id)
    if (!entry) return
    pending.delete(event.data.id)
    if (event.data.ok) entry.resolve(event.data)
    else entry.reject(new Error(event.data.error))
  })
  worker.addEventListener('error', (event) => {
    for (const entry of pending.values()) entry.reject(new Error(event.message))
    pending.clear()
  })
  return worker
}

function request(payload: RequestPayload): Promise<WorkerResponse> {
  const id = (nextRequestId += 1)
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    getWorker().postMessage({ ...payload, id } as WorkerRequest)
  })
}

export async function buildCss(candidates: string[]): Promise<string> {
  const response = await request({ type: 'build', candidates })
  return response.ok && response.type === 'build' ? response.css : ''
}

export async function parseClassName(className: string): Promise<ParsedCandidate> {
  const cached = parseCache.get(className)
  if (cached) return cached
  const response = await request({ type: 'parse', className })
  const result: ParsedCandidate =
    response.ok && response.type === 'parse'
      ? response.result
      : { valid: false, root: null, value: null, modifier: null, variants: [], negative: false }
  parseCache.set(className, result)
  return result
}

export function getClassList(): Promise<string[]> {
  classListPromise ??= request({ type: 'classList' }).then((response) =>
    response.ok && response.type === 'classList' ? response.classes : [],
  )
  return classListPromise
}

export function getVariantList(): Promise<string[]> {
  variantsPromise ??= request({ type: 'variants' }).then((response) =>
    response.ok && response.type === 'variants' ? response.variants : [],
  )
  return variantsPromise
}

export function warmTailwind() {
  getWorker()
}
