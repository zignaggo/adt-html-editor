import { CANVAS_SCOPE, chunkCss, scopeCss, splitSelectors } from '../../tailwind/scopeCss'

export type DocumentCss = { inline: string[]; links: string[] }

export function extractDocumentCss(head: string): DocumentCss {
  const parsed = new DOMParser().parseFromString(`<html><head>${head}</head></html>`, 'text/html')
  const inline = Array.from(parsed.head.querySelectorAll('style')).map(
    (style) => style.textContent ?? '',
  )
  const links: string[] = []
  for (const link of parsed.head.querySelectorAll('link')) {
    const rel = (link.getAttribute('rel') ?? '').toLowerCase().split(/\s+/)
    const href = link.getAttribute('href')
    if (rel.includes('stylesheet') && href) links.push(href)
  }
  return { inline, links }
}

const URL_FUNCTION = /url\(\s*(['"]?)([^'")]+)\1\s*\)/g
const IMPORT_STRING = /@import\s+(['"])([^'"]+)\1/g

function isExternal(url: string): boolean {
  return /^(?:data:|blob:|https?:\/\/|\/\/|#)/i.test(url.trim())
}

export function rewriteUrls(css: string, resolve: (url: string) => string): string {
  return css
    .replace(URL_FUNCTION, (match, quote: string, url: string) =>
      isExternal(url) ? match : `url(${quote}${resolve(url.trim())}${quote})`,
    )
    .replace(IMPORT_STRING, (match, quote: string, url: string) =>
      isExternal(url) ? match : `@import ${quote}${resolve(url.trim())}${quote}`,
    )
}

const ROOT_TOKEN = /^(?:html|body|:root)(?=$|[.#:[\s>+~])/

function rewriteSelector(selector: string): string {
  const tokens = selector.trim().split(/(\s*[>+~]\s*|\s+)/)
  let out = ''
  let rooted = false
  for (let index = 0; index < tokens.length; index += 2) {
    const compound = tokens[index]
    if (!compound) continue
    const combinator = index === 0 ? '' : tokens[index - 1]
    const isRoot = ROOT_TOKEN.test(compound)
    const mapped = isRoot ? compound.replace(ROOT_TOKEN, CANVAS_SCOPE) : compound
    if (isRoot && rooted && mapped === CANVAS_SCOPE) continue
    out += combinator + mapped
    if (isRoot) rooted = true
  }
  return out
}

export function rewriteRootSelectors(css: string): string {
  let out = ''
  for (const chunk of chunkCss(css)) {
    if (chunk.kind === 'raw') {
      out += chunk.text
      continue
    }
    const { prelude, body } = chunk
    if (prelude.startsWith('@')) {
      const atName = /^@([a-zA-Z-]+)/.exec(prelude)?.[1] ?? ''
      out +=
        atName === 'media' || atName === 'supports' || atName === 'layer' || atName === 'container'
          ? `${prelude}{${rewriteRootSelectors(body)}}`
          : `${prelude}{${body}}`
      continue
    }
    const selectors = [...new Set(splitSelectors(prelude).map(rewriteSelector))].join(',')
    out += `${selectors}{${body}}`
  }
  return out
}

function partition(css: string): { global: string; scoped: string } {
  let global = ''
  let scoped = ''
  for (const chunk of chunkCss(css)) {
    if (chunk.kind === 'raw') {
      scoped += chunk.text
      continue
    }
    const atName = /^@([a-zA-Z-]+)/.exec(chunk.prelude)?.[1] ?? ''
    if (atName === 'page') continue
    if (atName === 'font-face') {
      global += `${chunk.prelude}{${chunk.body}}\n`
      continue
    }
    scoped += `${chunk.prelude}{${chunk.body}}`
  }
  return { global, scoped }
}

export function scopeDocumentCss(css: string): string {
  const { global, scoped } = partition(css)
  return `${global}${scopeCss(rewriteRootSelectors(scoped))}`
}
