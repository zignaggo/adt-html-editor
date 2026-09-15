import { useRef, type ElementType } from 'react'
import type { NodeId } from '../../core/ids'
import { VOID_TAGS } from '../../core/model'
import { useEditorSelector, useNode } from '../Editor/context'
import { useCanvasNodeDnd } from './useCanvasNodeDnd'
import { InlineText } from './InlineText'
import { OpaquePlaceholder } from './OpaquePlaceholder'
import { sanitizePreviewHtml } from './sanitizePreview'
import { useDomAttributes } from './useDomAttributes'

const INERT_OPAQUE: ReadonlySet<string> = new Set([
  'script',
  'style',
  'template',
  'noscript',
  'iframe',
])

export function CanvasNode({ id }: { id: NodeId }) {
  const node = useNode(id)
  const elementRef = useRef<HTMLElement | null>(null)
  const isEditing = useEditorSelector((state) => state.editingTextId === id)

  const setElement = (element: HTMLElement | null) => {
    elementRef.current = element
  }

  useCanvasNodeDnd(elementRef, id, node)
  useDomAttributes(elementRef, node && 'attrs' in node ? node.attrs : undefined)

  if (!node) return null
  if (node.kind === 'text') return <>{node.value}</>
  if (node.kind === 'comment') return null

  const Tag = node.tag as unknown as ElementType
  const className = node.classes.join(' ') || undefined

  if (node.kind === 'opaque') {
    if (INERT_OPAQUE.has(node.tag)) {
      return <OpaquePlaceholder setElement={setElement} id={id} tag={node.tag} />
    }
    return (
      <Tag
        ref={setElement}
        data-adt-id={id}
        className={className}
        dangerouslySetInnerHTML={{ __html: sanitizePreviewHtml(node.tag, node.rawInnerHtml) }}
      />
    )
  }

  if (VOID_TAGS.has(node.tag)) {
    return <Tag ref={setElement} data-adt-id={id} className={className} />
  }

  const onlyChild = node.children.length === 1 ? node.children[0] : null

  if (isEditing && onlyChild) {
    return (
      <InlineText
        textId={onlyChild}
        nodeId={id}
        tag={node.tag}
        className={className}
        setElement={setElement}
      />
    )
  }

  return (
    <Tag ref={setElement} data-adt-id={id} className={className}>
      {node.children.map((childId) => (
        <CanvasNode key={childId} id={childId} />
      ))}
    </Tag>
  )
}
