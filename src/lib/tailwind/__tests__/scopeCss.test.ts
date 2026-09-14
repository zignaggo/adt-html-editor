import { describe, expect, it } from 'vitest'
import {
  chunkCss,
  isWidthOnlyQuery,
  prefixCanvasCss,
  scopeCanvasCss,
  splitSelectors,
} from '../scopeCss'

describe('isWidthOnlyQuery', () => {
  it('accepts width-only queries', () => {
    expect(isWidthOnlyQuery('(width >= 48rem)')).toBe(true)
    expect(isWidthOnlyQuery('(width < 48rem)')).toBe(true)
    expect(isWidthOnlyQuery('(min-width: 640px)')).toBe(true)
    expect(isWidthOnlyQuery('(width >= 500px)')).toBe(true)
  })

  it('refuses feature queries', () => {
    expect(isWidthOnlyQuery('(hover: hover)')).toBe(false)
    expect(isWidthOnlyQuery('(prefers-color-scheme: dark)')).toBe(false)
    expect(isWidthOnlyQuery('(prefers-reduced-motion: reduce)')).toBe(false)
    expect(isWidthOnlyQuery('(pointer: fine)')).toBe(false)
    expect(isWidthOnlyQuery('print')).toBe(false)
    expect(isWidthOnlyQuery('(orientation: landscape)')).toBe(false)
  })

  it('refuses mixed width and feature queries', () => {
    expect(isWidthOnlyQuery('(width >= 48rem) and (hover: hover)')).toBe(false)
    expect(isWidthOnlyQuery('(min-width: 640px) and (prefers-color-scheme: dark)')).toBe(false)
  })

  it('refuses height queries', () => {
    expect(isWidthOnlyQuery('(height >= 40rem)')).toBe(false)
  })
})

describe('splitSelectors', () => {
  it('splits at the top level', () => {
    expect(splitSelectors('a, b, c')).toEqual(['a', ' b', ' c'])
  })

  it('does not split inside :is() and :where()', () => {
    expect(splitSelectors(':where(.a, .b), .c')).toEqual([':where(.a, .b)', ' .c'])
  })

  it('does not split inside attributes', () => {
    expect(splitSelectors('[data-x="a,b"], .c')).toEqual(['[data-x="a,b"]', ' .c'])
  })

  it('preserves escaped tailwind classes', () => {
    expect(splitSelectors('.md\\:grid,.sm\\:flex')).toEqual(['.md\\:grid', '.sm\\:flex'])
  })
})

describe('chunkCss', () => {
  it('separates blocks and loose declarations', () => {
    const chunks = chunkCss('@layer a, b;\n.x{color:red}')
    expect(chunks[0]).toEqual({ kind: 'raw', text: '@layer a, b;' })
    expect(chunks.at(-1)).toEqual({ kind: 'block', prelude: '.x', body: 'color:red' })
  })

  it('respects nested blocks', () => {
    const chunks = chunkCss('@media (width >= 10px){.a{color:red}}')
    expect(chunks).toHaveLength(1)
    expect(chunks[0]).toEqual({
      kind: 'block',
      prelude: '@media (width >= 10px)',
      body: '.a{color:red}',
    })
  })

  it('ignores braces inside strings and comments', () => {
    const chunks = chunkCss('.a{content:"{"}/* } */.b{color:red}')
    const blocks = chunks.filter((chunk) => chunk.kind === 'block')
    expect(blocks).toHaveLength(2)
  })
})

describe('scopeCanvasCss', () => {
  it('wraps everything in @scope', () => {
    const css = scopeCanvasCss('.flex{display:flex}')
    expect(css).toContain('@scope (.adt-canvas) {')
    expect(css).toContain('.flex{display:flex}')
  })

  it('rewrites :root, :host and html to :scope', () => {
    const css = scopeCanvasCss(':root, :host{--a:1}html, :host{line-height:1.5}')
    expect(css).toContain(':scope,:scope{--a:1}')
    expect(css).toContain(':scope,:scope{line-height:1.5}')
    expect(css).not.toContain(':root')
    expect(css).not.toMatch(/(^|[^-\w]):host/)
  })

  it('converts width media into a container query', () => {
    const css = scopeCanvasCss('@media (width >= 48rem){.md\\:grid{display:grid}}')
    expect(css).toContain('@container adt-canvas (width >= 48rem){')
    expect(css).not.toContain('@media')
  })

  it('preserves feature media', () => {
    const css = scopeCanvasCss('@media (hover: hover){.a:hover{color:red}}')
    expect(css).toContain('@media (hover: hover){')
    expect(css).not.toContain('@container')
  })

  it('converts the outer media and keeps the inner feature one', () => {
    const css = scopeCanvasCss(
      '@media (width >= 64rem){@media (hover: hover){.lg\\:hover\\:underline:hover{text-decoration:underline}}}',
    )
    expect(css).toContain('@container adt-canvas (width >= 64rem){')
    expect(css).toContain('@media (hover: hover){')
  })

  it('keeps keyframes intact', () => {
    const css = scopeCanvasCss('@keyframes spin{from{rotate:0deg}to{rotate:360deg}}')
    expect(css).toContain('@keyframes spin{from{rotate:0deg}to{rotate:360deg}}')
  })

  it('keeps the layers declaration outside the scope', () => {
    const css = scopeCanvasCss('@layer theme, base, utilities;\n.a{color:red}')
    const scopeIndex = css.indexOf('@scope')
    expect(css.indexOf('@layer theme, base, utilities;')).toBeLessThan(scopeIndex)
  })

  it('keeps max-width as a container query', () => {
    const css = scopeCanvasCss('@media (width < 48rem){.max-md\\:flex{display:flex}}')
    expect(css).toContain('@container adt-canvas (width < 48rem){')
  })

  it('does not touch an existing @container', () => {
    const css = scopeCanvasCss('@container (width >= 28rem){.\\@md\\:flex{display:flex}}')
    expect(css).toContain('@container (width >= 28rem){')
  })
})

describe('prefixCanvasCss', () => {
  it('prefixes selectors with the canvas scope', () => {
    const css = prefixCanvasCss('.flex{display:flex}')
    expect(css).toContain('.adt-canvas .flex{display:flex}')
  })

  it('swaps :root for the canvas class', () => {
    expect(prefixCanvasCss(':root, :host{--a:1}')).toContain('.adt-canvas,.adt-canvas{--a:1}')
  })

  it('prefixes every selector in the list', () => {
    const css = prefixCanvasCss('.a, .b{color:red}')
    expect(css).toContain('.adt-canvas .a,.adt-canvas .b{color:red}')
  })

  it('does not duplicate the prefix', () => {
    expect(prefixCanvasCss('.adt-canvas .a{color:red}')).toContain('.adt-canvas .a{color:red}')
  })

  it('converts width media even in prefix mode', () => {
    const css = prefixCanvasCss('@media (width >= 48rem){.a{color:red}}')
    expect(css).toContain('@container adt-canvas (width >= 48rem){')
  })
})
