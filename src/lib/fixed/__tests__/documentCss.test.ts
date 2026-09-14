import { describe, expect, it } from 'vitest'
import {
  extractDocumentCss,
  rewriteRootSelectors,
  rewriteUrls,
  scopeDocumentCss,
} from '../stylesheet/documentCss'

describe('extractDocumentCss', () => {
  it('collects style contents and stylesheet links in order', () => {
    const head =
      '<meta charset="utf-8"><style>a{color:red}</style><link rel="icon" href="i.png"><link rel="stylesheet preload" href="page.css"><style>b{color:blue}</style>'
    expect(extractDocumentCss(head)).toEqual({
      inline: ['a{color:red}', 'b{color:blue}'],
      links: ['page.css'],
    })
  })
})

describe('rewriteUrls', () => {
  it('rewrites relative url() and @import targets only', () => {
    const css = `@import "base.css"; .a{background:url(img/a.png)} .b{background:url("https://x/y.png")} .c{src:url('data:image/png;base64,AAA')}`
    const out = rewriteUrls(css, (url) => `https://cdn/${url}`)
    expect(out).toContain('@import "https://cdn/base.css"')
    expect(out).toContain('url(https://cdn/img/a.png)')
    expect(out).toContain('url("https://x/y.png")')
    expect(out).toContain("url('data:image/png;base64,AAA')")
  })
})

describe('rewriteRootSelectors', () => {
  it('maps html, body and :root to the canvas without doubling it', () => {
    const out = rewriteRootSelectors(
      'html,body{margin:0} body>.page{width:10px} :root{--x:1} html.dark body .t{color:red} html > body{padding:0} .a{color:blue}',
    )
    expect(out).toContain('.adt-canvas{margin:0}')
    expect(out).not.toContain('.adt-canvas,.adt-canvas')
    expect(out).toContain('.adt-canvas>.page{width:10px}')
    expect(out).toContain('.adt-canvas{--x:1}')
    expect(out).toContain('.adt-canvas.dark .t{color:red}')
    expect(out).toContain('.adt-canvas{padding:0}')
    expect(out).toContain('.a{color:blue}')
    expect(out).not.toMatch(/\.adt-canvas[ >]+\.adt-canvas/)
  })

  it('rewrites selectors nested in @media and leaves @keyframes alone', () => {
    expect(rewriteRootSelectors('@media print{body{display:none}}')).toBe(
      '@media print{.adt-canvas{display:none}}',
    )
    expect(rewriteRootSelectors('@keyframes x{from{opacity:0}}')).toBe('@keyframes x{from{opacity:0}}')
  })
})

describe('scopeDocumentCss', () => {
  it('keeps @font-face global, drops @page and scopes the rest', () => {
    const out = scopeDocumentCss('@page{margin:0} @font-face{font-family:F;src:url(f.woff2)} body{margin:0} .a{color:blue}')
    expect(out).not.toContain('@page')
    expect(out.startsWith('@font-face{font-family:F;src:url(f.woff2)}')).toBe(true)
    expect(out).toContain('.adt-canvas{margin:0}')
    expect(out).toMatch(/@scope \(\.adt-canvas\)|\.adt-canvas \.a\{color:blue\}/)
  })
})
