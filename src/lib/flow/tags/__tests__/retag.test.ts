import { describe, expect, it } from 'vitest'
import { parseHtml } from '../../../core/html/parse'
import type { NodeId } from '../../../core/ids'
import type { EditorDocument } from '../../../core/model'
import {
  EDITABLE_TAGS,
  allowsTag,
  hasRetagOptions,
  inspectRetag,
  isEditableTag,
  retagReasonOf,
} from '../retag'

function docOf(html: string): EditorDocument {
  return parseHtml(html)
}

function idOf(doc: EditorDocument, attrId: string): NodeId {
  for (const node of Object.values(doc.nodes)) {
    if ((node.kind === 'element' || node.kind === 'opaque') && node.attrs.id === attrId) {
      return node.id
    }
  }
  throw new Error(`no #${attrId}`)
}

function firstChildOf(doc: EditorDocument, id: NodeId): NodeId {
  const node = doc.nodes[id]
  if (node.kind !== 'element' || node.children.length === 0) throw new Error('no child')
  return node.children[0]
}

function inspect(html: string, attrId = 'a') {
  const doc = docOf(html)
  const id = idOf(doc, attrId)
  return { doc, id, inspection: inspectRetag(doc, id) }
}

describe('inspectRetag', () => {
  it('offers every editable tag on a plain block of text', () => {
    const { inspection } = inspect('<section><div id="a">text</div></section>')

    expect(Object.keys(inspection.can).sort()).toEqual([...EDITABLE_TAGS].sort())
    expect(Object.values(inspection.can).every((entry) => entry === true)).toBe(true)
    expect(inspection.tag).toBe('div')
  })

  it('refuses a phrase tag for a box that holds a block', () => {
    const { inspection } = inspect('<div id="a"><div>inner</div></div>')

    expect(retagReasonOf(inspection, 'p')).toBe('unsupported')
    expect(retagReasonOf(inspection, 'span')).toBe('unsupported')
    expect(retagReasonOf(inspection, 'h2')).toBe('unsupported')
    expect(allowsTag(inspection, 'section')).toBe(true)
    expect(allowsTag(inspection, 'div')).toBe(true)
  })

  it('keeps a phrase tag when the children are inline', () => {
    const { inspection } = inspect('<div id="a">text <strong>bold</strong> <br></div>')

    expect(allowsTag(inspection, 'p')).toBe(true)
    expect(allowsTag(inspection, 'span')).toBe(true)
  })

  it('leaves only inline tags under a phrasing ancestor', () => {
    const { inspection } = inspect('<p><span id="a">x</span></p>')

    expect(allowsTag(inspection, 'span')).toBe(true)
    expect(retagReasonOf(inspection, 'div')).toBe('unsupported')
    expect(retagReasonOf(inspection, 'p')).toBe('unsupported')
    expect(retagReasonOf(inspection, 'section')).toBe('unsupported')
  })

  it('leaves only inline tags under an inline ancestor', () => {
    const { inspection } = inspect('<div><a href="#"><span id="a">x</span></a></div>')

    expect(allowsTag(inspection, 'span')).toBe(true)
    expect(retagReasonOf(inspection, 'div')).toBe('unsupported')
    expect(retagReasonOf(inspection, 'h1')).toBe('unsupported')
  })

  it('blocks every tag under a restricted parent', () => {
    const { inspection } = inspect('<ul><li id="a">x</li></ul>')

    expect(Object.values(inspection.can).every((entry) => entry === 'unsupported')).toBe(true)
  })

  it('blocks every tag inside a table row', () => {
    const { inspection } = inspect('<table><tbody><tr id="a"><td>1</td></tr></tbody></table>')

    expect(retagReasonOf(inspection, 'div')).toBe('unsupported')
  })

  it('offers only p and headings inside an hgroup', () => {
    const { inspection } = inspect('<hgroup><h1>t</h1><p id="a">sub</p></hgroup>')

    expect(allowsTag(inspection, 'p')).toBe(true)
    expect(allowsTag(inspection, 'h2')).toBe(true)
    expect(retagReasonOf(inspection, 'div')).toBe('unsupported')
    expect(retagReasonOf(inspection, 'section')).toBe('unsupported')
  })

  it('refuses header and footer inside a header', () => {
    const { inspection } = inspect('<header><div id="a">x</div></header>')

    expect(retagReasonOf(inspection, 'header')).toBe('unsupported')
    expect(retagReasonOf(inspection, 'footer')).toBe('unsupported')
    expect(allowsTag(inspection, 'section')).toBe(true)
  })

  it('refuses header and footer around a footer', () => {
    const { inspection } = inspect('<div id="a"><footer>c</footer></div>')

    expect(retagReasonOf(inspection, 'footer')).toBe('unsupported')
    expect(retagReasonOf(inspection, 'header')).toBe('unsupported')
    expect(allowsTag(inspection, 'section')).toBe(true)
  })

  it('refuses article, aside and nav around a main', () => {
    const { inspection } = inspect('<div id="a"><main>page</main></div>')

    expect(retagReasonOf(inspection, 'article')).toBe('unsupported')
    expect(retagReasonOf(inspection, 'aside')).toBe('unsupported')
    expect(retagReasonOf(inspection, 'nav')).toBe('unsupported')
    expect(allowsTag(inspection, 'section')).toBe(true)
    expect(allowsTag(inspection, 'div')).toBe(true)
  })

  it('refuses headings and sections inside an address', () => {
    const { inspection } = inspect('<address><div id="a">x</div></address>')

    expect(retagReasonOf(inspection, 'h1')).toBe('unsupported')
    expect(retagReasonOf(inspection, 'section')).toBe('unsupported')
    expect(retagReasonOf(inspection, 'article')).toBe('unsupported')
    expect(retagReasonOf(inspection, 'header')).toBe('unsupported')
    expect(allowsTag(inspection, 'p')).toBe(true)
    expect(allowsTag(inspection, 'div')).toBe(true)
    expect(allowsTag(inspection, 'blockquote')).toBe(true)
  })

  it('refuses headings and sections inside a dt', () => {
    const { inspection } = inspect('<dl><dt><div id="a">x</div></dt><dd>y</dd></dl>')

    expect(retagReasonOf(inspection, 'h3')).toBe('unsupported')
    expect(retagReasonOf(inspection, 'nav')).toBe('unsupported')
    expect(retagReasonOf(inspection, 'footer')).toBe('unsupported')
    expect(allowsTag(inspection, 'div')).toBe(true)
    expect(allowsTag(inspection, 'p')).toBe(true)
  })

  it('blames the lock on a locked node and on a locked ancestor', () => {
    const doc = docOf('<section id="s"><div id="a">x</div></section>')
    const id = idOf(doc, 'a')
    const sectionId = idOf(doc, 's')

    expect(retagReasonOf(inspectRetag(doc, id, { locked: { [id]: true } }), 'p')).toBe('locked')
    expect(retagReasonOf(inspectRetag(doc, id, { locked: { [sectionId]: true } }), 'p')).toBe('locked')
  })

  it('blames the inline editor while its text is being edited', () => {
    const doc = docOf('<section><div id="a">x</div></section>')
    const id = idOf(doc, 'a')
    const textId = firstChildOf(doc, id)

    expect(retagReasonOf(inspectRetag(doc, id, { editingTextId: id }), 'p')).toBe('editing')
    expect(retagReasonOf(inspectRetag(doc, id, { editingTextId: textId }), 'p')).toBe('editing')
  })

  it('refuses the root and anything that is not an element', () => {
    const doc = docOf('<div id="a">x</div>')
    const textId = firstChildOf(doc, idOf(doc, 'a'))

    const root = inspectRetag(doc, doc.rootId)
    expect(root.tag).toBeNull()
    expect(retagReasonOf(root, 'div')).toBe('unsupported')

    const text = inspectRetag(doc, textId)
    expect(text.tag).toBeNull()
    expect(retagReasonOf(text, 'div')).toBe('unsupported')
  })

  it('refuses an opaque element', () => {
    const { inspection } = inspect('<div><svg id="a" viewBox="0 0 1 1"></svg></div>')

    expect(inspection.tag).toBe('svg')
    expect(retagReasonOf(inspection, 'div')).toBe('unsupported')
  })
})

describe('hasRetagOptions', () => {
  it('is true when another tag is open', () => {
    expect(hasRetagOptions(inspect('<section><div id="a">text</div></section>').inspection)).toBe(true)
  })

  it('is false when the current tag is the only one left', () => {
    expect(hasRetagOptions(inspect('<p><span id="a">x</span></p>').inspection)).toBe(false)
  })

  it('is false when everything is blocked', () => {
    expect(hasRetagOptions(inspect('<ul><li id="a">x</li></ul>').inspection)).toBe(false)

    const doc = docOf('<section><div id="a">x</div></section>')
    const id = idOf(doc, 'a')
    expect(hasRetagOptions(inspectRetag(doc, id, { locked: { [id]: true } }))).toBe(false)
  })

  it('is false on the root and on a text node', () => {
    const doc = docOf('<div id="a">x</div>')
    expect(hasRetagOptions(inspectRetag(doc, doc.rootId))).toBe(false)
    expect(hasRetagOptions(inspectRetag(doc, firstChildOf(doc, idOf(doc, 'a'))))).toBe(false)
  })
})

describe('isEditableTag', () => {
  it('knows the editable set', () => {
    const { inspection } = inspect('<div id="a">x</div>')

    expect(isEditableTag('h4')).toBe(true)
    expect(isEditableTag('li')).toBe(false)
    expect(retagReasonOf(inspection, 'li')).toBe('unsupported')
    expect(allowsTag(inspection, 'li')).toBe(false)
  })
})
