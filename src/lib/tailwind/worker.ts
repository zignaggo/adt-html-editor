import { compile, __unstable__loadDesignSystem } from 'tailwindcss'
import themeCss from 'tailwindcss/theme.css?raw'
import preflightCss from 'tailwindcss/preflight.css?raw'
import utilitiesCss from 'tailwindcss/utilities.css?raw'

export type WorkerRequest =
  | { id: number; type: 'build'; candidates: string[] }
  | { id: number; type: 'parse'; className: string }
  | { id: number; type: 'classList' }
  | { id: number; type: 'variants' }

export type ParsedCandidate = {
  valid: boolean
  root: string | null
  value: string | null
  modifier: string | null
  variants: string[]
  negative: boolean
}

export type WorkerResponse =
  | { id: number; ok: true; type: 'build'; css: string }
  | { id: number; ok: true; type: 'parse'; result: ParsedCandidate }
  | { id: number; ok: true; type: 'classList'; classes: string[] }
  | { id: number; ok: true; type: 'variants'; variants: string[] }
  | { id: number; ok: false; error: string }

const STYLESHEETS: Record<string, string> = {
  'tailwindcss/theme.css': themeCss,
  'tailwindcss/preflight.css': preflightCss,
  'tailwindcss/utilities.css': utilitiesCss,
}

const INPUT_CSS = `
@layer theme, base, components, utilities;
@import 'tailwindcss/theme.css' layer(theme);
@import 'tailwindcss/preflight.css' layer(base);
@import 'tailwindcss/utilities.css' layer(utilities);
@custom-variant dark (&:where(.adt-dark, .adt-dark *));
`

async function loadStylesheet(id: string) {
  const key = id.replace(/^\.\//, '')
  const content = STYLESHEETS[key]
  if (content === undefined) throw new Error(`não foi possível resolver ${id}`)
  return { path: key, base: '/', content }
}

const options = { base: '/', loadStylesheet }

let compilerPromise: ReturnType<typeof compile> | null = null
let designSystemPromise: ReturnType<typeof __unstable__loadDesignSystem> | null = null

function getCompiler() {
  compilerPromise ??= compile(INPUT_CSS, options)
  return compilerPromise
}

function getDesignSystem() {
  designSystemPromise ??= __unstable__loadDesignSystem(INPUT_CSS, options)
  return designSystemPromise
}

function describeValue(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null
  const entry = value as { kind?: string; value?: string; fraction?: string | null }
  if (typeof entry.value !== 'string') return null
  return entry.kind === 'arbitrary' ? `[${entry.value}]` : entry.value
}

self.addEventListener('message', async (event: MessageEvent<WorkerRequest>) => {
  const request = event.data
  try {
    if (request.type === 'build') {
      const compiler = await getCompiler()
      const css = compiler.build(request.candidates)
      post({ id: request.id, ok: true, type: 'build', css })
      return
    }

    if (request.type === 'parse') {
      const design = await getDesignSystem()
      const [candidate] = design.parseCandidate(request.className)
      if (!candidate) {
        post({
          id: request.id,
          ok: true,
          type: 'parse',
          result: { valid: false, root: null, value: null, modifier: null, variants: [], negative: false },
        })
        return
      }
      const entry = candidate as {
        root?: string
        value?: unknown
        modifier?: unknown
        variants?: { root?: string }[]
        negative?: boolean
      }
      post({
        id: request.id,
        ok: true,
        type: 'parse',
        result: {
          valid: true,
          root: entry.root ?? null,
          value: describeValue(entry.value),
          modifier: describeValue(entry.modifier),
          variants: (entry.variants ?? []).flatMap((variant) => variant.root ?? []),
          negative: Boolean(entry.negative),
        },
      })
      return
    }

    if (request.type === 'classList') {
      const design = await getDesignSystem()
      const classes: string[] = []
      for (const [name, modifiers] of design.getClassList()) {
        classes.push(name)
        for (const modifier of modifiers.modifiers ?? []) classes.push(`${name}/${modifier}`)
      }
      post({ id: request.id, ok: true, type: 'classList', classes })
      return
    }

    const design = await getDesignSystem()
    post({
      id: request.id,
      ok: true,
      type: 'variants',
      variants: design.getVariants().map((variant) => variant.name),
    })
  } catch (error) {
    post({ id: request.id, ok: false, error: error instanceof Error ? error.message : String(error) })
  }
})

function post(response: WorkerResponse) {
  self.postMessage(response)
}
