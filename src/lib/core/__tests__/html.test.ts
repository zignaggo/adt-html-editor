import { describe, expect, it } from 'vitest'
import { parseHtml, looksLikeFullDocument } from '../html/parse'
import { serializeHtml } from '../html/serialize'
import { classSetOf } from '../model'

const fixtures: Record<string, string> = {
  fragmentSimple: '<section class="p-4 flex"><h1 id="t">Hello</h1><p>Text</p></section>',
  fragmentSiblings: '<div>a</div><div>b</div>',
  inlineWhitespace: '<p><span>a</span> <span>b</span></p>',
  attributesOrdered:
    '<a href="/x" class="underline text-blue-500" data-track="cta" aria-label="go">go</a>',
  comment: '<div><!-- keep this --><p>x</p></div>',
  voidTags: '<div><img src="a.png" alt="a"><br><input type="text" value="v"></div>',
  opaqueScript: '<div><script>const a = 1 < 2 && 3 > 2;</script></div>',
  opaqueStyle: '<div><style>.a > .b { color: red }</style></div>',
  opaqueSvg:
    '<div><svg viewBox="0 0 10 10"><path d="M0 0 L10 10" stroke="red"/></svg></div>',
  opaqueTemplate: '<template><div class="x">hi</div></template>',
  preWhitespace: '<pre>  line 1\n  line 2  </pre>',
  entities: '<p>a &amp; b &lt; c &gt; d &quot;e&quot; &nbsp; f</p>',
  customElements: '<my-widget data-x="1"><slot-thing>y</slot-thing></my-widget>',
  nested: '<ul><li>a</li><li><ul><li>b</li></ul></li></ul>',
  table: '<table><tbody><tr><td>1</td></tr></tbody></table>',
  fullDocument:
    '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>T</title><style>.a{color:red}</style></head><body class="bg-white"><main class="p-8"><h1>Hi</h1></main></body></html>',
}

const roundTrip = (html: string) => serializeHtml(parseHtml(html))

describe('format detection', () => {
  it('recognizes a full document', () => {
    expect(looksLikeFullDocument(fixtures.fullDocument)).toBe(true)
    expect(looksLikeFullDocument('<body>x</body>')).toBe(true)
  })

  it('recognizes a fragment', () => {
    expect(looksLikeFullDocument(fixtures.fragmentSimple)).toBe(false)
    expect(looksLikeFullDocument('<div>bodyguard</div>')).toBe(false)
  })
})

describe('round-trip idempotence', () => {
  for (const [name, html] of Object.entries(fixtures)) {
    it(`is idempotent: ${name}`, () => {
      const once = roundTrip(html)
      expect(roundTrip(once)).toBe(once)
    })
  }
})

describe('DOM equivalence', () => {
  for (const [name, html] of Object.entries(fixtures)) {
    it(`preserves the DOM: ${name}`, () => {
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

describe('fidelity', () => {
  it('preserves attribute order', () => {
    expect(roundTrip(fixtures.attributesOrdered)).toBe(fixtures.attributesOrdered)
  })

  it('preserves class order', () => {
    const doc = parseHtml('<div class="z-10 flex a-b"></div>')
    const node = Object.values(doc.nodes).find((n) => n.kind === 'element' && n.tag === 'div')
    expect(node && 'classes' in node ? node.classes : []).toEqual(['z-10', 'flex', 'a-b'])
  })

  it('re-emits opaque node content byte for byte', () => {
    const html = '<script>if (a<b && c>d) { x = "&amp;" }</script>'
    expect(roundTrip(html)).toBe(html)
  })

  it('keeps svg intact', () => {
    expect(roundTrip(fixtures.opaqueSvg)).toBe(fixtures.opaqueSvg)
  })

  it('keeps template content', () => {
    expect(roundTrip(fixtures.opaqueTemplate)).toBe(fixtures.opaqueTemplate)
  })

  it('keeps comments in the model and in the output', () => {
    const doc = parseHtml(fixtures.comment)
    expect(Object.values(doc.nodes).some((n) => n.kind === 'comment')).toBe(true)
    expect(roundTrip(fixtures.comment)).toContain('<!-- keep this -->')
  })

  it('drops whitespace between blocks', () => {
    const doc = parseHtml('<div>\n  <p>a</p>\n  <p>b</p>\n</div>')
    expect(Object.values(doc.nodes).filter((n) => n.kind === 'text')).toHaveLength(2)
  })

  it('keeps significant whitespace between inlines', () => {
    expect(roundTrip(fixtures.inlineWhitespace)).toBe(fixtures.inlineWhitespace)
  })

  it('preserves whitespace inside pre', () => {
    expect(roundTrip(fixtures.preWhitespace)).toBe(fixtures.preWhitespace)
  })

  it('never leaks internal editor attributes', () => {
    for (const html of Object.values(fixtures)) {
      expect(roundTrip(html)).not.toContain('data-adt')
    }
  })

  it('omits class when there are no classes', () => {
    expect(roundTrip('<div class="">x</div>')).toBe('<div>x</div>')
  })

  it('preserves head and doctype of a full document', () => {
    const out = roundTrip(fixtures.fullDocument)
    expect(out.startsWith('<!DOCTYPE html><html lang="en"><head>')).toBe(true)
    expect(out).toContain('<meta charset="utf-8">')
    expect(out).toContain('<style>.a{color:red}</style>')
    expect(out).toContain('<body class="bg-white">')
  })

  it('does not expose head as editable nodes', () => {
    const doc = parseHtml(fixtures.fullDocument)
    const tags = Object.values(doc.nodes).map((n) => ('tag' in n ? n.tag : n.kind))
    expect(tags).not.toContain('title')
    expect(tags).not.toContain('meta')
  })
})

describe('classSetOf', () => {
  it('collects every class in the document', () => {
    expect(classSetOf(parseHtml(fixtures.fragmentSimple))).toEqual(new Set(['p-4', 'flex']))
  })
})
