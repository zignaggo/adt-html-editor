import { useEffect, useRef, type ElementType, type KeyboardEvent } from 'react'
import type { NodeId } from '../../core/ids'
import { useEditor, useNode } from '../Editor/context'

export type InlineTextProps = {
  textId: NodeId
  nodeId: NodeId
  tag: string
  className: string | undefined
  setElement: (element: HTMLElement | null) => void
}

export function InlineText({ textId, nodeId, tag, className, setElement }: InlineTextProps) {
  const node = useNode(textId)
  const { setText, beginTextEdit } = useEditor()
  const localRef = useRef<HTMLElement | null>(null)
  const initialRef = useRef(node && 'value' in node ? node.value : '')

  const attachRef = (element: HTMLElement | null) => {
    localRef.current = element
    setElement(element)
  }

  useEffect(() => {
    const element = localRef.current
    if (!element) return
    element.textContent = initialRef.current
    element.focus()
    const selection = window.getSelection()
    if (!selection) return
    const range = document.createRange()
    range.selectNodeContents(element)
    range.collapse(false)
    selection.removeAllRanges()
    selection.addRange(range)
  }, [])

  const commit = () => {
    const element = localRef.current
    if (element) setText(textId, element.textContent ?? '')
    beginTextEdit(null)
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      beginTextEdit(null)
      return
    }
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      commit()
    }
  }

  if (!node || node.kind !== 'text') return null

  const Tag = tag as unknown as ElementType

  return (
    <Tag
      ref={attachRef}
      data-adt-id={nodeId}
      data-adt-editing=""
      className={className}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      onBlur={commit}
      onKeyDown={onKeyDown}
    />
  )
}
