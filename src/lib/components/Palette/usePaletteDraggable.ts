import { useEffect, useState } from 'react'
import { draggable } from '@atlaskit/pragmatic-drag-and-drop/adapter/element-adapter'
import { paletteDrag } from '../../dnd/data'
import { renderDragPreview } from '../../dnd/preview'
import type { PaletteEntry } from './templates'

export type PaletteDraggable = {
  setElement: (element: HTMLElement | null) => void
  isDragging: boolean
  title: string
}

export function usePaletteDraggable(entry: PaletteEntry): PaletteDraggable {
  const [isDragging, setIsDragging] = useState(false)
  const [element, setElement] = useState<HTMLElement | null>(null)

  useEffect(() => {
    if (!element) return
    return draggable({
      element,
      getInitialData: () => paletteDrag({ template: entry.template, label: entry.label }),
      onGenerateDragPreview({ nativeSetDragImage }) {
        renderDragPreview(nativeSetDragImage, {
          label: entry.template.tag,
          detail: entry.template.classes?.slice(0, 3).join(' '),
        })
      },
      onDragStart: () => setIsDragging(true),
      onDrop: () => setIsDragging(false),
    })
  }, [element, entry])

  return {
    setElement,
    isDragging,
    title: `Drag to insert <${entry.template.tag}>`,
  }
}
