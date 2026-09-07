import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/utils/set-custom-native-drag-preview'
import { pointerOutsideOfPreview } from '@atlaskit/pragmatic-drag-and-drop/utils/pointer-outside-of-preview'

export type PreviewContent = {
  label: string
  detail?: string
}

export function renderDragPreview(
  nativeSetDragImage: ((element: Element, x: number, y: number) => void) | null,
  content: PreviewContent,
) {
  setCustomNativeDragPreview({
    nativeSetDragImage,
    getOffset: pointerOutsideOfPreview({ x: '12px', y: '8px' }),
    render({ container }) {
      const chip = document.createElement('div')
      chip.className = 'adt-drag-preview'

      const tag = document.createElement('span')
      tag.className = 'adt-drag-preview__tag'
      tag.textContent = content.label
      chip.appendChild(tag)

      if (content.detail) {
        const detail = document.createElement('span')
        detail.className = 'adt-drag-preview__detail'
        detail.textContent = content.detail
        chip.appendChild(detail)
      }

      container.appendChild(chip)
      return () => chip.remove()
    },
  })
}
