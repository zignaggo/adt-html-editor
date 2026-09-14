import { describe, expect, it } from 'vitest'
import { parseHtml } from '../../core/html/parse'
import { childrenOf } from '../../core/model'
import { detectLayout, pageSizeOf, readViewportMeta } from '../detect'
import { pageContainerOf } from '../pageContainer'

describe('readViewportMeta', () => {
  it('reads width and height in any order and separator', () => {
    expect(readViewportMeta('<meta name="viewport" content="width=1200, height=1600">')).toEqual({
      width: 1200,
      height: 1600,
    })
    expect(readViewportMeta("<meta content='height=800;width=600' name='viewport'>")).toEqual({
      width: 600,
      height: 800,
    })
    expect(
      readViewportMeta('<META NAME="Viewport" CONTENT="width=1024, height=768, initial-scale=1">'),
    ).toEqual({ width: 1024, height: 768 })
  })

  it('returns null without both dimensions or with device-width', () => {
    expect(readViewportMeta('<meta name="viewport" content="width=device-width">')).toBeNull()
    expect(readViewportMeta('<meta name="viewport" content="width=1200">')).toBeNull()
    expect(readViewportMeta('<meta charset="utf-8">')).toBeNull()
    expect(readViewportMeta('')).toBeNull()
  })
})

describe('detectLayout', () => {
  it('detects fixed layout from the viewport meta', () => {
    const doc = parseHtml(
      '<!DOCTYPE html><html><head><meta name="viewport" content="width=100, height=200"></head><body><p>x</p></body></html>',
    )
    expect(pageSizeOf(doc)).toEqual({ width: 100, height: 200 })
    expect(detectLayout(doc)).toBe('fixed')
  })

  it('detects fixed layout from inline absolute positions', () => {
    const doc = parseHtml(
      '<div style="position:absolute;left:0;top:0">a</div><div style="position: fixed">b</div><p>c</p><p>d</p><p>e</p>',
    )
    expect(detectLayout(doc)).toBe('flow')
    const positioned = parseHtml(
      '<div style="position:absolute">a</div><div style="position:absolute">b</div><div style="position:absolute">c</div><div style="position:absolute">d</div><p>e</p>',
    )
    expect(detectLayout(positioned)).toBe('fixed')
  })

  it('looks inside a single page wrapper', () => {
    const doc = parseHtml(
      '<div class="page"><img style="position:absolute" src="a.png"><p style="position:absolute">t</p></div>',
    )
    expect(pageContainerOf(doc)).toBe(childrenOf(doc, doc.rootId)[0])
    expect(detectLayout(doc)).toBe('fixed')
  })

  it('is flow for an ordinary fragment and for an empty document', () => {
    expect(detectLayout(parseHtml('<section><p>a</p></section><p>b</p>'))).toBe('flow')
    expect(detectLayout(parseHtml(''))).toBe('flow')
  })
})

describe('pageContainerOf', () => {
  it('returns the root when there are several top-level elements', () => {
    const doc = parseHtml('<div>a</div><div>b</div>')
    expect(pageContainerOf(doc)).toBe(doc.rootId)
  })

  it('ignores text and comments around a single wrapper', () => {
    const doc = parseHtml('<!-- c --><div id="p">a</div>')
    expect(pageContainerOf(doc)).toBe(childrenOf(doc, doc.rootId).find((id) => doc.nodes[id].kind === 'element'))
  })
})
