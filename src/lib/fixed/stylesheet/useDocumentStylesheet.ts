import { useEffect } from 'react'
import { useEditorSelector, useFixedLayout } from '../../components/Editor/context'
import { extractDocumentCss, rewriteUrls, scopeDocumentCss } from './documentCss'

const STYLE_ATTRIBUTE = 'data-adt-document-style'

export function useDocumentStylesheet() {
  const head = useEditorSelector((state) =>
    state.doc.envelope.kind === 'document' ? state.doc.envelope.head : '',
  )
  const { resolveAsset } = useFixedLayout()

  useEffect(() => {
    if (!head) return
    const style = document.createElement('style')
    style.setAttribute(STYLE_ATTRIBUTE, '')
    document.head.appendChild(style)

    const { inline, links } = extractDocumentCss(head)
    const prepare = (css: string) =>
      scopeDocumentCss(resolveAsset ? rewriteUrls(css, resolveAsset) : css)

    let text = inline.map(prepare).join('\n')
    style.textContent = text

    const controller = new AbortController()
    if (resolveAsset) {
      for (const href of links) {
        fetch(resolveAsset(href), { signal: controller.signal })
          .then((response) => (response.ok ? response.text() : ''))
          .then((css) => {
            if (!css || controller.signal.aborted) return
            text += `\n${prepare(css)}`
            style.textContent = text
          })
          .catch(() => {})
      }
    }

    return () => {
      controller.abort()
      style.remove()
    }
  }, [head, resolveAsset])
}
