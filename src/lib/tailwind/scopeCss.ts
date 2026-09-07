export const CANVAS_SCOPE = '.adt-canvas'
export const CONTAINER_NAME = 'adt-canvas'

const WIDTH_CONDITION = /\b(?:min-width|max-width|width)\b/
const FEATURE_CONDITION =
  /\b(?:hover|any-hover|pointer|any-pointer|prefers-[a-z-]+|display-mode|orientation|resolution|color|color-gamut|monochrome|scripting|forced-colors|inverted-colors|dynamic-range|aspect-ratio|device-width|device-height|update|overflow-block|overflow-inline|scan|grid|height|min-height|max-height)\b/

const VERBATIM_AT_RULES: ReadonlySet<string> = new Set(['keyframes', 'font-face', 'property', 'counter-style', 'font-palette-values'])

export type Chunk =
  | { kind: 'raw'; text: string }
  | { kind: 'block'; prelude: string; body: string }

export function isWidthOnlyQuery(params: string): boolean {
  if (!WIDTH_CONDITION.test(params)) return false
  return !FEATURE_CONDITION.test(params)
}

export function chunkCss(css: string): Chunk[] {
  const out: Chunk[] = []
  let buffer = ''
  let quote: string | null = null
  let index = 0

  while (index < css.length) {
    const char = css[index]

    if (quote) {
      buffer += char
      if (char === quote && css[index - 1] !== '\\') quote = null
      index += 1
      continue
    }

    if (char === '"' || char === "'") {
      quote = char
      buffer += char
      index += 1
      continue
    }

    if (char === '/' && css[index + 1] === '*') {
      const end = css.indexOf('*/', index + 2)
      const stop = end === -1 ? css.length : end + 2
      buffer += css.slice(index, stop)
      index = stop
      continue
    }

    if (char === ';') {
      buffer += char
      out.push({ kind: 'raw', text: buffer })
      buffer = ''
      index += 1
      continue
    }

    if (char === '{') {
      const prelude = buffer.trim()
      const leading = buffer.slice(0, buffer.length - buffer.trimStart().length)
      if (leading) out.push({ kind: 'raw', text: leading })
      buffer = ''

      let depth = 1
      let cursor = index + 1
      let innerQuote: string | null = null
      while (cursor < css.length && depth > 0) {
        const inner = css[cursor]
        if (innerQuote) {
          if (inner === innerQuote && css[cursor - 1] !== '\\') innerQuote = null
        } else if (inner === '"' || inner === "'") {
          innerQuote = inner
        } else if (inner === '/' && css[cursor + 1] === '*') {
          const end = css.indexOf('*/', cursor + 2)
          cursor = end === -1 ? css.length : end + 1
        } else if (inner === '{') {
          depth += 1
        } else if (inner === '}') {
          depth -= 1
        }
        cursor += 1
      }

      out.push({ kind: 'block', prelude, body: css.slice(index + 1, cursor - 1) })
      index = cursor
      continue
    }

    buffer += char
    index += 1
  }

  if (buffer) out.push({ kind: 'raw', text: buffer })
  return out
}

export function splitSelectors(selectorList: string): string[] {
  const out: string[] = []
  let depth = 0
  let quote: string | null = null
  let start = 0

  for (let index = 0; index < selectorList.length; index += 1) {
    const char = selectorList[index]
    if (quote) {
      if (char === quote && selectorList[index - 1] !== '\\') quote = null
      continue
    }
    if (selectorList[index - 1] === '\\') continue
    if (char === '"' || char === "'") {
      quote = char
      continue
    }
    if (char === '(' || char === '[') depth += 1
    else if (char === ')' || char === ']') depth -= 1
    else if (char === ',' && depth === 0) {
      out.push(selectorList.slice(start, index))
      start = index + 1
    }
  }

  out.push(selectorList.slice(start))
  return out
}

function isDocumentRootSelector(selector: string): boolean {
  return selector === ':root' || selector === ':host' || selector === 'html'
}

function transform(css: string, replaceRootWith: string, prefix: string | null): string {
  let out = ''

  for (const chunk of chunkCss(css)) {
    if (chunk.kind === 'raw') {
      out += chunk.text
      continue
    }

    const { prelude, body } = chunk

    if (prelude.startsWith('@')) {
      const atName = /^@([a-zA-Z-]+)/.exec(prelude)?.[1] ?? ''

      if (atName === 'media') {
        const params = prelude.slice(6).trim()
        if (isWidthOnlyQuery(params)) {
          out += `@container ${CONTAINER_NAME} ${params}{${transform(body, replaceRootWith, prefix)}}`
          continue
        }
      }

      if (VERBATIM_AT_RULES.has(atName)) {
        out += `${prelude}{${body}}`
        continue
      }

      out += `${prelude}{${transform(body, replaceRootWith, prefix)}}`
      continue
    }

    const selector = splitSelectors(prelude)
      .flatMap((entry) => {
        const trimmed = entry.trim()
        if (!trimmed) return []
        if (isDocumentRootSelector(trimmed)) return replaceRootWith
        if (!prefix) return trimmed
        if (trimmed.startsWith(prefix)) return trimmed
        return `${prefix} ${trimmed}`
      })
      .join(',')

    out += `${selector}{${body}}`
  }

  return out
}

function splitLayerDeclaration(css: string): [string, string] {
  const match = /^\s*@layer\s+[^;{]+;/.exec(css)
  if (!match) return ['', css]
  return [match[0], css.slice(match[0].length)]
}

export function scopeCanvasCss(css: string): string {
  const [layers, rest] = splitLayerDeclaration(css)
  return `${layers}\n@scope (${CANVAS_SCOPE}) {\n${transform(rest, ':scope', null)}\n}\n`
}

export function prefixCanvasCss(css: string): string {
  const [layers, rest] = splitLayerDeclaration(css)
  return `${layers}\n${transform(rest, CANVAS_SCOPE, CANVAS_SCOPE)}\n`
}

export function supportsScope(): boolean {
  return typeof CSSScopeRule !== 'undefined'
}

export function scopeCss(css: string): string {
  return supportsScope() ? scopeCanvasCss(css) : prefixCanvasCss(css)
}
