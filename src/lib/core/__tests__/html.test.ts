import { describe, expect, it } from 'vitest'
import { parseHtml, looksLikeFullDocument } from '../html/parse'
import { serializeHtml } from '../html/serialize'
import { classSetOf } from '../model'

const fixtures: Record<string, string> = {
  fragmentSimple: '<section class="p-4 flex"><h1 id="t">Olá</h1><p>Texto</p></section>',
  fragmentSiblings: '<div>a</div><div>b</div>',
  inlineWhitespace: '<p><span>a</span> <span>b</span></p>',
  attributesOrdered:
    '<a href="/x" class="underline text-blue-500" data-track="cta" aria-label="ir">ir</a>',
  comment: '<div><!-- mantenha isto --><p>x</p></div>',
  voidTags: '<div><img src="a.png" alt="a"><br><input type="text" value="v"></div>',
  opaqueScript: '<div><script>const a = 1 < 2 && 3 > 2;</script></div>',
  opaqueStyle: '<div><style>.a > .b { color: red }</style></div>',
  opaqueSvg:
    '<div><svg viewBox="0 0 10 10"><path d="M0 0 L10 10" stroke="red"/></svg></div>',
  opaqueTemplate: '<template><div class="x">oi</div></template>',
  preWhitespace: '<pre>  linha 1\n  linha 2  </pre>',
  entities: '<p>a &amp; b &lt; c &gt; d &quot;e&quot; &nbsp; f</p>',
  customElements: '<my-widget data-x="1"><slot-thing>y</slot-thing></my-widget>',
  nested: '<ul><li>a</li><li><ul><li>b</li></ul></li></ul>',
  table: '<table><tbody><tr><td>1</td></tr></tbody></table>',
  fullDocument:
    '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>T</title><style>.a{color:red}</style></head><body class="bg-white"><main class="p-8"><h1>Oi</h1></main></body></html>',
}

const roundTrip = (html: string) => serializeHtml(parseHtml(html))

describe('detecção de formato', () => {
  it('reconhece documento completo', () => {
    expect(looksLikeFullDocument(fixtures.fullDocument)).toBe(true)
    expect(looksLikeFullDocument('<body>x</body>')).toBe(true)
  })

  it('reconhece fragmento', () => {
    expect(looksLikeFullDocument(fixtures.fragmentSimple)).toBe(false)
    expect(looksLikeFullDocument('<div>bodyguard</div>')).toBe(false)
  })
})

describe('idempotência do round-trip', () => {
  for (const [name, html] of Object.entries(fixtures)) {
    it(`é idempotente: ${name}`, () => {
      const once = roundTrip(html)
      expect(roundTrip(once)).toBe(once)
    })
  }
})

describe('equivalência de DOM', () => {
  for (const [name, html] of Object.entries(fixtures)) {
    it(`preserva o DOM: ${name}`, () => {
      const parseInto = (source: string) => {
        if (looksLikeFullDocument(source)) {
          return new DOMParser().parseFromString(source, 'text/html').body
        }
        const holder = document.createElement('div')
        holder.innerHTML = source
        return holder
      }
      const before = parseInto(html)
      const after = parseInto(roundTrip(html))
      const strip = (el: Element) => {
        const clone = el.cloneNode(true) as Element
        const walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT)
        const doomed: Text[] = []
        let current = walker.nextNode()
        while (current) {
          const text = current as Text
          const parentTag = text.parentElement?.tagName.toLowerCase() ?? ''
          if (text.data.trim() === '' && parentTag !== 'pre' && parentTag !== 'textarea') {
            doomed.push(text)
          }
          current = walker.nextNode()
        }
        for (const text of doomed) text.remove()
        return clone
      }
      expect(strip(before).isEqualNode(strip(after))).toBe(true)
    })
  }
})

describe('fidelidade', () => {
  it('preserva a ordem dos atributos', () => {
    expect(roundTrip(fixtures.attributesOrdered)).toBe(fixtures.attributesOrdered)
  })

  it('preserva a ordem das classes', () => {
    const doc = parseHtml('<div class="z-10 flex a-b"></div>')
    const node = Object.values(doc.nodes).find((n) => n.kind === 'element' && n.tag === 'div')
    expect(node && 'classes' in node ? node.classes : []).toEqual(['z-10', 'flex', 'a-b'])
  })

  it('reemite o conteúdo de nós opacos byte a byte', () => {
    const html = '<script>if (a<b && c>d) { x = "&amp;" }</script>'
    expect(roundTrip(html)).toBe(html)
  })

  it('mantém svg intacto', () => {
    expect(roundTrip(fixtures.opaqueSvg)).toBe(fixtures.opaqueSvg)
  })

  it('mantém o conteúdo de template', () => {
    expect(roundTrip(fixtures.opaqueTemplate)).toBe(fixtures.opaqueTemplate)
  })

  it('mantém comentários no modelo e na saída', () => {
    const doc = parseHtml(fixtures.comment)
    expect(Object.values(doc.nodes).some((n) => n.kind === 'comment')).toBe(true)
    expect(roundTrip(fixtures.comment)).toContain('<!-- mantenha isto -->')
  })

  it('descarta whitespace entre blocos', () => {
    const doc = parseHtml('<div>\n  <p>a</p>\n  <p>b</p>\n</div>')
    expect(Object.values(doc.nodes).filter((n) => n.kind === 'text')).toHaveLength(2)
  })

  it('mantém whitespace significativo entre inlines', () => {
    expect(roundTrip(fixtures.inlineWhitespace)).toBe(fixtures.inlineWhitespace)
  })

  it('preserva whitespace dentro de pre', () => {
    expect(roundTrip(fixtures.preWhitespace)).toBe(fixtures.preWhitespace)
  })

  it('nunca vaza atributos internos do editor', () => {
    for (const html of Object.values(fixtures)) {
      expect(roundTrip(html)).not.toContain('data-adt')
    }
  })

  it('omite class quando não há classes', () => {
    expect(roundTrip('<div class="">x</div>')).toBe('<div>x</div>')
  })

  it('preserva head e doctype de documento completo', () => {
    const out = roundTrip(fixtures.fullDocument)
    expect(out.startsWith('<!DOCTYPE html><html lang="pt-BR"><head>')).toBe(true)
    expect(out).toContain('<meta charset="utf-8">')
    expect(out).toContain('<style>.a{color:red}</style>')
    expect(out).toContain('<body class="bg-white">')
  })

  it('não expõe head como nós editáveis', () => {
    const doc = parseHtml(fixtures.fullDocument)
    const tags = Object.values(doc.nodes).map((n) => ('tag' in n ? n.tag : n.kind))
    expect(tags).not.toContain('title')
    expect(tags).not.toContain('meta')
  })
})

describe('classSetOf', () => {
  it('coleta todas as classes do documento', () => {
    expect(classSetOf(parseHtml(fixtures.fragmentSimple))).toEqual(new Set(['p-4', 'flex']))
  })
})
