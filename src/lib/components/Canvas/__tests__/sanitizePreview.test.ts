import { describe, expect, it } from 'vitest'
import { sanitizePreviewHtml } from '../sanitizePreview'
import { parseHtml } from '../../../core/html/parse'
import { serializeHtml } from '../../../core/html/serialize'

describe('sanitizePreviewHtml', () => {
  it('removes inline handlers', () => {
    const out = sanitizePreviewHtml('svg', '<path d="M0 0" onload="alert(1)"/>')
    expect(out).not.toContain('onload')
    expect(out).toContain('d="M0 0"')
  })

  it('removes executable elements', () => {
    const out = sanitizePreviewHtml('svg', '<script>alert(1)</script><circle r="2"/>')
    expect(out).not.toContain('script')
    expect(out).toContain('circle')
  })

  it('removes javascript: urls', () => {
    const out = sanitizePreviewHtml('svg', '<a href="javascript:alert(1)"><text>x</text></a>')
    expect(out).not.toContain('javascript:')
    expect(out).toContain('<text>x</text>')
  })

  it('preserves legitimate content', () => {
    const svg = '<path d="M0 0 L10 10" stroke="red" stroke-width="2"/>'
    expect(sanitizePreviewHtml('svg', svg)).toContain('stroke-width="2"')
  })

  it('handles empty content', () => {
    expect(sanitizePreviewHtml('svg', '')).toBe('')
  })
})

describe('sanitization does not affect the output', () => {
  it('serialize still re-emits the original content byte for byte', () => {
    const html = '<div><svg viewBox="0 0 4 4"><path d="M0 0" onload="alert(1)"/></svg></div>'
    const out = serializeHtml(parseHtml(html))
    expect(out).toBe(html)
    expect(out).toContain('onload="alert(1)"')
  })
})
