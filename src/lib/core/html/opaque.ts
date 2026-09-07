import { OPAQUE_TAGS } from '../model'
import { uniqueToken } from './token'

const RAW_TEXT_TAGS: ReadonlySet<string> = new Set(['script', 'style'])
const TAG_START = /^<([a-zA-Z][a-zA-Z0-9-]*)/

export type OpaqueExtraction = {
  html: string
  byToken: Map<string, string>
}

function endOfOpenTag(html: string, from: number): { end: number; selfClosing: boolean } | null {
  let quote: string | null = null
  for (let i = from; i < html.length; i += 1) {
    const char = html[i]
    if (quote) {
      if (char === quote) quote = null
      continue
    }
    if (char === '"' || char === "'") {
      quote = char
      continue
    }
    if (char === '>') {
      let back = i - 1
      while (back > from && /\s/.test(html[back])) back -= 1
      return { end: i, selfClosing: html[back] === '/' }
    }
  }
  return null
}

function findRawTextClose(html: string, from: number, tag: string): number {
  const needle = `</${tag}`
  const index = html.toLowerCase().indexOf(needle, from)
  return index
}

function findNestedClose(html: string, from: number, tag: string): number {
  const lower = html.toLowerCase()
  const open = `<${tag}`
  const close = `</${tag}`
  let depth = 1
  let cursor = from
  while (cursor < html.length) {
    const nextOpen = lower.indexOf(open, cursor)
    const nextClose = lower.indexOf(close, cursor)
    if (nextClose === -1) return -1
    if (nextOpen !== -1 && nextOpen < nextClose) {
      const boundary = lower[nextOpen + open.length]
      if (boundary === undefined || /[\s/>]/.test(boundary)) {
        const openTag = endOfOpenTag(html, nextOpen)
        if (openTag && !openTag.selfClosing) depth += 1
        cursor = openTag ? openTag.end + 1 : nextOpen + open.length
        continue
      }
      cursor = nextOpen + open.length
      continue
    }
    depth -= 1
    if (depth === 0) return nextClose
    cursor = nextClose + close.length
  }
  return -1
}

export function extractOpaqueContent(html: string): OpaqueExtraction {
  const byToken = new Map<string, string>()
  let out = ''
  let cursor = 0

  while (cursor < html.length) {
    const lt = html.indexOf('<', cursor)
    if (lt === -1) {
      out += html.slice(cursor)
      break
    }

    if (html.startsWith('<!--', lt)) {
      const end = html.indexOf('-->', lt + 4)
      const stop = end === -1 ? html.length : end + 3
      out += html.slice(cursor, stop)
      cursor = stop
      continue
    }

    const match = TAG_START.exec(html.slice(lt, lt + 32))
    const tag = match?.[1]?.toLowerCase()
    if (!tag || !OPAQUE_TAGS.has(tag)) {
      out += html.slice(cursor, lt + 1)
      cursor = lt + 1
      continue
    }

    const openTag = endOfOpenTag(html, lt)
    if (!openTag) {
      out += html.slice(cursor)
      break
    }

    const contentStart = openTag.end + 1
    if (openTag.selfClosing) {
      out += html.slice(cursor, contentStart)
      cursor = contentStart
      continue
    }

    const closeIndex = RAW_TEXT_TAGS.has(tag)
      ? findRawTextClose(html, contentStart, tag)
      : findNestedClose(html, contentStart, tag)

    if (closeIndex === -1) {
      out += html.slice(cursor, contentStart)
      cursor = contentStart
      continue
    }

    const inner = html.slice(contentStart, closeIndex)
    const token = uniqueToken('RAW', html)
    byToken.set(token, inner)
    out += html.slice(cursor, contentStart) + token
    cursor = closeIndex
  }

  return { html: out, byToken }
}

export function restoreOpaqueContent(value: string, byToken: Map<string, string>): string {
  if (byToken.size === 0) return value
  let out = value
  for (const [token, original] of byToken) out = out.replaceAll(token, original)
  return out
}
