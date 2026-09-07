import { describe, expect, it } from 'vitest'
import {
  chunkCss,
  isWidthOnlyQuery,
  prefixCanvasCss,
  scopeCanvasCss,
  splitSelectors,
} from '../scopeCss'

describe('isWidthOnlyQuery', () => {
  it('aceita consultas só de largura', () => {
    expect(isWidthOnlyQuery('(width >= 48rem)')).toBe(true)
    expect(isWidthOnlyQuery('(width < 48rem)')).toBe(true)
    expect(isWidthOnlyQuery('(min-width: 640px)')).toBe(true)
    expect(isWidthOnlyQuery('(width >= 500px)')).toBe(true)
  })

  it('recusa consultas de recurso', () => {
    expect(isWidthOnlyQuery('(hover: hover)')).toBe(false)
    expect(isWidthOnlyQuery('(prefers-color-scheme: dark)')).toBe(false)
    expect(isWidthOnlyQuery('(prefers-reduced-motion: reduce)')).toBe(false)
    expect(isWidthOnlyQuery('(pointer: fine)')).toBe(false)
    expect(isWidthOnlyQuery('print')).toBe(false)
    expect(isWidthOnlyQuery('(orientation: landscape)')).toBe(false)
  })

  it('recusa consultas mistas de largura e recurso', () => {
    expect(isWidthOnlyQuery('(width >= 48rem) and (hover: hover)')).toBe(false)
    expect(isWidthOnlyQuery('(min-width: 640px) and (prefers-color-scheme: dark)')).toBe(false)
  })

  it('recusa consultas de altura', () => {
    expect(isWidthOnlyQuery('(height >= 40rem)')).toBe(false)
  })
})

describe('splitSelectors', () => {
  it('divide no nível superior', () => {
    expect(splitSelectors('a, b, c')).toEqual(['a', ' b', ' c'])
  })

  it('não divide dentro de :is() e :where()', () => {
    expect(splitSelectors(':where(.a, .b), .c')).toEqual([':where(.a, .b)', ' .c'])
  })

  it('não divide dentro de atributos', () => {
    expect(splitSelectors('[data-x="a,b"], .c')).toEqual(['[data-x="a,b"]', ' .c'])
  })

  it('preserva classes escapadas do tailwind', () => {
    expect(splitSelectors('.md\\:grid,.sm\\:flex')).toEqual(['.md\\:grid', '.sm\\:flex'])
  })
})

describe('chunkCss', () => {
  it('separa blocos e declarações soltas', () => {
    const chunks = chunkCss('@layer a, b;\n.x{color:red}')
    expect(chunks[0]).toEqual({ kind: 'raw', text: '@layer a, b;' })
    expect(chunks.at(-1)).toEqual({ kind: 'block', prelude: '.x', body: 'color:red' })
  })

  it('respeita blocos aninhados', () => {
    const chunks = chunkCss('@media (width >= 10px){.a{color:red}}')
    expect(chunks).toHaveLength(1)
    expect(chunks[0]).toEqual({
      kind: 'block',
      prelude: '@media (width >= 10px)',
      body: '.a{color:red}',
    })
  })

  it('ignora chaves dentro de strings e comentários', () => {
    const chunks = chunkCss('.a{content:"{"}/* } */.b{color:red}')
    const blocks = chunks.filter((chunk) => chunk.kind === 'block')
    expect(blocks).toHaveLength(2)
  })
})

describe('scopeCanvasCss', () => {
  it('envolve tudo em @scope', () => {
    const css = scopeCanvasCss('.flex{display:flex}')
    expect(css).toContain('@scope (.adt-canvas) {')
    expect(css).toContain('.flex{display:flex}')
  })

  it('reescreve :root, :host e html para :scope', () => {
    const css = scopeCanvasCss(':root, :host{--a:1}html, :host{line-height:1.5}')
    expect(css).toContain(':scope,:scope{--a:1}')
    expect(css).toContain(':scope,:scope{line-height:1.5}')
    expect(css).not.toContain(':root')
    expect(css).not.toMatch(/(^|[^-\w]):host/)
  })

  it('converte media de largura em container query', () => {
    const css = scopeCanvasCss('@media (width >= 48rem){.md\\:grid{display:grid}}')
    expect(css).toContain('@container adt-canvas (width >= 48rem){')
    expect(css).not.toContain('@media')
  })

  it('preserva media de recurso', () => {
    const css = scopeCanvasCss('@media (hover: hover){.a:hover{color:red}}')
    expect(css).toContain('@media (hover: hover){')
    expect(css).not.toContain('@container')
  })

  it('converte a media externa e mantém a interna de recurso', () => {
    const css = scopeCanvasCss(
      '@media (width >= 64rem){@media (hover: hover){.lg\\:hover\\:underline:hover{text-decoration:underline}}}',
    )
    expect(css).toContain('@container adt-canvas (width >= 64rem){')
    expect(css).toContain('@media (hover: hover){')
  })

  it('mantém keyframes intactos', () => {
    const css = scopeCanvasCss('@keyframes spin{from{rotate:0deg}to{rotate:360deg}}')
    expect(css).toContain('@keyframes spin{from{rotate:0deg}to{rotate:360deg}}')
  })

  it('mantém a declaração de layers fora do escopo', () => {
    const css = scopeCanvasCss('@layer theme, base, utilities;\n.a{color:red}')
    const scopeIndex = css.indexOf('@scope')
    expect(css.indexOf('@layer theme, base, utilities;')).toBeLessThan(scopeIndex)
  })

  it('mantém max-width em container query', () => {
    const css = scopeCanvasCss('@media (width < 48rem){.max-md\\:flex{display:flex}}')
    expect(css).toContain('@container adt-canvas (width < 48rem){')
  })

  it('não toca em @container já existente', () => {
    const css = scopeCanvasCss('@container (width >= 28rem){.\\@md\\:flex{display:flex}}')
    expect(css).toContain('@container (width >= 28rem){')
  })
})

describe('prefixCanvasCss', () => {
  it('prefixa seletores com o escopo do canvas', () => {
    const css = prefixCanvasCss('.flex{display:flex}')
    expect(css).toContain('.adt-canvas .flex{display:flex}')
  })

  it('troca :root pela classe do canvas', () => {
    expect(prefixCanvasCss(':root, :host{--a:1}')).toContain('.adt-canvas,.adt-canvas{--a:1}')
  })

  it('prefixa cada seletor da lista', () => {
    const css = prefixCanvasCss('.a, .b{color:red}')
    expect(css).toContain('.adt-canvas .a,.adt-canvas .b{color:red}')
  })

  it('não duplica o prefixo', () => {
    expect(prefixCanvasCss('.adt-canvas .a{color:red}')).toContain('.adt-canvas .a{color:red}')
  })

  it('converte media de largura mesmo no modo prefixo', () => {
    const css = prefixCanvasCss('@media (width >= 48rem){.a{color:red}}')
    expect(css).toContain('@container adt-canvas (width >= 48rem){')
  })
})
