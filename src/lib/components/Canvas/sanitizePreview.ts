const REMOVED_TAGS: ReadonlySet<string> = new Set([
  'script',
  'iframe',
  'object',
  'embed',
  'foreignobject',
])

const URL_ATTRIBUTES: ReadonlySet<string> = new Set(['href', 'xlink:href', 'src', 'action', 'formaction'])
const UNSAFE_URL = /^\s*(?:javascript|data:text\/html|vbscript)/i

export function sanitizePreviewHtml(tag: string, html: string): string {
  if (!html) return ''

  const holder = document.createElement('template')
  holder.innerHTML = `<${tag}>${html}</${tag}>`
  const root = holder.content.firstElementChild
  if (!root) return ''

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT)
  const doomed: Element[] = []

  let current = walker.nextNode() as Element | null
  while (current) {
    if (REMOVED_TAGS.has(current.nodeName.toLowerCase())) {
      doomed.push(current)
    } else {
      for (const attribute of Array.from(current.attributes)) {
        const name = attribute.name.toLowerCase()
        if (name.startsWith('on')) {
          current.removeAttribute(attribute.name)
        } else if (URL_ATTRIBUTES.has(name) && UNSAFE_URL.test(attribute.value)) {
          current.removeAttribute(attribute.name)
        }
      }
    }
    current = walker.nextNode() as Element | null
  }

  for (const element of doomed) element.remove()
  return root.innerHTML
}
