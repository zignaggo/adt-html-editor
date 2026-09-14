/// <reference types="node" />
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const DIST = resolve(dirname(fileURLToPath(import.meta.url)), '../../../dist')
const SKIN_PEERS = [
  '@base-ui/react',
  'lucide-react',
  'class-variance-authority',
  'cn',
  'cmdk',
  'react-resizable-panels',
]
const IMPORT = /(?:from|import)\s*["']([^"']+)["']/g

function importsOf(file: string): string[] {
  const source = readFileSync(file, 'utf8')
  const out: string[] = []
  for (const match of source.matchAll(IMPORT)) out.push(match[1])
  return out
}

function isSkinPeer(specifier: string): boolean {
  return SKIN_PEERS.some((peer) => specifier === peer || specifier.startsWith(`${peer}/`))
}

function externalsReachableFrom(entry: string): Set<string> {
  const externals = new Set<string>()
  const visited = new Set<string>()
  const queue = [entry]
  while (queue.length > 0) {
    const file = queue.pop()
    if (!file || visited.has(file)) continue
    visited.add(file)
    for (const specifier of importsOf(file)) {
      if (specifier.startsWith('.')) queue.push(resolve(dirname(file), specifier))
      else externals.add(specifier)
    }
  }
  return externals
}

describe.skipIf(!existsSync(resolve(DIST, 'index.js')))('published bundle graph', () => {
  it('keeps every shadcn peer out of the core entry graph', () => {
    const externals = [...externalsReachableFrom(resolve(DIST, 'index.js'))]
    expect(externals.filter(isSkinPeer)).toEqual([])
    expect(externals).toContain('react')
  })

  it('reaches the shadcn peers only from the skin entry', () => {
    const externals = [...externalsReachableFrom(resolve(DIST, 'shadcn.js'))]
    expect(externals.some((specifier) => specifier.startsWith('@base-ui/react'))).toBe(true)
    expect(externals).toContain('cn')
  })

  it('emits type declarations for both entries', () => {
    expect(existsSync(resolve(DIST, 'lib/index.d.ts'))).toBe(true)
    expect(existsSync(resolve(DIST, 'shadcn/index.d.ts'))).toBe(true)
    const declaration = readFileSync(resolve(DIST, 'shadcn/parts/Editor/HtmlEditor.d.ts'), 'utf8')
    expect(declaration).not.toContain('@shadcn/')
  })
})
